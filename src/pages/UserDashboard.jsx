import { useApp } from '../context/AppContext.jsx'
import { formatSize, formatDate, fileExt } from '../lib/format.js'

export default function UserDashboard() {
  const { session, masters, downloadFile } = useApp()

  // The API already returns only the masters/files this user is allowed to download.
  const visible = masters
  const totalFiles = visible.reduce((n, m) => n + m.files.length, 0)

  return (
    <div className="stack-lg">
      <div>
        <h1 className="headline-lg">ไฟล์สำหรับดาวน์โหลด</h1>
        <p className="muted body-md" style={{ marginTop: 4 }}>
          สวัสดี <b>{session.username}</b> — คุณมีสิทธิ์ดาวน์โหลด {totalFiles} ไฟล์
        </p>
      </div>

      {totalFiles === 0 ? (
        <div className="empty">
          ยังไม่มีไฟล์ที่คุณได้รับสิทธิ์ให้ดาวน์โหลด<br />
          กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การเข้าถึง
        </div>
      ) : (
        <div className="stack-lg">
          {visible.map((m) => (
            <div key={m.id} className="stack-md">
              <div className="row" style={{ gap: 10 }}>
                <h3 className="headline-md">{m.name}</h3>
                <span className="chip">{m.files.length} ไฟล์</span>
              </div>
              {m.description && <p className="muted body-md">{m.description}</p>}
              <div className="grid grid-auto">
                {m.files.map((f) => (
                  <div key={f.id} className="card stack-md">
                    <div className="row" style={{ gap: 12 }}>
                      <div className="file-icon">{fileExt(f.name)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="label-md" style={{ wordBreak: 'break-word' }}>{f.name}</div>
                        <div className="muted label-md">{formatSize(f.size)}</div>
                      </div>
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>อัปโหลด: {formatDate(f.uploadedAt)}</div>
                    <button className="btn btn-primary btn-block" onClick={() => downloadFile(f)}>⬇ ดาวน์โหลด</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
