const CONFIG = window.DS_CONFIG;
const querySelector = (selector) => document.querySelector(selector);
const logToConsole = (message) => {
querySelector('#console').textContent += `\n${message}`;
};

const padZero = (number) => String(number).padStart(2, '0');

const formatDateAsYMD = (date) =>
`${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;

const SUNDAYS_COUNT = 26;
const WEEKS_PER_HALF = 13;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_LEAGUE = "TSAA";
const DEFAULT_STATUS = "scheduled";

// CSV Column Indices
function getColumnIndices(header) {
const findIndex = (name) =>
header.findIndex(h => h.toLowerCase().trim() === name.toLowerCase());

return {
date: findIndex("date"),
league: findIndex("league"),
status: findIndex("status"),
note: findIndex("notes") >= 0 ? findIndex("notes") : findIndex("note")
};
}

function extractCellValue(parts, columnIndex) {
if (columnIndex >= 0 && parts[columnIndex] !== undefined) {
return parts[columnIndex].replace(/^"|"$/g, "");
}
return "";
}

function parseCSVRow(line, columnIndices) {
const parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
return {
date: extractCellValue(parts, columnIndices.date),
league: extractCellValue(parts, columnIndices.league),
status: extractCellValue(parts, columnIndices.status),
note: extractCellValue(parts, columnIndices.note)
};
}

function parseCSV(text) {
const lines = text.trim().split(/\r?\n/);
const headerLine = lines.shift();
const header = headerLine.split(",");
const columnIndices = getColumnIndices(header);

return lines.map(line => parseCSVRow(line, columnIndices));
}

async function fetchCSV(url) {
const response = await fetch(url, { cache: "no-store" });
if (!response.ok) {
throw new Error(`CSV ${response.status}`);
}
const text = await response.text();
return parseCSV(text);
}

function getStartOfWeek(date) {
const start = new Date(date);
const dayOffset = (start.getDay() + 6) % 7;
start.setDate(start.getDate() - dayOffset);
return start;
}

function calculateNextSunday(startDate, weeksAhead) {
const sunday = new Date(startDate);
sunday.setDate(startDate.getDate() + weeksAhead * 7);
return sunday;
}

function calcSundaysTwoQuarters() {
const today = new Date();
const weekStart = getStartOfWeek(today);
const sundays = [];

for (let i = 0; i < SUNDAYS_COUNT; i++) {
const sunday = calculateNextSunday(weekStart, i);
sundays.push(formatDateAsYMD(sunday));
}

return sundays;
}

function createSlotElement(date, isBooked, isHoliday) {
const element = document.createElement('div');
element.className = "slot";
element.textContent = date;

if (isBooked) {
element.style.borderColor = "#2d5f3c";
}
if (isHoliday) {
element.style.borderColor = "#5f2d2d";
}

return element;
}

function appendSlotsToContainer(container, dates, bookedSet, holidaySet) {
dates.forEach(date => {
const slotElement = createSlotElement(
date,
bookedSet.has(date),
holidaySet.has(date)
);
container.appendChild(slotElement);
});
}

function countDatesInRange(allDates, datesToCount, startIndex, endIndex) {
return datesToCount.filter(date => {
const index = allDates.indexOf(date);
return index >= startIndex && index < endIndex;
}).length;
}

function renderSlots(allDates, bookedDates, holidays) {
const firstQuarterBox = querySelector('#listThis');
const secondQuarterBox = querySelector('#listNext');
firstQuarterBox.innerHTML = "";
secondQuarterBox.innerHTML = "";

const halfwayPoint = Math.ceil(allDates.length / 2);
const bookedSet = new Set(bookedDates);
const holidaySet = new Set(holidays);

const firstQuarterDates = allDates.slice(0, halfwayPoint);
const secondQuarterDates = allDates.slice(halfwayPoint);

appendSlotsToContainer(firstQuarterBox, firstQuarterDates, bookedSet, holidaySet);
appendSlotsToContainer(secondQuarterBox, secondQuarterDates, bookedSet, holidaySet);

querySelector('#weeksThis').textContent = String(halfwayPoint);
querySelector('#countThis').textContent =
String(countDatesInRange(allDates, bookedDates, 0, halfwayPoint));
querySelector('#countNext').textContent =
String(countDatesInRange(allDates, bookedDates, halfwayPoint, allDates.length));
querySelector('#countAvoid').textContent = String(holidays.length);
}

function formatDateDisplay(dateString) {
const date = new Date(dateString);
const month = date.getMonth() + 1;
const day = date.getDate();
return `${month}/${day}（${dateString}）`;
}

function buildAvoidList(allDates, bookedDates, holidays) {
const bookedSet = new Set(bookedDates);
const holidaySet = new Set(holidays);
const avoidDates = allDates.filter(date =>
bookedSet.has(date) || holidaySet.has(date)
);

const avoidListElement = querySelector('#avoidList');
if (!avoidListElement) return;

avoidListElement.innerHTML = "";
avoidDates.forEach(date => {
const listItem = document.createElement('li');
listItem.textContent = formatDateDisplay(date);
avoidListElement.appendChild(listItem);
});
}

async function bootstrap() {
logToConsole("啟動中…");
try {
logToConsole("讀取賽程 CSV…");
const schedule = await fetchCSV(CONFIG.SHEET_URL_SCHEDULE_CSV);

logToConsole("讀取假期 CSV…");
const holiday = await fetchCSV(CONFIG.SHEET_URL_HOLIDAY_CSV);

const scheduledDates = schedule.map(row => row.date).filter(Boolean);
const holidays = holiday.map(row => row.date).filter(Boolean);
const sundays = calcSundaysTwoQuarters();

renderSlots(sundays, scheduledDates, holidays);
buildAvoidList(sundays, scheduledDates, holidays);

logToConsole("✓ 初始化完成");
} catch (error) {
logToConsole("初始化失敗：" + error.message);
}
}

function validateDateFormat(date) {
if (!DATE_PATTERN.test(date)) {
throw new Error("日期格式錯誤，請用 YYYY-MM-DD，例如 2025-11-16");
}
}

function validateApiConfiguration() {
if (!CONFIG.API_URL || CONFIG.API_URL.includes("REPLACE_WITH")) {
throw new Error("尚未設定 API_URL（Apps Script /exec）。請先在 js/config.js 內填入你的 Web App URL。");
}
}

function getFormData() {
return {
date: querySelector('#f_date').value.trim(),
league: querySelector('#f_league').value.trim() || DEFAULT_LEAGUE,
status: querySelector('#f_status').value.trim() || DEFAULT_STATUS,
note: querySelector('#f_note').value.trim()
};
}

async function submitToApi(data) {
const response = await fetch(CONFIG.API_URL, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(data)
});
return await response.json();
}

async function saveToCloud() {
try {
const formData = getFormData();
validateDateFormat(formData.date);
validateApiConfiguration();

const result = await submitToApi(formData);

if (result.status === "success") {
alert("✅ 已寫入雲端");
location.reload();
} else {
alert("⚠️ 失敗：" + (result.message || "Unknown"));
}
} catch (error) {
if (error.message.includes("格式錯誤") || error.message.includes("尚未設定")) {
alert(error.message);
} else {
alert("❌ 連線錯誤：" + error.message);
}
}
}

function initializeEventListeners() {
const dialog = querySelector('#dlgForm');

querySelector('#btnOpenForm').addEventListener("click", () =>
dialog.showModal()
);
querySelector('#btnClose').addEventListener("click", () =>
dialog.close()
);
querySelector('#btnSubmit').addEventListener("click", (event) => {
event.preventDefault();
saveToCloud();
});
querySelector('#btnAvoid').addEventListener("click", () =>
querySelector('#dlgAvoid').showModal()
);
querySelector('#btnCloseAvoid').addEventListener("click", () =>
querySelector('#dlgAvoid').close()
);
querySelector('#btnReload').addEventListener("click", () =>
location.reload()
);
}

window.addEventListener("DOMContentLoaded", () => {
bootstrap();
initializeEventListeners();
