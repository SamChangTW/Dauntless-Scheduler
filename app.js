
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
    renderTimeSlots();
    bindForm();
    preloadData();
});

// ============================================
// UI Rendering
// ============================================

function renderTimeSlots() {
    const w = qs('#slotWrap');
    const hours = Array.from({length: 10}, (_, i) => i + 8);

    w.innerHTML = hours.map(h => {
        const label = String(h).padStart(2, '0') + ':00';
        return `<label class="slot">
            <input type="checkbox" value="${label}" class="slot-box"/>
            <span>${label}</span>
        </label>`;
    }).join('');
}

function renderList(rows) {
    const head = rows[0].map(x => x.trim().toLowerCase());
    const idx = {
        date: head.indexOf('date'),
        time: head.indexOf('time'),
        venue: (head.indexOf('venue') > -1 ? head.indexOf('venue') : head.indexOf('league')),
        notes: head.indexOf('notes')
    };

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

    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        html.push(`<tr>
            <td>${(r[idx.date] || '')}</td>
            <td>${(r[idx.time] || '')}</td>
            <td>${(r[idx.venue] || '')}</td>
            <td>${(r[idx.notes] || '')}</td>
        </tr>`);
    }

    html.push('</tbody></table>');
    qs('#listWrap').innerHTML = html.join('');
}

