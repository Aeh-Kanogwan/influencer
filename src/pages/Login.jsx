import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

export default function Login() {
  const { login, connect, connected, apiUrl, notify } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [showConnect, setShowConnect] = useState(!connected)
  const [url, setUrl] = useState(apiUrl || '')
  const [connBusy, setConnBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const res = await login(username.trim(), password)
    setBusy(false)
    if (!res.ok) setError(res.error)
  }

  const doConnect = async (e) => {
    e.preventDefault()
    setConnBusy(true)
    try {
      await connect(url.trim())
      notify('เชื่อมต่อ Google Sheet สำเร็จ')
      setShowConnect(false)
    } catch (err) {
      setError('เชื่อมต่อไม่สำเร็จ: ' + err.message)
    } finally {
      setConnBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card card stack-lg">
        <div className="brand" style={{ justifyContent: 'center' }}>
          <div className="brand-mark">aI</div>
          <div>
            <div className="brand-name">ant-influencer</div>
            <div className="brand-sub">File Distribution Hub</div>
          </div>
        </div>

        {showConnect ? (
          <>
            <div style={{ textAlign: 'center' }}>
              <h1 className="headline-md">เชื่อมต่อฐานข้อมูล</h1>
              <p className="muted body-md" style={{ marginTop: 8 }}>วาง URL ของ Google Apps Script Web App</p>
            </div>
            <form className="stack-md" onSubmit={doConnect}>
              <div className="field">
                <label>Apps Script Web App URL</label>
                <input className="input" value={url} onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/....../exec" autoFocus />
              </div>
              {error && <div className="error-text">{error}</div>}
              <button className="btn btn-primary btn-block" type="submit" disabled={connBusy || !url.trim()}>
                {connBusy ? 'กำลังเชื่อมต่อ…' : 'เชื่อมต่อ'}
              </button>
            </form>
            <div className="card-flat" style={{ fontSize: 13 }}>
              <div className="label-sm muted" style={{ marginBottom: 8 }}>ยังไม่มี URL?</div>
              <div className="muted">ดูวิธีสร้างใน <b>GOOGLE_SHEET_SETUP.md</b> — สร้าง Google Sheet → วางโค้ด Apps Script → Deploy เป็น Web app</div>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center' }}>
              <h1 className="headline-md">เข้าสู่ระบบ</h1>
              <p className="muted body-md" style={{ marginTop: 8 }}>เข้าด้วยบัญชีผู้ดูแล หรือ user/password ที่ได้รับ</p>
            </div>
            <form className="stack-md" onSubmit={submit}>
              <div className="field">
                <label>ชื่อผู้ใช้ (Username)</label>
                <input className="input" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น admin หรือ user-xxxx" autoFocus />
              </div>
              <div className="field">
                <label>รหัสผ่าน (Password)</label>
                <input className="input" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              {error && <div className="error-text">{error}</div>}
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
              </button>
            </form>
            <div className="row-between" style={{ fontSize: 13 }}>
              <span className="muted">Admin เริ่มต้น: <b>admin</b> / <b>admin123</b></span>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setShowConnect(true); setError('') }}>ตั้งค่าการเชื่อมต่อ</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
