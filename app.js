
/**
 * Dauntless Scheduler v2.7.4 - Main Application
 * 已集成 CORS 代理支持
 */

// ============================================
// Utility Functions
// ============================================

const qs = s => document.querySelector(s);

const log = m => {
    qs('#console').textContent += (m + '\n');
};

/**
 * 統一的日期物件 → ISO 字串轉換工具（YYYY-MM-DD）。
 * 取代原先分散於 checkAvoidance / nextSundays / renderListHtml 的重複邏輯。
 */
const dateToISO = d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 取得今日 ISO 字串（本機時區） */
const getTodayISO = () => dateToISO(new Date());

// ============================================
// Global State
// ============================================

let cacheSchedule = null;
let cacheHoliday = null;

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    log('v' + CONFIG.VERSION + ' boot…');
    // 從 CONFIG.VERSION 動態更新所有版本號顯示元素（#11）
    document.querySelectorAll('[data-version-display]')
        .forEach(el => { el.textContent = 'v' + CONFIG.VERSION; });
    renderTimeSlots();
    bindForm();
    preloadData();
});

// ============================================
// UI Rendering
// ============================================

function renderTimeSlots() {
    const w = qs('#slotWrap');
    const hours = Array.from({ length: 10 }, (_, i) => i + 8);

    w.innerHTML = hours.map(h => {
        const label = String(h).padStart(2, '0') + ':00';
        return `<label class="slot">
            <input type="checkbox" value="${label}" class="slot-box"/>
            <span>${label}</span>
        </label>`;
    }).join('');
}

/**
 * 產生賽程表格 HTML 字串（#4 合併 renderList 與 renderListHtml）。
 * @param {Array}   rows         - CSV 解析後的二維陣列（rows[0] 為標頭）
 * @param {boolean} filterFuture - true：僅顯示今日(含)之後的賽程
 * @returns {string} HTML 字串
 */
function renderListHtml(rows, filterFuture = true) {
    if (!rows || rows.length === 0) return '<p>沒有資料</p>';

    const head = rows[0].map(x => x.trim().toLowerCase());
    let iDate = findDateIndex(head);
    const idx = {
        date: iDate >= 0 ? iDate : head.indexOf('date'),
        time: head.indexOf('time'),
        venue: (head.indexOf('venue') > -1 ? head.indexOf('venue') : head.indexOf('league')),
        notes: head.indexOf('notes')
    };

    let data = [];
    if (filterFuture && idx.date >= 0) {
        const todayISO = getTodayISO();
        for (let i = 1; i < rows.length; i++) {
            const iso = normalizeDate(rows[i][idx.date]);
            if (iso && iso >= todayISO) data.push(rows[i]);
        }
        // 依日期由近到遠排序
        data.sort((a, b) => {
            const da = normalizeDate(a[idx.date]) || '9999-12-31';
            const db = normalizeDate(b[idx.date]) || '9999-12-31';
            return da.localeCompare(db);
        });
    } else {
        for (let i = 1; i < rows.length; i++) data.push(rows[i]);
    }

    const html = [
        `<table>
            <thead>
                <tr>
                    <th>日期</th>
                    <th>時間</th>
                    <th>場地</th>
                    <th>備註</th>
                </tr>
            </thead>
            <tbody>`
    ];

    for (const r of data) {
        html.push(`<tr>
            <td>${idx.date >= 0 ? (r[idx.date] || '') : ''}</td>
            <td>${r[idx.time] || ''}</td>
            <td>${r[idx.venue] || ''}</td>
            <td>${r[idx.notes] || ''}</td>
        </tr>`);
    }

    html.push('</tbody></table>');
    return html.join('');
}

/** 直接寫入 #listWrap（向下相容原 renderList 呼叫用途） */
function renderList(rows) {
    qs('#listWrap').innerHTML = renderListHtml(rows, false);
}

// Modal 控制
let __modalEscHandler = null;

