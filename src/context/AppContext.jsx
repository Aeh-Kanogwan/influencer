import { createContext, useContext, useState, useCallback } from 'react'
import * as db from '../lib/storage'
import { putFile, getFile, deleteFile } from '../lib/idb'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const [session, setSessionState] = useState(() => db.getSession())
  const [masters, setMastersState] = useState(() => db.getMasters())
  const [users, setUsersState] = useState(() => db.getUsers())
  const [toast, setToast] = useState(null)

  const notify = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }, [])

  // ---------- Auth ----------
  const login = useCallback((username, password) => {
    const admin = db.getAdmin()
    if (username === admin.username && password === admin.password) {
      const s = { role: 'admin', username }
      db.setSession(s); setSessionState(s)
      return { ok: true, role: 'admin' }
    }
    const list = db.getUsers()
    const u = list.find((x) => x.username === username && x.password === password)
    if (!u) return { ok: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }
    if (!u.enabled) return { ok: false, error: 'บัญชีนี้ถูกระงับการเข้าใช้งาน (limit login)' }
    const s = { role: 'user', username, userId: u.id }
    db.setSession(s); setSessionState(s)
    return { ok: true, role: 'user' }
  }, [])

  const logout = useCallback(() => {
    db.setSession(null); setSessionState(null)
  }, [])

  // ---------- Masters ----------
  const createMaster = useCallback((name, description) => {
    const list = db.getMasters()
    const m = { id: db.uid('mst'), name: name.trim(), description: (description || '').trim(), files: [], createdAt: Date.now() }
    const next = [m, ...list]
    db.setMasters(next); setMastersState(next)
    return m
  }, [])

  const updateMaster = useCallback((id, patch) => {
    const next = db.getMasters().map((m) => (m.id === id ? { ...m, ...patch } : m))
    db.setMasters(next); setMastersState(next)
  }, [])

  const deleteMaster = useCallback(async (id) => {
    const m = db.getMasters().find((x) => x.id === id)
    if (m) for (const f of m.files) await deleteFile(f.id)
    const next = db.getMasters().filter((x) => x.id !== id)
    db.setMasters(next); setMastersState(next)
    // remove references from users
    const nu = db.getUsers().map((u) => ({
      ...u,
      allowedMasterIds: (u.allowedMasterIds || []).filter((x) => x !== id),
      allowedFileIds: (u.allowedFileIds || []).filter((fid) => !m || !m.files.some((f) => f.id === fid)),
    }))
    db.setUsers(nu); setUsersState(nu)
  }, [])

  const addFilesToMaster = useCallback(async (masterId, fileList) => {
    const added = []
    for (const file of fileList) {
      const id = db.uid('file')
      await putFile(id, file) // store the raw File/Blob in IndexedDB
      added.push({ id, name: file.name, size: file.size, type: file.type || 'application/octet-stream', uploadedAt: Date.now() })
    }
    const next = db.getMasters().map((m) =>
      m.id === masterId ? { ...m, files: [...m.files, ...added] } : m
    )
    db.setMasters(next); setMastersState(next)
    return added
  }, [])

  const removeFile = useCallback(async (masterId, fileId) => {
    await deleteFile(fileId)
    const next = db.getMasters().map((m) =>
      m.id === masterId ? { ...m, files: m.files.filter((f) => f.id !== fileId) } : m
    )
    db.setMasters(next); setMastersState(next)
    const nu = db.getUsers().map((u) => ({ ...u, allowedFileIds: (u.allowedFileIds || []).filter((x) => x !== fileId) }))
    db.setUsers(nu); setUsersState(nu)
  }, [])

  const downloadFile = useCallback(async (fileMeta) => {
    const blob = await getFile(fileMeta.id)
    if (!blob) { notify('ไม่พบไฟล์ในที่จัดเก็บ'); return }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = fileMeta.name
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [notify])

  // ---------- Users ----------
  const createUser = useCallback((data) => {
    const list = db.getUsers()
    const u = {
      id: db.uid('usr'),
      username: data.username,
      password: data.password,
      note: data.note || '',
      enabled: true,
      allowedMasterIds: data.allowedMasterIds || [],
      allowedFileIds: data.allowedFileIds || [],
      createdAt: Date.now(),
    }
    const next = [u, ...list]
    db.setUsers(next); setUsersState(next)
    return u
  }, [])

  const updateUser = useCallback((id, patch) => {
    const next = db.getUsers().map((u) => (u.id === id ? { ...u, ...patch } : u))
    db.setUsers(next); setUsersState(next)
  }, [])

  const deleteUser = useCallback((id) => {
    const next = db.getUsers().filter((u) => u.id !== id)
    db.setUsers(next); setUsersState(next)
  }, [])

  const value = {
    session, masters, users, toast, notify,
    login, logout,
    createMaster, updateMaster, deleteMaster, addFilesToMaster, removeFile, downloadFile,
    createUser, updateUser, deleteUser,
    genCredentials: db.genCredentials,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
