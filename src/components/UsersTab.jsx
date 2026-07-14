import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { formatDate, fileExt } from '../lib/format.js'
import PermissionModal from './PermissionModal.jsx'

export default function UsersTab() {
  const { users, masters, loading, createUser, updateUser, deleteUser, genCredentials, notify } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [note, setNote] = useState('')
  const [formErr, setFormErr] = useState('')
  const [lastCreated, setLastCreated] = useState(null)
  const [permTarget, setPermTarget] = useState(null)

  const [busy, setBusy] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    const uname = username.trim()
    if (!uname) { setFormErr('กรุณากรอกชื่อผู้ใช้'); return }
    if (!password) { setFormErr('กรุณากรอกรหัสผ่าน'); return }
    if (users.some((u) => u.username === uname)) { setFormErr('ชื่อผู้ใช้นี้ถูกใช้แล้ว กรุณาใช้ชื่ออื่น'); return }
    setFormErr(''); setBusy(true)
    try {
      const u = await createUser({ username: uname, password, note, allowedFileIds: [] })
      setLastCreated({ username: uname, password })
      setUsername(''); setPassword(''); setNote('')
      notify('สร้างผู้ใช้ใหม่แล้ว')
      setPermTarget(u) // open permission editor right away
    } catch (err) {
      setFormErr(err.message)
    } finally {
      setBusy(false)
    }
  }

  const safe = async (fn, okMsg) => {
    try { await fn(); if (okMsg) notify(okMsg) }
    catch (err) { notify('ผิดพลาด: ' + err.message) }
  }

  const copyCreds = () => {
    if (!lastCreated) return
    navigator.clipboard?.writeText(`Username: ${lastCreated.username}\nPassword: ${lastCreated.password}`)
    notify('คัดลอก username/password แล้ว')
  }

  const allowedCount = (u) => (u.allowedFileIds || []).length

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      {/* Create user */}
      <div className="card stack-md">
        <h3 className="headline-md">สร้างผู้ใช้</h3>
        <p className="muted body-md">ตั้งชื่อผู้ใช้และรหัสผ่านเองได้ (ชื่อผู้ใช้ห้ามซ้ำ) แล้วนำไปกำหนดสิทธิ์ไฟล์ได้ทันที</p>
        <form className="stack-md" onSubmit={handleCreate}>
          <div className="field">
            <label>ชื่อผู้ใช้ (Username) — ห้ามซ้ำ</label>
            <input className="input" value={username} onChange={(e) => { setUsername(e.target.value); setFormErr('') }} placeholder="เช่น somchai, customer-a" />
          </div>
          <div className="field">
            <label>รหัสผ่าน (Password)</label>
            <div className="row" style={{ gap: 8 }}>
              <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="ตั้งรหัสผ่าน" style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPassword(genCredentials().password)}>สุ่ม</button>
            </div>
          </div>
          <div className="field">
            <label>บันทึกช่วยจำ (ไม่บังคับ)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ลูกค้า A, ฝ่ายบัญชี" />
          </div>
          {formErr && <div className="error-text">{formErr}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'กำลังสร้าง…' : '+ สร้างผู้ใช้'}</button>
        </form>

        {lastCreated && (
          <div className="cred-box stack-sm">
            <div className="label-sm muted">ข้อมูลเข้าสู่ระบบล่าสุด (คัดลอกส่งให้ผู้ใช้)</div>
            <div>Username: <b>{lastCreated.username}</b></div>
            <div>Password: <b>{lastCreated.password}</b></div>
            <button className="btn btn-ghost btn-sm" onClick={copyCreds} style={{ marginTop: 6 }}>คัดลอก</button>
          </div>
        )}
      </div>

      {/* Users list */}
      <div className="stack-md" style={{ gridColumn: '1 / -1' }}>
        <h3 className="headline-md">ผู้ใช้งานทั้งหมด ({users.length})</h3>
        {users.length === 0 && (loading
          ? <div className="loading-block"><span className="spinner spinner-lg" />กำลังโหลดข้อมูล…</div>
          : <div className="empty">ยังไม่มีผู้ใช้ — สร้างด้านบน</div>)}
        {users.length > 0 && (
          <div className="card table-wrap" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Username</th><th>Password</th><th>บันทึก</th><th>สิทธิ์ไฟล์</th>
                  <th>สถานะ login</th><th>สร้างเมื่อ</th><th style={{ textAlign: 'right' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.username}</b></td>
                    <td style={{ fontFamily: 'monospace' }}>{u.password}</td>
                    <td className="muted">{u.note || '-'}</td>
                    <td>
                      {allowedCount(u) > 0
                        ? <span className="chip">{allowedCount(u)} ไฟล์</span>
                        : <span className="chip chip-neutral">ยังไม่กำหนด</span>}
                    </td>
                    <td>
                      <span className="pill-toggle" onClick={() => safe(() => updateUser(u.id, { enabled: !u.enabled }), u.enabled ? 'ระงับผู้ใช้แล้ว' : 'เปิดใช้งานผู้ใช้แล้ว')}>
                        <span className={`switch ${u.enabled ? 'on' : ''}`} />
                        <span className={u.enabled ? 'chip' : 'chip chip-off'}>{u.enabled ? 'อนุญาต' : 'ระงับ'}</span>
                      </span>
                    </td>
                    <td className="muted">{formatDate(u.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setPermTarget(u)}>กำหนดสิทธิ์</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`ลบผู้ใช้ ${u.username}?`)) safe(() => deleteUser(u.id), 'ลบผู้ใช้แล้ว') }}>ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {permTarget && (
        <PermissionModal
          user={users.find((x) => x.id === permTarget.id) || permTarget}
          masters={masters}
          onSave={(patch) => safe(async () => { await updateUser(permTarget.id, patch); setPermTarget(null) }, 'บันทึกสิทธิ์เรียบร้อย')}
          onClose={() => setPermTarget(null)}
        />
      )}
    </div>
  )
}
