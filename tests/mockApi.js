// In-memory fake of the Google Apps Script backend (mirrors apps-script/Code.gs).
// Installed via Playwright request interception so E2E tests need no real Google.

export const MOCK_URL = 'https://mock.ant-influencer.test/exec'

export function makeState(seed = {}) {
  return {
    config: {
      adminUsername: 'admin',
      adminPassword: 'admin123',
      maxDownloadsPerFile: seed.maxDownloadsPerFile ?? 3,
    },
    masters: seed.masters ? JSON.parse(JSON.stringify(seed.masters)) : [],
    users: seed.users ? JSON.parse(JSON.stringify(seed.users)) : [],
    files: seed.files ? JSON.parse(JSON.stringify(seed.files)) : [],
    downloads: {}, // `${username}::${fileId}` -> count
    _n: 1,
  }
}

const uid = (s, p) => `${p}_${s._n++}`
const fileMeta = (f) => ({ id: f.id, masterId: f.masterId, name: f.name, size: f.size, type: f.type, uploadedAt: f.uploadedAt })

function compose(state) {
  return state.masters
    .map((m) => ({ id: m.id, name: m.name, description: m.description, createdAt: m.createdAt,
      files: state.files.filter((f) => f.masterId === m.id).map(fileMeta) }))
    .sort((a, b) => b.createdAt - a.createdAt)
}
function requireAdmin(state, b) {
  if (b.au !== state.config.adminUsername || String(b.ap) !== String(state.config.adminPassword)) {
    throw new Error('unauthorized')
  }
}
const dcount = (state, username) => {
  const out = {}
  Object.keys(state.downloads).forEach((k) => {
    const [u, fid] = k.split('::')
    if (u === username) out[fid] = state.downloads[k]
  })
  return out
}
function enforceDownload(state, fileId, username, password) {
  const f = state.files.find((x) => x.id === fileId)
  if (!f) throw new Error('ไม่พบไฟล์')
  const isAdmin = username === state.config.adminUsername && String(password) === String(state.config.adminPassword)
  if (!isAdmin) {
    const u = state.users.find((x) => x.username === username && String(x.password) === String(password))
    if (!u || !u.enabled) throw new Error('unauthorized')
    if (!(u.allowedFileIds || []).includes(fileId)) throw new Error('ไม่มีสิทธิ์ดาวน์โหลดไฟล์นี้')
    const max = Number(state.config.maxDownloadsPerFile) || 3
    const used = dcount(state, username)[fileId] || 0
    if (used >= max) throw new Error(`ดาวน์โหลดครบจำนวนที่กำหนดแล้ว (${max} ครั้ง/ไฟล์)`)
    state.downloads[`${username}::${fileId}`] = used + 1
  }
  return f
}

