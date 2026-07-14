import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { call, getApiUrl, setApiUrl as persistApiUrl, hasApiUrl, fileToBase64, base64ToBlob } from '../lib/api'
import { genCredentials } from '../lib/storage'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const SESSION_KEY = 'antinfu_session'
const readSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null } }

export function AppProvider({ children }) {
  const [session, setSession] = useState(() => readSession())
  const [apiUrl, setApiUrlState] = useState(() => getApiUrl())
  const [masters, setMasters] = useState([])
  const [users, setUsers] = useState([])
  const [config, setConfig] = useState({ maxDownloadsPerFile: 3 })
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(null)   // message shown while an API request is in flight
  const [toast, setToast] = useState(null)

  const notify = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }, [])

  // run an API action while showing a global "busy" message (saving/uploading/…)
  const track = useCallback(async (msg, fn) => {
    setBusy(msg)
    try { return await fn() }
    finally { setBusy(null) }
  }, [])

  // actor creds (login/userData/download) — the person performing the action
  const auth = useCallback(() => ({ username: session?.username, password: session?.password }), [session])
  // admin creds for gated mutations — separate keys so they never collide with entity fields (e.g. a new user's username)
  const admin = useCallback(() => ({ au: session?.username, ap: session?.password }), [session])

  // ---------- data loading ----------
  const loadData = useCallback(async (sess) => {
    const s = sess || readSession()
    if (!s) return
    setLoading(true)
    try {
      if (s.role === 'admin') {
        // adminData is an admin-gated action — send creds under au/ap (not username/password)
        const d = await call('adminData', { au: s.username, ap: s.password })
        setMasters(d.masters || [])
        setUsers(d.users || [])
        if (d.config) setConfig(d.config)
      } else {
        const d = await call('userData', { username: s.username, password: s.password })
        setMasters(d.masters || [])
        setUsers([])
        if (d.config) setConfig(d.config)
      }
    } catch (e) {
      notify(e.message)
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    if (session && hasApiUrl()) loadData(session)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- connection ----------
  const connect = useCallback(async (url) => {
    persistApiUrl(url)
    setApiUrlState(url)
    await call('ping') // throws if unreachable
    return true
  }, [])

  // ---------- auth ----------
  const login = useCallback(async (username, password) => {
    try {
      const res = await call('login', { username, password })
      const s = { role: res.role, username, password }
      localStorage.setItem(SESSION_KEY, JSON.stringify(s))
      setSession(s)
      await loadData(s)
      return { ok: true, role: res.role }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }, [loadData])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null); setMasters([]); setUsers([])
  }, [])

  // ---------- masters ----------
  const createMaster = useCallback((name, description) => track('กำลังบันทึก Master…', async () => {
    await call('createMaster', { ...admin(), name, description })
    await loadData()
  }), [admin, loadData, track])

  const deleteMaster = useCallback((id) => track('กำลังลบ Master…', async () => {
    await call('deleteMaster', { ...admin(), id })
    await loadData()
  }), [admin, loadData, track])

  const addFilesToMaster = useCallback((masterId, fileList) => track('กำลังอัปโหลดไฟล์…', async () => {
    for (const file of fileList) {
      const dataBase64 = await fileToBase64(file)
      await call('addFile', { ...admin(), masterId, name: file.name, type: file.type || 'application/octet-stream', size: file.size, dataBase64 })
    }
    await loadData()
  }), [admin, loadData, track])

  const removeFile = useCallback((masterId, fileId) => track('กำลังลบไฟล์…', async () => {
    await call('removeFile', { ...admin(), id: fileId })
    await loadData()
  }), [admin, loadData, track])

  const downloadFile = useCallback((fileMeta) => track('กำลังเตรียมไฟล์ดาวน์โหลด…', async () => {
    try {
      const d = await call('download', { ...auth(), fileId: fileMeta.id })
      const blob = base64ToBlob(d.dataBase64, d.type)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = d.name
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      await loadData() // refresh remaining-download counts
    } catch (e) {
      notify(e.message)
    }
  }), [auth, loadData, notify, track])

  // open the file in Google Drive so the customer can save it to their own Drive / open with Google Sheets
  const openFileLink = useCallback((fileMeta) => track('กำลังเปิดไฟล์ใน Google Drive…', async () => {
    const win = window.open('', '_blank') // open synchronously (user gesture) to dodge popup blockers
    // show a placeholder so the new tab is never a mysterious blank/white page
    const writeMsg = (html) => {
      if (!win || win.closed) return
      try { win.document.open(); win.document.write(`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;padding:32px;color:#1a1c1c">${html}</body>`); win.document.close() } catch { /* cross-origin after nav */ }
    }
    writeMsg('กำลังเปิดไฟล์จาก Google Drive…')
    try {
      const d = await call('getFileLink', { ...auth(), fileId: fileMeta.id })
      if (!d || !d.url) throw new Error('ไม่ได้รับลิงก์ไฟล์จากเซิร์ฟเวอร์ (ตรวจว่า Apps Script deploy เวอร์ชันล่าสุดแล้ว)')
      if (win && !win.closed) win.location.href = d.url
      else window.open(d.url, '_blank')
      await loadData() // refresh remaining count
    } catch (e) {
      writeMsg(`<b style="color:#ba1a1a">เปิดไฟล์ไม่สำเร็จ</b><br><br>${e.message}<br><br><span style="color:#514442">ปิดแท็บนี้แล้วลองใหม่ได้</span>`)
      notify('เปิดไฟล์ไม่สำเร็จ: ' + e.message)
    }
  }), [auth, loadData, notify, track])

  // ---------- users ----------
  const createUser = useCallback((data) => track('กำลังสร้างผู้ใช้…', async () => {
    const res = await call('createUser', { ...admin(), username: data.username, password: data.password, note: data.note, allowedFileIds: data.allowedFileIds || [] })
    await loadData()
    return res
  }), [admin, loadData, track])

  const updateUser = useCallback((id, patch) => track('กำลังบันทึก…', async () => {
    await call('updateUser', { ...admin(), id, patch })
    await loadData()
  }), [admin, loadData, track])

  const deleteUser = useCallback((id) => track('กำลังลบผู้ใช้…', async () => {
    await call('deleteUser', { ...admin(), id })
    await loadData()
  }), [admin, loadData, track])

  // ---------- config ----------
  const updateConfig = useCallback((key, value) => track('กำลังบันทึกการตั้งค่า…', async () => {
    await call('setConfig', { ...admin(), key, value })
    await loadData()
  }), [admin, loadData, track])

  const value = {
    session, masters, users, config, toast, loading, busy, apiUrl, connected: !!apiUrl, notify,
    connect, login, logout, refresh: loadData,
    createMaster, deleteMaster, addFilesToMaster, removeFile, downloadFile, openFileLink,
    createUser, updateUser, deleteUser, updateConfig,
    genCredentials,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
