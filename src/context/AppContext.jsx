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
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const notify = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }, [])

  const auth = useCallback(() => ({ username: session?.username, password: session?.password }), [session])

  // ---------- data loading ----------
  const loadData = useCallback(async (sess) => {
    const s = sess || readSession()
    if (!s) return
    setLoading(true)
    try {
      if (s.role === 'admin') {
        const d = await call('adminData', { username: s.username, password: s.password })
        setMasters(d.masters || [])
        setUsers(d.users || [])
      } else {
        const d = await call('userData', { username: s.username, password: s.password })
        setMasters(d.masters || [])
        setUsers([])
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
  const createMaster = useCallback(async (name, description) => {
    await call('createMaster', { ...auth(), name, description })
    await loadData()
  }, [auth, loadData])

  const deleteMaster = useCallback(async (id) => {
    await call('deleteMaster', { ...auth(), id })
    await loadData()
  }, [auth, loadData])

  const addFilesToMaster = useCallback(async (masterId, fileList) => {
    for (const file of fileList) {
      const dataBase64 = await fileToBase64(file)
      await call('addFile', { ...auth(), masterId, name: file.name, type: file.type || 'application/octet-stream', size: file.size, dataBase64 })
    }
    await loadData()
  }, [auth, loadData])

  const removeFile = useCallback(async (masterId, fileId) => {
    await call('removeFile', { ...auth(), id: fileId })
    await loadData()
  }, [auth, loadData])

  const downloadFile = useCallback(async (fileMeta) => {
    try {
      const d = await call('download', { ...auth(), fileId: fileMeta.id })
      const blob = base64ToBlob(d.dataBase64, d.type)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = d.name
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      notify(e.message)
    }
  }, [auth, notify])

  // ---------- users ----------
  const createUser = useCallback(async (data) => {
    const res = await call('createUser', { ...auth(), username: data.username, password: data.password, note: data.note, allowedFileIds: data.allowedFileIds || [] })
    await loadData()
    return res
  }, [auth, loadData])

  const updateUser = useCallback(async (id, patch) => {
    await call('updateUser', { ...auth(), id, patch })
    await loadData()
  }, [auth, loadData])

  const deleteUser = useCallback(async (id) => {
    await call('deleteUser', { ...auth(), id })
    await loadData()
  }, [auth, loadData])

  const value = {
    session, masters, users, toast, loading, apiUrl, connected: !!apiUrl, notify,
    connect, login, logout, refresh: loadData,
    createMaster, deleteMaster, addFilesToMaster, removeFile, downloadFile,
    createUser, updateUser, deleteUser,
    genCredentials,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
