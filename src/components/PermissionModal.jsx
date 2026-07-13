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
    const allowedMasterIds = masters.filter((m) => m.files.some((f) => fileIds.has(f.id))).map((m) => m.id)
    onSave({ allowedFileIds, allowedMasterIds })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div className="modal-head">
          <div style={{ minWidth: 0 }}>
            <h3 className="headline-md">กำหนดสิทธิ์ดาวน์โหลด</h3>
            <p className="muted label-md" style={{ marginTop: 2 }}>ผู้ใช้: <b>{user.username}</b></p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="ปิด">✕</button>
        </div>

        <div className="modal-scroll">
          <p className="muted label-md">เลือกไฟล์ที่อนุญาต — ติ๊กหัวข้อ Master เพื่อเลือกทั้งหมด</p>
          {masters.length === 0 && <div className="empty">ยังไม่มี Master/ไฟล์ให้กำหนดสิทธิ์</div>}
          {masters.map((m) => {
            const ids = m.files.map((f) => f.id)
            const allOn = ids.length > 0 && ids.every((id) => fileIds.has(id))
            const someOn = ids.some((id) => fileIds.has(id))
            return (
              <div key={m.id} className="card-flat perm-group">
                <label className="checkbox-row perm-master">
                  <input type="checkbox" checked={allOn} ref={(el) => el && (el.indeterminate = someOn && !allOn)}
                    onChange={() => toggleMaster(m)} disabled={ids.length === 0} />
                  <b>{m.name}</b>
                  <span className="chip chip-neutral">{m.files.length}</span>
                </label>
                {m.files.length === 0 && <div className="muted label-md" style={{ paddingLeft: 12 }}>ไม่มีไฟล์</div>}
                {m.files.map((f) => (
                  <label key={f.id} className="checkbox-row perm-file">
                    <input type="checkbox" checked={fileIds.has(f.id)} onChange={() => toggleFile(f.id)} />
                    <div className="file-icon file-icon-sm">{fileExt(f.name)}</div>
                    <span className="perm-name">{f.name}</span>
                    <span className="muted perm-size">{formatSize(f.size)}</span>
                  </label>
                ))}
              </div>
            )
          })}
        </div>

        <div className="modal-foot">
          <span className="muted label-md">เลือกแล้ว {fileIds.size} ไฟล์</span>
          <div className="row">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>ยกเลิก</button>
            <button className="btn btn-primary btn-sm" onClick={save}>บันทึกสิทธิ์</button>
          </div>
        </div>
      </div>
    </div>
  )
}