function openModal(title, contentHtml) {
    const overlay = qs('#modalOverlay');
    const body = qs('#modalBody');
    const titleEl = qs('#modalTitle');
    const btnClose = qs('#modalClose');
    if (!overlay || !body || !titleEl || !btnClose) {
        // 後備方案：若 DOM 不存在，直接輸出到 listWrap
        qs('#listWrap').innerHTML = contentHtml;
        return;
    }

    titleEl.textContent = title || '';
    body.innerHTML = contentHtml || '';
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');

    btnClose.addEventListener('click', () => closeModal(), { once: true });

    // #6 改用事件委派：在 overlay 層統一監聽點擊，判斷是否點到背景
    // 避免每次 openModal 對 backdrop DOM 節點疊加 listener。
    overlay.addEventListener('click', _onOverlayClick, { once: true });

    // Esc 關閉
    __modalEscHandler = e => {
        if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', __modalEscHandler);
}

function _onOverlayClick(e) {
    // 只有點到 overlay 本身或 backdrop 才關閉，點到 modal 內容不關閉
    if (e.target === qs('#modalOverlay') || e.target.classList.contains('modal__backdrop')) {
        closeModal();
    }
}

function closeModal() {
    const overlay = qs('#modalOverlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    // 移除委派的 overlay click listener（若尚未觸發）
    overlay.removeEventListener('click', _onOverlayClick);
    // 清理內容，避免殘留事件
    const body = qs('#modalBody');
    if (body) body.innerHTML = '';
    if (__modalEscHandler) {
        window.removeEventListener('keydown', __modalEscHandler);
        __modalEscHandler = null;
    }
}

function showAvoidHint(tags) {
    const b = qs('#avoidHint');
    if (!tags || !tags.length) {
        b.innerHTML = '';
        return;
    }
    const texts = tags.map(mapTagToText);
    b.innerHTML = `<span class="bad">⚠ ${texts.join('、')}</span>`;
}

// ============================================
// Event Handlers
// ============================================

function bindForm() {
    qs('#f_date').addEventListener('change', async e => {
        const v = e.target.value;
        const d = new Date(v);

        if (isNaN(d)) return;

        // 檢查是否為星期日
        if (d.getUTCDay() !== 0 && d.getDay() !== 0) {
            showAvoidHint(['NOT_SUNDAY']);
            alert('僅可選擇星期日。');
            e.target.value = '';
            return;
        }

        const notes = await checkAvoidance(v);
        showAvoidHint(notes);
    });

    qs('#btnReload').addEventListener('click', () => location.reload());
    const btnHistory = qs('#btnHistory');
    if (btnHistory) btnHistory.addEventListener('click', openHistorySheet);
    qs('#btnList').addEventListener('click', onShowList);
    qs('#btnAvoidList').addEventListener('click', onShowAvoidList);
    qs('#btnValidate').addEventListener('click', autoValidate);
    qs('#dlgForm').addEventListener('submit', onSubmit);
}

function collectSelectedSlots() {
    return [...document.querySelectorAll('.slot-box:checked')].map(x => x.value);
}

async function onSubmit(ev) {
    ev.preventDefault();

    const date = qs('#f_date').value.trim();
    const venue = qs('#f_venue').value.trim();
    const notes = qs('#f_notes').value.trim();
    const slots = collectSelectedSlots();

    // 驗證
    if (!date) return alert('請選擇日期');
    if (!venue) return alert('請選擇場地');
    if (slots.length < 2 || slots.length > 4) return alert('時間需選擇 2–4 個整點');

    if (!CONFIG.API_URL || CONFIG.API_URL.startsWith('<<<')) {
        return alert('請先在 config.js 設定 CONFIG.API_URL');
    }

    const payload = {
        action: 'addSchedule',
        token: CONFIG.API_TOKEN,   // #3 加入 Token 驗證
        date,
        venue,
        time: slots,
        notes
    };

    log('POST → API ' + CONFIG.API_URL);

    try {
        const res = await fetch(CONFIG.API_URL, {
            method: 'POST',
            redirect: 'follow', // Explicitly allow redirection
            // 不手動設置 Content-Type，避免瀏覽器觸發 CORS 預檢
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        let data;

        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { raw: text };
        }

        if (!res.ok || (data && data.ok === false) || (data && data.status === 'error')) {
            alert('寫入失敗：' + (data.message || res.status));
            log('✗ 寫入失敗 ' + text);
            return;
        }

        alert('已送出 ✓');
        log('✓ 寫入完成 ' + text);

    } catch (err) {
        alert('連線錯誤：' + err.message);
        log('✗ 錯誤 ' + err.message);
    }
}

async function onShowList() {
    const rows = await loadSchedule();
    const html = renderListHtml(rows, true);
    openModal('📋 已安排賽程', html);
}

// 直接開啟 Google 的表格檢視（使用已發布連結將 CSV 改為 HTML 頁面）
function openHistorySheet() {
    let url = CONFIG.SHEET_URL_SCHEDULE_CSV;
    if (!url || url.startsWith('<<<')) {
        alert('尚未設定賽程試算表連結（SHEET_URL_SCHEDULE_CSV）。');
        return;
    }
    // 嘗試將 output=csv 改為 output=html 以開啟 Google 發布的表格頁面
    const viewUrl = url.replace(/([?&])output=csv\b/, '$1output=html');
    try {
        window.open(viewUrl || url, '_blank', 'noopener');
    } catch (e) {
        location.href = viewUrl || url;
    }
}

async function onShowAvoidList() {
    // 查詢未來「二季」的週日（24 週）
    const dates = nextSundays(24);

    // #2 改用 Promise.all 並聯執行，大幅提升速度（原本 24 次 sequential await）
    const results = await Promise.all(dates.map(iso => checkAvoidance(iso)));

    const avoidRows = dates
        .map((iso, i) => results[i].length ? [iso, results[i].map(mapTagToText).join('、')] : null)
        .filter(Boolean);

    // 依日期由近到遠排序（ISO 字串可直接字典序排序）
    avoidRows.sort((a, b) => a[0].localeCompare(b[0]));

    if (avoidRows.length === 0) {
        openModal('需避開的週日（未來二季）', `<div class="hint">目前未偵測到需避開之週日（未來二季）。</div>`);
        log('✓ 需避開列表完成，共 0 筆');
        return;
    }

    const html = [
        `<table>
            <thead>
                <tr>
                    <th>日期（週日）</th>
                    <th>避開原因</th>
                </tr>
            </thead>
            <tbody>`
    ];

    for (const r of avoidRows) {
        html.push(`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`);
    }

    html.push('</tbody></table>');
    openModal('需避開的週日（未來二季）', html.join(''));
    log('✓ 需避開列表完成，共 ' + avoidRows.length + ' 筆');
}

// ============================================
// Data Loading (使用 CORS 代理)
// ============================================

async function preloadData() {
    try {
        cacheSchedule = await loadSchedule();
    } catch (e) {
        log('schedule 預載失敗: ' + e.message);
    }

    try {
        cacheHoliday = await loadHoliday();
    } catch (e) {
        log('holiday 預載失敗: ' + e.message);
    }
}

async function loadSchedule() {
    if (!CONFIG.SHEET_URL_SCHEDULE_CSV || CONFIG.SHEET_URL_SCHEDULE_CSV.startsWith('<<<')) {
        throw new Error('未設定 SHEET_URL_SCHEDULE_CSV');
    }

    // ✅ 使用 CORS 代理獲取 CSV
    const text = await CORSProxyHelper.fetchWithProxy(CONFIG.SHEET_URL_SCHEDULE_CSV);
    return parseCSV(text);
}

async function loadHoliday() {
    const set = new Set();
    const today = new Date();
    const currentYear = today.getFullYear();
    const nextYear = currentYear + 1;
    let jsonSuccess = false;

    // 1. 嘗試從 Auto-Updating JSON API 獲取 (今年 + 明年)
    if (CONFIG.JSON_HOLIDAY_API) {
        try {
            const urls = [
                `${CONFIG.JSON_HOLIDAY_API}${currentYear}.json`,
                `${CONFIG.JSON_HOLIDAY_API}${nextYear}.json`
            ];

            for (const url of urls) {
                const res = await fetch(url, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    for (const item of data) {
                        // API 格式: { "date": "20260101", "isHoliday": true }
                        if (item.isHoliday && item.date && item.date.length === 8) {
                            const iso = `${item.date.substring(0, 4)}-${item.date.substring(4, 6)}-${item.date.substring(6, 8)}`;
                            set.add(iso);
                        }
                    }
                    jsonSuccess = true;
                }
            }
        } catch (e) {
            console.warn('[Holiday] JSON API 取得失敗，退回 CSV…', e);
        }
    }

    // 2. Fallback: 如果 JSON 抓取失敗或是根本沒載到資料，退回使用舊版手動更新的 CSV
    if (!jsonSuccess) {
        if (!CONFIG.SHEET_URL_HOLIDAY_CSV || CONFIG.SHEET_URL_HOLIDAY_CSV.startsWith('<<<')) {
            throw new Error('未設定 SHEET_URL_HOLIDAY_CSV 且 JSON API 無法讀取');
        }

        // ✅ 使用 CORS 代理獲取 CSV
        const text = await CORSProxyHelper.fetchWithProxy(CONFIG.SHEET_URL_HOLIDAY_CSV);

        const rows = parseCSV(text);
        const head = rows[0].map(x => x.trim().toLowerCase());
        const iDate = findDateIndex(head);
        const isHolidayIdx = head.indexOf('is_holiday');

        if (iDate >= 0) {
            for (let i = 1; i < rows.length; i++) {
                const r = rows[i];
                if (!r || r.length <= iDate) continue;
                const iso = normalizeDate(r[iDate]);
                const isHol = isHolidayIdx >= 0 && r.length > isHolidayIdx ? r[isHolidayIdx].trim().toUpperCase() : 'TRUE';
                if (iso && isHol === 'TRUE') set.add(iso);
            }
        }
    }

    return set;
}

async function getScheduleRows() {
    if (cacheSchedule) return cacheSchedule;
    cacheSchedule = await loadSchedule();
    return cacheSchedule;
}

async function getHolidayList() {
    if (cacheHoliday) return cacheHoliday;
    cacheHoliday = await loadHoliday();
    return cacheHoliday;
}

// ============================================
// Business Logic
// ============================================

async function checkAvoidance(isoDate) {
    const d = new Date(isoDate);
    const today = new Date();
    const diff = (d - today) / (1e3 * 3600 * 24);
    const tags = [];

    // 查詢範圍上限同步為「未來二季」約 168 天
    if (diff < 0 || diff > 180) return tags;

    // 檢查是否為國定連假
    const holidays = await getHolidayList();
    const isoD = new Date(isoDate);
    const dMinus2 = new Date(isoD); dMinus2.setDate(isoD.getDate() - 2); // 週五
    const dMinus1 = new Date(isoD); dMinus1.setDate(isoD.getDate() - 1); // 週六
    const dPlus1 = new Date(isoD); dPlus1.setDate(isoD.getDate() + 1);  // 週一

    // #5 使用統一工具函式 dateToISO（取代 inline lambda `toIso`）
    const isSundayHoliday = holidays.has(isoDate);
    const isSaturdayHoliday = holidays.has(dateToISO(dMinus1));
    const isFridayHoliday = holidays.has(dateToISO(dMinus2));
    const isMondayHoliday = holidays.has(dateToISO(dPlus1));

    if (isSundayHoliday && isSaturdayHoliday && (isFridayHoliday || isMondayHoliday)) {
        tags.push('HOLIDAY');
    }

    // 檢查是否已排程
    const rows = await getScheduleRows();
    if (rows && rows.length > 1) {
        const head = rows[0].map(x => x.trim().toLowerCase());
        const iDate = findDateIndex(head);

        if (iDate >= 0) {
            for (let i = 1; i < rows.length; i++) {
                const rDate = normalizeDate(rows[i][iDate]);
                if (rDate === isoDate) {
                    tags.push('SCHEDULED');
                    break;
                }
            }
        }
    }

    return tags;
}

// 嘗試在不同語系的標頭中找到日期欄位
function findDateIndex(head) {
    const candidates = ['date', '日期', 'day', 'day_of_week', '日期(iso)', 'date_iso'];
    for (const name of candidates) {
        const idx = head.indexOf(name);
        if (idx >= 0) return idx;
    }
    // 有些表單可能使用 'event date' 之類的組合字
    for (let i = 0; i < head.length; i++) {
        const h = head[i];
        if (/^date[^a-z]*|[^a-z]*date$/.test(h) || h.includes('日期')) return i;
    }
    return -1;
}

function mapTagToText(tag) {
    switch (tag) {
        case 'NOT_SUNDAY': return '非週日，不可選';
        case 'HOLIDAY': return '國定連假（建議避開）';
        case 'SCHEDULED': return '該日期已安排賽程（任一聯盟）';
        default: return tag;
    }
}

// ============================================
// CSV Parsing
// ============================================

function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i], n = text[i + 1];

        if (c == '"') {
            if (inQuotes && n == '"') {
                field += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c == ',' && !inQuotes) {
            row.push(field);
            field = '';
        } else if ((c == '\n' || c == '\r') && !inQuotes) {
            if (field !== '' || row.length) {
                row.push(field);
                rows.push(row);
                row = [];
                field = '';
            }
        } else {
            field += c;
        }
    }

    if (field !== '' || row.length) {
        row.push(field);
        rows.push(row);
    }

    return rows;
}

// ============================================
// Date Utilities
// ============================================

function normalizeDate(s) {
    if (!s) return '';

    let v = ('' + s).trim();
    v = v.replace(/\//g, '-');

    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    const d = new Date(v);
    if (!isNaN(d)) return dateToISO(d); // #5 統一使用 dateToISO

    return '';
}

function nextSundays(weeks = 12) {
    const res = [];
    let d = new Date();
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    // 找到下一個星期日
    while (d.getDay() !== 0) {
        d.setDate(d.getDate() + 1);
    }

    // 生成接下來 N 週的星期日
    for (let i = 0; i < weeks; i++) {
        res.push(dateToISO(d)); // #5 統一使用 dateToISO
        d.setDate(d.getDate() + 7);
    }

    return res;
}

// ============================================
// Auto Validation
// ============================================

async function autoValidate() {
    const out = [];
    const ok = s => `<div class="ok">✅ ${s}</div>`;
    const bad = s => `<div class="bad">❌ ${s}</div>`;

    // 測試 Schedule CSV
    try {
        await loadSchedule();
        out.push(ok('SHEET_URL_SCHEDULE_CSV 讀取成功'));
    } catch (e) {
        out.push(bad('SHEET_URL_SCHEDULE_CSV 讀取失敗：' + e.message));
    }

    // 測試 Holiday
    try {
        await loadHoliday();
        out.push(ok('Holiday 國定假日 API / CSV 讀取成功 (自動切換)'));
    } catch (e) {
        out.push(bad('Holiday 讀取失敗（JSON、CSV 均失效）：' + e.message));
    }

    // 測試 API
    if (!CONFIG.API_URL || CONFIG.API_URL.startsWith('<<<')) {
        out.push(bad('API_URL 未設定'));
    } else {
        // Google Apps Script 天生不支援 OPTIONS 方法
        out.push(ok('API_URL 已設定 (自動略過 OPTIONS 檢查)'));

        // Token 設定檢查
        if (!CONFIG.API_TOKEN || CONFIG.API_TOKEN.startsWith('<<<')) {
            out.push(bad('API_TOKEN 未設定（請在 config.js 設定 API_TOKEN）'));
        } else {
            out.push(ok('API_TOKEN 已設定'));
        }

        // GET 測試
        try {
            const g = await fetch(CONFIG.API_URL + '?ping=1', { method: 'GET' });
            out.push(g.ok ? ok('API_URL GET 正常') : bad('API_URL GET 狀態碼 ' + g.status));
        } catch (e) {
            out.push(bad('API_URL GET 失敗：' + e.message));
        }

        // POST 測試
        try {
            const p = await fetch(CONFIG.API_URL, {
                method: 'POST',
                redirect: 'follow',
                body: JSON.stringify({ action: 'ping', token: CONFIG.API_TOKEN })
            });
            out.push(p.ok ? ok('API_URL POST 正常') : bad('API_URL POST 狀態碼 ' + p.status));
        } catch (e) {
            out.push(bad('API_URL POST 失敗：' + e.message));
        }
    }

    qs('#validateWrap').innerHTML = `<div class="validate">${out.join('')}</div>`;
}