export function dispatch(state, b) {
  const c = state.config
  switch (b.action) {
    case 'ping':
      return { ok: true }
    case 'login': {
      if (b.username === c.adminUsername && String(b.password) === String(c.adminPassword)) return { role: 'admin', username: b.username }
      const u = state.users.find((x) => x.username === b.username && String(x.password) === String(b.password))
      if (!u) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      if (!u.enabled) throw new Error('บัญชีนี้ถูกระงับการเข้าใช้งาน (limit login)')
      return { role: 'user', username: b.username }
    }
    case 'adminData': {
      requireAdmin(state, b)
      const users = state.users
        .map((u) => ({ id: u.id, username: u.username, password: u.password, note: u.note, enabled: !!u.enabled, allowedFileIds: u.allowedFileIds || [], createdAt: u.createdAt }))
        .sort((a, b2) => b2.createdAt - a.createdAt)
      return { masters: compose(state), users, config: { maxDownloadsPerFile: Number(c.maxDownloadsPerFile) || 3 } }
    }
    case 'userData': {
      const u = state.users.find((x) => x.username === b.username && String(x.password) === String(b.password))
      if (!u) throw new Error('unauthorized')
      if (!u.enabled) throw new Error('บัญชีถูกระงับ')
      const max = Number(c.maxDownloadsPerFile) || 3
      const counts = dcount(state, b.username)
      const allowed = u.allowedFileIds || []
      const masters = compose(state)
        .map((m) => ({ ...m, files: m.files.filter((f) => allowed.includes(f.id)) }))
        .filter((m) => m.files.length > 0)
      masters.forEach((m) => m.files.forEach((f) => {
        f.downloaded = counts[f.id] || 0
        f.maxDownloads = max
        f.remaining = Math.max(0, max - (counts[f.id] || 0))
      }))
      return { masters, username: b.username, config: { maxDownloadsPerFile: max } }
    }
    case 'createMaster': {
      requireAdmin(state, b)
      const m = { id: uid(state, 'mst'), name: String(b.name || '').trim(), description: String(b.description || '').trim(), createdAt: Date.now() }
      state.masters.push(m)
      return m
    }
    case 'deleteMaster': {
      requireAdmin(state, b)
      state.files = state.files.filter((f) => f.masterId !== b.id)
      state.masters = state.masters.filter((m) => m.id !== b.id)
      return { deleted: b.id }
    }
    case 'addFile': {
      requireAdmin(state, b)
      const rec = { id: uid(state, 'file'), masterId: b.masterId, name: b.name, size: b.size || 0, type: b.type || '', dataBase64: b.dataBase64 || '', uploadedAt: Date.now() }
      state.files.push(rec)
      return fileMeta(rec)
    }
    case 'removeFile': {
      requireAdmin(state, b)
      state.files = state.files.filter((f) => f.id !== b.id)
      state.users.forEach((u) => { u.allowedFileIds = (u.allowedFileIds || []).filter((x) => x !== b.id) })
      return { deleted: b.id }
    }
    case 'createUser': {
      requireAdmin(state, b)
      const uname = String(b.username || '').trim()
      if (!uname) throw new Error('กรุณาระบุชื่อผู้ใช้')
      if (!b.password) throw new Error('กรุณาระบุรหัสผ่าน')
      if (uname === c.adminUsername || state.users.some((x) => x.username === uname)) throw new Error('ชื่อผู้ใช้นี้ถูกใช้แล้ว')
      const u = { id: uid(state, 'usr'), username: uname, password: b.password, note: b.note || '', enabled: true, allowedFileIds: b.allowedFileIds || [], createdAt: Date.now() }
      state.users.push(u)
      return { id: u.id, username: u.username, password: u.password, note: u.note, enabled: true, allowedFileIds: u.allowedFileIds, createdAt: u.createdAt }
    }
    case 'updateUser': {
      requireAdmin(state, b)
      const u = state.users.find((x) => x.id === b.id)
      if (u) Object.assign(u, b.patch || {})
      return { id: b.id }
    }
    case 'deleteUser': {
      requireAdmin(state, b)
      state.users = state.users.filter((u) => u.id !== b.id)
      return { deleted: b.id }
    }
    case 'setConfig': {
      requireAdmin(state, b)
      if (!['maxDownloadsPerFile', 'adminUsername', 'adminPassword'].includes(b.key)) throw new Error('ไม่อนุญาตให้แก้ค่านี้')
      state.config[b.key] = b.value
      return { key: b.key, value: b.value }
    }
    case 'download': {
      const f = enforceDownload(state, b.fileId, b.username, b.password)
      return { name: f.name, type: f.type, dataBase64: f.dataBase64 || 'dGVzdA==' }
    }
    case 'getFileLink': {
      const f = enforceDownload(state, b.fileId, b.username, b.password)
      return { name: f.name, url: `https://drive.google.com/file/d/${f.id}/view` }
    }
    default:
      throw new Error('unknown action: ' + b.action)
  }
}

// Install request interception + set the API URL in localStorage, then it's ready to goto('/').
export async function setupApp(page, state) {
  await page.context().route(MOCK_URL, async (route) => {
    let body = {}
    try { body = JSON.parse(route.request().postData() || '{}') } catch { /* ignore */ }
    let res
    try { res = { ok: true, data: dispatch(state, body) } }
    catch (e) { res = { ok: false, error: e.message } }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(res) })
  })
  // stub the Google Drive popup so it never hits the real network
  await page.context().route((url) => url.href.includes('drive.google.com'), (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>mock drive</body></html>' })
  )
  await page.addInitScript((mockUrl) => {
    localStorage.setItem('antinfu_api_url', mockUrl)
  }, MOCK_URL)
}

export async function loginAs(page, username, password) {
  await page.getByPlaceholder('เช่น admin หรือ user-xxxx').fill(username)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
}
