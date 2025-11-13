
/**
 * Dauntless Scheduler API v2.8.0
 * Compatible with Dauntless_Scheduler_v2.8.0_Standalone_AutoValidate
 * Designed by Sam × C⁵
 */

/* ===== Configuration ===== */
const SHEET_ID = "1PrnfYCTPeLHeQONEniY6p-EgQEfRfYUax4GjfPHo6Qk";
const SHEET_NAME = "Schedule";
const API_VERSION = "2.8.0";

/* ===== Main Routing ===== */
function doGet(e) {
  if (e && e.parameter && e.parameter.ping) {
    return createJsonResponse({ ok: true, status: "alive", time: new Date(), version: API_VERSION });
  }
  return createJsonResponse({ ok: true, status: "ready", version: API_VERSION });
}

function doPost(e) {
  const body = e.postData ? e.postData.contents : "{}";
  let data = {};

  try {
    data = JSON.parse(body);
  } catch (err) {
    return createJsonResponse({ ok: false, error: "Invalid JSON" });
  }

  if (data.action === "addSchedule") {
    return handleAddSchedule(data);
  }

  return createJsonResponse({ ok: true, echo: data });
}

// 注意：Apps Script Web App 並不會調用 doOptions，
// 因此不需要（也無法）在這裡處理 CORS 預檢。

/* ===== Business Logic ===== */
function handleAddSchedule(data) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.getSheets()[0];
    const timeSlots = (data.time || []).join(" ");

    sheet.appendRow([
      data.date,
      timeSlots,
      data.venue,
      data.notes,
      new Date()
    ]);

    return createJsonResponse({ ok: true, saved: true, time: new Date() });
  } catch (err) {
    return createJsonResponse({ ok: false, error: err.message });
  }
}

/* ===== Helper Functions ===== */
function createJsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}