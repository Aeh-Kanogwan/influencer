import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

export default function Login() {
  const { login } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setError('')
    const res = login(username.trim(), password)
    if (!res.ok) setError(res.error)
  }

  return (
    <div className="login-wrap">
      <div className="login-card card stack-lg">
        <div className="brand" style={{ justifyContent: 'center' }}>
          <div className="brand-mark">aI</div>
          <div>
            <div className="brand-name">ant-infu</div>
            <div className="brand-sub">File Distribution Hub</div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 className="headline-md">เข้าสู่ระบบ</h1>
          <p className="muted body-md" style={{ marginTop: 8 }}>
            เข้าด้วยบัญชีผู้ดูแล หรือ user/password ที่ได้รับ
          </p>
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
          <button className="btn btn-primary btn-block" type="submit">เข้าสู่ระบบ</button>
        </form>

        <div className="card-flat" style={{ fontSize: 13 }}>
          <div className="label-sm muted" style={{ marginBottom: 8 }}>บัญชีผู้ดูแลเริ่มต้น</div>
          <div className="muted">Username: <b>admin</b> &nbsp;·&nbsp; Password: <b>admin123</b></div>
        </div>
      </div>
    </div>
  )
}
