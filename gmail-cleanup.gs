/**
 * Kirana Club "No change" mail cleanup (Google Apps Script, free)
 *
 * Mail tabhi Trash mein jaata hai jab TEENO sharten sach hon:
 *   1. Bhejne wala exact noreply@anaghmasale.com
 *   2. Mail exact "+kc-quiet@" address par aaya ho (sirf hamara system ye use karta hai)
 *   3. Subject "[Kirana Club] No change" se shuru ho
 * Sabse latest "No change" mail hamesha rehta hai.
 * Trash = delete nahi; Gmail Trash se 30 din tak wapas laaya ja sakta hai.
 * Har trash kiya mail dashboard ke "Mail cleanup log" mein dikhta hai (30 din).
 */
var WORKER_URL = "https://track.anaghmasale.com";
var INGEST_KEY = "YAHAN_APNA_INGEST_KEY_DAALIYE";   // wahi jo Cloudflare/GitHub mein daala tha

var SENDER = "noreply@anaghmasale.com";
var TAG = "+kc-quiet@";
var PREFIX = "[Kirana Club] No change";
var QUERY = 'from:' + SENDER + ' to:kc-quiet subject:"No change" in:inbox';

function isNoChangeMail(m) {
  var from = (m.getFrom() || "").toLowerCase();
  var to = (m.getTo() || "").toLowerCase();
  var subj = m.getSubject() || "";
  return from.indexOf("<" + SENDER + ">") !== -1 &&
         to.indexOf(TAG) !== -1 &&
         subj.indexOf(PREFIX) === 0;
}

function findNoChange() {
  var msgs = [];
  GmailApp.search(QUERY, 0, 300).forEach(function (t) {
    t.getMessages().forEach(function (m) {
      if (!m.isInTrash() && isNoChangeMail(m)) msgs.push(m);
    });
  });
  msgs.sort(function (a, b) { return b.getDate() - a.getDate(); });
  return msgs;
}

function cleanupNoChange() {
  var msgs = findNoChange();
  var items = [];
  msgs.slice(1).forEach(function (m) {          // latest wala rakho
    m.moveToTrash();
    items.push({ msgId: m.getId(), date: m.getDate().getTime(), subject: m.getSubject() });
  });
  // Dashboard par log bhejo (0 items par bhi, taaki "last cleanup" time dikhe)
  UrlFetchApp.fetch(WORKER_URL + "/api/cleanup-log", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + INGEST_KEY },
    payload: JSON.stringify({ items: items }),
    muteHttpExceptions: true,
  });
  Logger.log("No-change mails mile: " + msgs.length + ", trash mein gaye: " + items.length);
}

/** Pehle ye chalaiye: kuch delete nahi karta, sirf dikhata hai kaunse mails hatenge */
function dryRun() {
  var msgs = findNoChange();
  msgs.forEach(function (m, i) {
    Logger.log((i === 0 ? "RAKHEGA   " : "HATAYEGA  ") + m.getDate() + " | " + m.getSubject());
  });
  Logger.log("Total: " + msgs.length + " (inme se " + Math.max(0, msgs.length - 1) + " hatenge)");
  var r = UrlFetchApp.fetch(WORKER_URL + "/api/cleanup-log", {
    method: "post", contentType: "application/json",
    headers: { Authorization: "Bearer " + INGEST_KEY },
    payload: JSON.stringify({ items: [] }), muteHttpExceptions: true,
  });
  Logger.log("Dashboard connection: " + (r.getResponseCode() === 200 ? "OK" : "FAIL (" + r.getResponseCode() + ") - INGEST_KEY check kariye"));
}

/** dryRun sahi lage to ek baar ye chalaiye: har 30 min cleanup apne aap chalega */
function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("cleanupNoChange").timeBased().everyMinutes(30).create();
  cleanupNoChange();
}
