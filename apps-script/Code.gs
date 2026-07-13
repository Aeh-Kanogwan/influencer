/**
 * ant-influencer — Google Sheets backend (Google Apps Script Web App)
 *
 * Data model (tabs in the bound spreadsheet):
 *   Config  : key | value            (adminUsername, adminPassword, driveFolderId)
 *   Users   : id | username | password | note | enabled | allowedFileIds | createdAt
 *   Masters : id | name | description | createdAt
 *   Files   : id | masterId | name | size | type | driveFileId | uploadedAt
 *
 * Files themselves live in a Google Drive folder; the sheet only stores metadata.
 *
 * SETUP (see GOOGLE_SHEET_SETUP.md):
 *   1) Run initSheets() once from the Apps Script editor (creates tabs + default admin).
 *   2) Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone.
 *   3) Copy the Web app URL into the ant-influencer login screen.
 */

var SHEETS = {
  Config: ['key', 'value'],
  Users: ['id', 'username', 'password', 'note', 'enabled', 'allowedFileIds', 'createdAt'],
  Masters: ['id', 'name', 'description', 'createdAt'],
  Files: ['id', 'masterId', 'name', 'size', 'type', 'driveFileId', 'uploadedAt'],
};

// ---------- one-time setup ----------
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(SHEETS[name]);
  });
  var cfg = readAll('Config');
  if (!cfg.length) {
    var folder = DriveApp.createFolder('ant-influencer-files');
    appendRow('Config', { key: 'adminUsername', value: 'admin' });
    appendRow('Config', { key: 'adminPassword', value: 'admin123' });
    appendRow('Config', { key: 'driveFolderId', value: folder.getId() });
  }
  // remove default empty sheet if present
  var def = ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0) ss.deleteSheet(def);
}

// ---------- HTTP entry points ----------
function doGet(e) { return handle(e); }
function doPost(e) { return handle(e); }

