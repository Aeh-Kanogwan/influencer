import { useState } from 'react'
import { fileExt, formatSize } from '../lib/format.js'

export default function PermissionModal({ user, masters, onSave, onClose }) {
  const [fileIds, setFileIds] = useState(new Set(user.allowedFileIds || []))

  const toggleFile = (id) => {
    const next = new Set(fileIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setFileIds(next)
  }

  const toggleMaster = (m) => {
    const ids = m.files.map((f) => f.id)
    const allOn = ids.length > 0 && ids.every((id) => fileIds.has(id))
    const next = new Set(fileIds)
    ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)))
    setFileIds(next)
  }

  const save = () => {
    const allowedFileIds = [...fileIds]
    // derive which masters have at least one allowed file
    const allowedMasterIds = masters.filter((m) => m.files.some((f) => fileIds.has(f.id))).map((m) => m.id)
    onSave({ allowedFileIds, allowedMasterIds })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal stack-md" onClick={(e) => e.stopPropagation()}>
        <div className="row-between">
          <div>
            <h3 className="headline-md">กำหนดสิทธิ์ดาวน์โหลด</h3>
            <p className="muted body-md" style={{ marginTop: 4 }}>ผู้ใช้: <b>{user.username}</b></p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>ปิด</button>
        </div>

        <p className="muted body-md">เลือกไฟล์ที่อนุญาตให้ผู้ใช้รายนี้ดาวน์โหลดได้ (ติ๊กที่หัวข้อ Master เพื่อเลือกทั้งหมด)</p>

        <div className="stack-md" style={{ maxHeight: '48vh', overflow: 'auto' }}>
          {masters.length === 0 && <div className="empty">ยังไม่มี Master/ไฟล์ให้กำหนดสิทธิ์</div>}
          {masters.map((m) => {
            const ids = m.files.map((f) => f.id)
            const allOn = ids.length > 0 && ids.every((id) => fileIds.has(id))
            const someOn = ids.some((id) => fileIds.has(id))
            return (
              <div key={m.id} className="card-flat stack-sm">
                <label className="checkbox-row" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={allOn} ref={(el) => el && (el.indeterminate = someOn && !allOn)}
                    onChange={() => toggleMaster(m)} disabled={ids.length === 0} />
                  <b>{m.name}</b>
                  <span className="chip chip-neutral">{m.files.length} ไฟล์</span>
                </label>
                <hr className="divider" />
                {m.files.length === 0 && <div className="muted body-md" style={{ padding: '4px 0' }}>ไม่มีไฟล์</div>}
                {m.files.map((f) => (
                  <label key={f.id} className="checkbox-row" style={{ cursor: 'pointer', paddingLeft: 24 }}>
                    <input type="checkbox" checked={fileIds.has(f.id)} onChange={() => toggleFile(f.id)} />
                    <div className="file-icon" style={{ width: 30, height: 30, fontSize: 10 }}>{fileExt(f.name)}</div>
                    <span>{f.name}</span>
                    <span className="muted" style={{ marginLeft: 'auto' }}>{formatSize(f.size)}</span>
                  </label>
                ))}
              </div>
            )
          })}
        </div>

        <div className="row-between">
          <span className="muted body-md">เลือกแล้ว {fileIds.size} ไฟล์</span>
          <div className="row">
            <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button className="btn btn-primary" onClick={save}>บันทึกสิทธิ์</button>
          </div>
        </div>
      </div>
    </div>
  )
}