// 產生賽程列表的 HTML（給 Modal 使用）
function renderListHtml(rows) {
    if (!rows || rows.length === 0) return '<p>沒有資料</p>';

    const head = rows[0].map(x => x.trim().toLowerCase());
    // 更穩健：使用 findDateIndex 來取得日期欄位
    let iDate = findDateIndex(head);
    const idx = {
        date: iDate >= 0 ? iDate : head.indexOf('date'),
        time: head.indexOf('time'),
        venue: (head.indexOf('venue') > -1 ? head.indexOf('venue') : head.indexOf('league')),
        notes: head.indexOf('notes')
    };

    // 計算「今天」(以使用者本機時區) 的 YYYY-MM-DD 字串
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 過濾：僅顯示「今天(含)之後」的賽程
    const filtered = [];
    if (idx.date >= 0) {
        for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            const iso = normalizeDate(r[idx.date]);
            if (iso && iso >= todayISO) {
                filtered.push(r);
            }
        }
    } else {
        // 若找不到日期欄，保留原清單（不過濾），以避免整份清單消失
        for (let i = 1; i < rows.length; i++) filtered.push(rows[i]);
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

    for (const r of filtered) {
        html.push(`<tr>
            <td>${(idx.date >= 0 ? (r[idx.date] || '') : '')}</td>
            <td>${(r[idx.time] || '')}</td>
            <td>${(r[idx.venue] || '')}</td>
            <td>${(r[idx.notes] || '')}</td>
        </tr>`);
    }

    html.push('</tbody></table>');
    return html.join('');
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

    const close = () => closeModal();
    btnClose.addEventListener('click', close, {once: true});

    // 點擊背景關閉
    const backdrop = overlay.querySelector('.modal__backdrop');
    if (backdrop) {
        const onBackdrop = (e) => { closeModal(); };
        backdrop.addEventListener('click', onBackdrop, {once: true});
    }

    // Esc 關閉
    __modalEscHandler = (e) => {
        if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', __modalEscHandler);
}

function closeModal() {
    const overlay = qs('#modalOverlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
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
        date,
        venue,
        time: slots,
        notes
    };

    log('POST → API ' + CONFIG.API_URL);

    try {
        const res = await fetch(CONFIG.API_URL, {
            method: 'POST',
            // 不手動設置 Content-Type，避免瀏覽器觸發 CORS 預檢
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        let data;

        try {
            data = JSON.parse(text);
        } catch (e) {
            data = {raw: text};
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
    const html = renderListHtml(rows);
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
    // 查詢未來「二季」的週日，原本為 12 週（一季），改為 24 週（兩季）
    const dates = nextSundays(24);
    const avoidRows = [];

    for (const iso of dates) {
        const tags = await checkAvoidance(iso);
        if (tags.length) {
            avoidRows.push([iso, tags.map(mapTagToText).join('、')]);
        }
    }

    const w = qs('#listWrap');
    if (avoidRows.length === 0) {
        w.innerHTML = `<div class="hint">目前未偵測到需避開之週日（未來二季）。</div>`;
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
    w.innerHTML = html.join('');
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
    if (!CONFIG.SHEET_URL_HOLIDAY_CSV || CONFIG.SHEET_URL_HOLIDAY_CSV.startsWith('<<<')) {
        throw new Error('未設定 SHEET_URL_HOLIDAY_CSV');
    }

    // ✅ 使用 CORS 代理獲取 CSV
    const text = await CORSProxyHelper.fetchWithProxy(CONFIG.SHEET_URL_HOLIDAY_CSV);

    const rows = parseCSV(text);
    const head = rows[0].map(x => x.trim().toLowerCase());
    const iDate = findDateIndex(head);
    const set = new Set();

    if (iDate >= 0) {
        for (let i = 1; i < rows.length; i++) {
            const iso = normalizeDate(rows[i][iDate]);
            if (iso) set.add(iso);
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

    // 查詢需避開時已擴大為「未來二季」（24 週 ≈ 168 天），
    // 因此這裡的檢查上限同步擴大，避免 90 天上限造成第 13–24 週被忽略。
    if (diff < 0 || diff > 180) return tags;

    // 檢查是否為國定假日
    const holidays = await getHolidayList();
    if (holidays.has(isoDate)) {
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
        case 'NOT_SUNDAY':
            return '非週日，不可選';
        case 'HOLIDAY':
            return '國定連假（建議避開）';
        case 'SCHEDULED':
            return '該日期已安排賽程（任一聯盟）';
        default:
            return tag;
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
    if (!isNaN(d)) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    }

    return '';
}

function nextSundays(weeks = 12) {
    const res = [];
    const today = new Date();
    let d = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // 找到下一個星期日
    while (d.getDay() !== 0) {
        d.setDate(d.getDate() + 1);
    }

    // 生成接下來 N 週的星期日
    for (let i = 0; i < weeks; i++) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        res.push(`${y}-${m}-${dd}`);
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

    // 測試 Holiday CSV
    try {
        await loadHoliday();
        out.push(ok('SHEET_URL_HOLIDAY_CSV 讀取成功'));
    } catch (e) {
        out.push(bad('SHEET_URL_HOLIDAY_CSV 讀取失敗：' + e.message));
    }

    // 測試 API
    if (!CONFIG.API_URL || CONFIG.API_URL.startsWith('<<<')) {
        out.push(bad('API_URL 未設定'));
    } else {
        // OPTIONS 測試
        try {
            await fetch(CONFIG.API_URL, {method: 'OPTIONS'});
            out.push(ok('API_URL 支援 CORS/OPTIONS'));
        } catch (e) {
            out.push(bad('API_URL OPTIONS 檢查失敗（可能 CORS 未開）'));
        }

        // GET 測試
        try {
            const g = await fetch(CONFIG.API_URL + '?ping=1', {method: 'GET'});
            out.push(g.ok ? ok('API_URL GET 正常') : bad('API_URL GET 狀態碼 ' + g.status));
        } catch (e) {
            out.push(bad('API_URL GET 失敗：' + e.message));
        }

        // POST 測試
        try {
            const p = await fetch(CONFIG.API_URL, {
                method: 'POST',
                // 不手動設置 Content-Type，避免瀏覽器觸發 CORS 預檢
                body: JSON.stringify({action: 'ping'})
            });
            out.push(p.ok ? ok('API_URL POST 正常') : bad('API_URL POST 狀態碼 ' + p.status));
        } catch (e) {
            out.push(bad('API_URL POST 失敗：' + e.message));
        }
    }

    qs('#validateWrap').innerHTML = `<div class="validate">${out.join('')}</div>`;
}