function handle(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
    else if (e && e.parameter && e.parameter.payload) body = JSON.parse(e.parameter.payload);
    var action = body.action || (e && e.parameter && e.parameter.action);
    var result = route(action, body);
    return json({ ok: true, data: result });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- router ----------
function route(action, b) {
  switch (action) {
    case 'ping': return { ok: true };
    case 'login': return login(b.username, b.password);
    case 'adminData': requireAdmin(b); return adminData();
    case 'userData': return userData(b.username, b.password);

    case 'createMaster': requireAdmin(b); return createMaster(b.name, b.description);
    case 'deleteMaster': requireAdmin(b); return deleteMaster(b.id);

    case 'addFile': requireAdmin(b); return addFile(b.masterId, b.name, b.type, b.size, b.dataBase64);
    case 'removeFile': requireAdmin(b); return removeFile(b.id);

    case 'createUser': requireAdmin(b); return createUser(b);
    case 'updateUser': requireAdmin(b); return updateUser(b.id, b.patch);
    case 'deleteUser': requireAdmin(b); return deleteUser(b.id);

    case 'download': return download(b.fileId, b.username, b.password);
    default: throw new Error('unknown action: ' + action);
  }
}

// ---------- auth ----------
function config() {
  var out = {};
  readAll('Config').forEach(function (r) { out[r.key] = r.value; });
  return out;
}
function requireAdmin(b) {
  var c = config();
  if (b.username !== c.adminUsername || String(b.password) !== String(c.adminPassword)) {
    throw new Error('unauthorized');
  }
}
function login(username, password) {
  var c = config();
  if (username === c.adminUsername && String(password) === String(c.adminPassword)) {
    return { role: 'admin', username: username };
  }
  var u = readAll('Users').filter(function (x) { return x.username === username && String(x.password) === String(password); })[0];
  if (!u) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  if (String(u.enabled) !== 'true') throw new Error('บัญชีนี้ถูกระงับการเข้าใช้งาน (limit login)');
  return { role: 'user', username: username };
}

// ---------- data reads ----------
function composeMasters(files) {
  var masters = readAll('Masters');
  return masters.map(function (m) {
    return {
      id: m.id, name: m.name, description: m.description, createdAt: Number(m.createdAt) || 0,
      files: files.filter(function (f) { return f.masterId === m.id; }).map(fileMeta),
    };
  }).sort(function (a, b) { return b.createdAt - a.createdAt; });
}
function fileMeta(f) {
  return { id: f.id, masterId: f.masterId, name: f.name, size: Number(f.size) || 0, type: f.type, uploadedAt: Number(f.uploadedAt) || 0 };
}
function adminData() {
  var files = readAll('Files');
  var users = readAll('Users').map(function (u) {
    return {
      id: u.id, username: u.username, password: u.password, note: u.note,
      enabled: String(u.enabled) === 'true',
      allowedFileIds: u.allowedFileIds ? String(u.allowedFileIds).split(',').filter(Boolean) : [],
      createdAt: Number(u.createdAt) || 0,
    };
  }).sort(function (a, b) { return b.createdAt - a.createdAt; });
  return { masters: composeMasters(files), users: users };
}
function userData(username, password) {
  var u = readAll('Users').filter(function (x) { return x.username === username && String(x.password) === String(password); })[0];
  if (!u) throw new Error('unauthorized');
  if (String(u.enabled) !== 'true') throw new Error('บัญชีถูกระงับ');
  var allowed = u.allowedFileIds ? String(u.allowedFileIds).split(',').filter(Boolean) : [];
  var files = readAll('Files').filter(function (f) { return allowed.indexOf(f.id) !== -1; });
  var masters = composeMasters(files).filter(function (m) { return m.files.length > 0; });
  return { masters: masters, username: username };
}

// ---------- masters ----------
function createMaster(name, description) {
  var m = { id: uid('mst'), name: String(name || '').trim(), description: String(description || '').trim(), createdAt: Date.now() };
  appendRow('Masters', m);
  return m;
}
function deleteMaster(id) {
  var files = readAll('Files').filter(function (f) { return f.masterId === id; });
  files.forEach(function (f) { removeFile(f.id); });
  deleteRowBy('Masters', 'id', id);
  return { deleted: id };
}

// ---------- files (Drive) ----------
function addFile(masterId, name, type, size, dataBase64) {
  var c = config();
  var folder = DriveApp.getFolderById(c.driveFolderId);
  var bytes = Utilities.base64Decode(dataBase64);
  var blob = Utilities.newBlob(bytes, type || 'application/octet-stream', name);
  var driveFile = folder.createFile(blob);
  var rec = { id: uid('file'), masterId: masterId, name: name, size: size || bytes.length, type: type || '', driveFileId: driveFile.getId(), uploadedAt: Date.now() };
  appendRow('Files', rec);
  return fileMeta(rec);
}
function removeFile(id) {
  var f = readAll('Files').filter(function (x) { return x.id === id; })[0];
  if (f && f.driveFileId) { try { DriveApp.getFileById(f.driveFileId).setTrashed(true); } catch (e) {} }
  deleteRowBy('Files', 'id', id);
  // strip from user permissions
  var users = readAll('Users');
  users.forEach(function (u) {
    var ids = u.allowedFileIds ? String(u.allowedFileIds).split(',').filter(Boolean) : [];
    if (ids.indexOf(id) !== -1) {
      updateRowBy('Users', 'id', u.id, { allowedFileIds: ids.filter(function (x) { return x !== id; }).join(',') });
    }
  });
  return { deleted: id };
}
function download(fileId, username, password) {
  var f = readAll('Files').filter(function (x) { return x.id === fileId; })[0];
  if (!f) throw new Error('ไม่พบไฟล์');
  var c = config();
  var isAdmin = username === c.adminUsername && String(password) === String(c.adminPassword);
  if (!isAdmin) {
    var u = readAll('Users').filter(function (x) { return x.username === username && String(x.password) === String(password); })[0];
    if (!u || String(u.enabled) !== 'true') throw new Error('unauthorized');
    var allowed = u.allowedFileIds ? String(u.allowedFileIds).split(',').filter(Boolean) : [];
    if (allowed.indexOf(fileId) === -1) throw new Error('ไม่มีสิทธิ์ดาวน์โหลดไฟล์นี้');
  }
  var blob = DriveApp.getFileById(f.driveFileId).getBlob();
  return { name: f.name, type: f.type, dataBase64: Utilities.base64Encode(blob.getBytes()) };
}

// ---------- users ----------
function createUser(b) {
  var u = {
    id: uid('usr'), username: b.username, password: b.password, note: b.note || '',
    enabled: true, allowedFileIds: (b.allowedFileIds || []).join(','), createdAt: Date.now(),
  };
  appendRow('Users', u);
  return { id: u.id, username: u.username, password: u.password, note: u.note, enabled: true, allowedFileIds: b.allowedFileIds || [], createdAt: u.createdAt };
}
function updateUser(id, patch) {
  var p = {};
  if (patch.hasOwnProperty('enabled')) p.enabled = patch.enabled;
  if (patch.hasOwnProperty('note')) p.note = patch.note;
  if (patch.hasOwnProperty('username')) p.username = patch.username;
  if (patch.hasOwnProperty('password')) p.password = patch.password;
  if (patch.hasOwnProperty('allowedFileIds')) p.allowedFileIds = (patch.allowedFileIds || []).join(',');
  updateRowBy('Users', 'id', id, p);
  return { id: id };
}
function deleteUser(id) { deleteRowBy('Users', 'id', id); return { deleted: id }; }

// ---------- sheet helpers ----------
function sheet(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }
function readAll(name) {
  var sh = sheet(name);
  if (!sh) return [];
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}
function appendRow(name, obj) {
  var sh = sheet(name);
  var headers = SHEETS[name];
  sh.appendRow(headers.map(function (h) { return obj.hasOwnProperty(h) ? obj[h] : ''; }));
}
function findRowIndex(name, key, value) {
  var sh = sheet(name);
  var values = sh.getDataRange().getValues();
  var col = values[0].indexOf(key);
  for (var i = 1; i < values.length; i++) if (String(values[i][col]) === String(value)) return i + 1; // 1-based row
  return -1;
}
function deleteRowBy(name, key, value) {
  var idx = findRowIndex(name, key, value);
  if (idx > 0) sheet(name).deleteRow(idx);
}
function updateRowBy(name, key, value, patch) {
  var sh = sheet(name);
  var idx = findRowIndex(name, key, value);
  if (idx < 0) return;
  var headers = SHEETS[name];
  Object.keys(patch).forEach(function (k) {
    var col = headers.indexOf(k);
    if (col >= 0) sh.getRange(idx, col + 1).setValue(patch[k]);
  });
}
function uid(prefix) { return prefix + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12); }
