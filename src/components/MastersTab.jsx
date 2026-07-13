import { useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { formatSize, formatDate, fileExt } from '../lib/format.js'

export default function MastersTab() {
  const { masters, createMaster, deleteMaster, addFilesToMaster, removeFile, downloadFile, notify } = useApp()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(null)
  const fileInputs = useRef({})

  const handleCreate = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    createMaster(name, desc)
    setName(''); setDesc('')
    notify('สร้าง Master เรียบร้อย')
  }

  const handleUpload = async (masterId, files) => {
    if (!files || !files.length) return
    setBusy(masterId)
    try {
      await addFilesToMaster(masterId, Array.from(files))
      notify('อัปโหลดไฟล์เรียบร้อย')
    } catch (err) {
      notify('อัปโหลดไม่สำเร็จ: ' + err.message)
    } finally {
      setBusy(null)
      if (fileInputs.current[masterId]) fileInputs.current[masterId].value = ''
    }
  }

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      {/* Create master */}
      <div className="card stack-md">
        <h3 className="headline-md">สร้าง Master ใหม่</h3>
        <p className="muted body-md">Master คือประเภท/หมวดไฟล์ที่ตั้งชื่อไว้ เพื่อรวมไฟล์สำหรับแจกจ่าย</p>
        <form className="stack-md" onSubmit={handleCreate}>
          <div className="field">
            <label>ชื่อประเภทไฟล์ (Master)</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น แบบฟอร์มการเงิน, เทมเพลต HR" />
          </div>
          <div className="field">
            <label>คำอธิบาย (ไม่บังคับ)</label>
            <textarea className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="รายละเอียดของหมวดไฟล์นี้" />
          </div>
          <button className="btn btn-primary" type="submit">+ สร้าง Master</button>
        </form>
      </div>

      {/* List */}
      <div className="stack-md" style={{ gridColumn: '1 / -1' }}>
        <h3 className="headline-md">รายการ Master ({masters.length})</h3>
        {masters.length === 0 && <div className="empty">ยังไม่มี Master — สร้างรายการแรกด้านบน</div>}

        {masters.map((m) => (
          <div key={m.id} className="card stack-md">
            <div className="row-between">
              <div>
                <div className="row" style={{ gap: 10 }}>
                  <h4 className="headline-md">{m.name}</h4>
                  <span className="chip">{m.files.length} ไฟล์</span>
                </div>
                {m.description && <p className="muted body-md" style={{ marginTop: 4 }}>{m.description}</p>}
              </div>
              <div className="row">
                <input
                  ref={(el) => (fileInputs.current[m.id] = el)}
                  type="file" multiple style={{ display: 'none' }}
                  onChange={(e) => handleUpload(m.id, e.target.files)}
                />
                <button className="btn btn-secondary btn-sm" disabled={busy === m.id}
                  onClick={() => fileInputs.current[m.id]?.click()}>
                  {busy === m.id ? 'กำลังอัปโหลด…' : '⬆ อัปโหลดไฟล์'}
                </button>
                <button className="btn btn-danger btn-sm"
                  onClick={() => { if (confirm(`ลบ Master "${m.name}" และไฟล์ทั้งหมด?`)) deleteMaster(m.id) }}>
                  ลบ
                </button>
              </div>
            </div>

            {m.files.length === 0 ? (
              <div className="empty" style={{ padding: 24 }}>ยังไม่มีไฟล์ในหมวดนี้</div>
            ) : (
              <table className="table">
                <thead>
                  <tr><th>ชื่อไฟล์</th><th>ขนาด</th><th>อัปโหลดเมื่อ</th><th style={{ textAlign: 'right' }}>จัดการ</th></tr>
                </thead>
                <tbody>
                  {m.files.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <div className="row" style={{ gap: 10 }}>
                          <div className="file-icon">{fileExt(f.name)}</div>
                          <span>{f.name}</span>
                        </div>
                      </td>
                      <td className="muted">{formatSize(f.size)}</td>
                      <td className="muted">{formatDate(f.uploadedAt)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="row" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => downloadFile(f)}>ดาวน์โหลด</button>
                          <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('ลบไฟล์นี้?')) removeFile(m.id, f.id) }}>ลบ</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
