import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { formatDate, fileExt } from '../lib/format.js'
import PermissionModal from './PermissionModal.jsx'

export default function UsersTab() {
  const { users, masters, createUser, updateUser, deleteUser, genCredentials, notify } = useApp()
  const [prefix, setPrefix] = useState('user')
  const [note, setNote] = useState('')
  const [lastCreated, setLastCreated] = useState(null)
  const [permTarget, setPermTarget] = useState(null)

  const handleGen = (e) => {
    e.preventDefault()
    const creds = genCredentials(prefix.trim() || 'user')
    const u = createUser({ ...creds, note, allowedMasterIds: [], allowedFileIds: [] })
    setLastCreated({ ...creds })
    setNote('')
    notify('สร้างผู้ใช้ใหม่พร้อม username/password แล้ว')
    setPermTarget(u) // open permission editor right away
  }

  const copyCreds = () => {
    if (!lastCreated) return
    navigator.clipboard?.writeText(`Username: ${lastCreated.username}\nPassword: ${lastCreated.password}`)
    notify('คัดลอก username/password แล้ว')
  }

  const allowedCount = (u) => (u.allowedFileIds || []).length

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      {/* Generate user */}
      <div className="card stack-md">
        <h3 className="headline-md">สร้างผู้ใช้ (Gen U/P)</h3>
        <p className="muted body-md">ระบบจะสุ่ม username และ password ให้อัตโนมัติ แล้วนำไปกำหนดสิทธิ์ไฟล์ได้ทันที</p>
        <form className="stack-md" onSubmit={handleGen}>
          <div className="field">
            <label>คำนำหน้า username</label>
            <input className="input" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="user" />
          </div>
          <div className="field">
            <label>บันทึกช่วยจำ (ไม่บังคับ)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ลูกค้า A, ฝ่ายบัญชี" />
          </div>
          <button className="btn btn-primary" type="submit">⚡ สร้าง & สุ่ม U/P</button>
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
        {users.length === 0 && <div className="empty">ยังไม่มีผู้ใช้ — สร้างด้านบน</div>}
        {users.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                      <span className="pill-toggle" onClick={() => updateUser(u.id, { enabled: !u.enabled })}>
                        <span className={`switch ${u.enabled ? 'on' : ''}`} />
                        <span className={u.enabled ? 'chip' : 'chip chip-off'}>{u.enabled ? 'อนุญาต' : 'ระงับ'}</span>
                      </span>
                    </td>
                    <td className="muted">{formatDate(u.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setPermTarget(u)}>กำหนดสิทธิ์</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`ลบผู้ใช้ ${u.username}?`)) deleteUser(u.id) }}>ลบ</button>
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
          onSave={(patch) => { updateUser(permTarget.id, patch); notify('บันทึกสิทธิ์เรียบร้อย'); setPermTarget(null) }}
          onClose={() => setPermTarget(null)}
        />
      )}
    </div>
  )
}
