import { useApp } from './context/AppContext.jsx'
import Login from './pages/Login.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import UserDashboard from './pages/UserDashboard.jsx'

function Topbar() {
  const { session, logout } = useApp()
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">aI</div>
        <div>
          <div className="brand-name">ant-infu</div>
          <div className="brand-sub">File Distribution Hub</div>
        </div>
      </div>
      <div className="topbar-user">
        <span className="role-chip">{session.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน'}</span>
        <span className="label-md muted">{session.username}</span>
        <button className="btn btn-ghost btn-sm" onClick={logout}>ออกจากระบบ</button>
      </div>
    </div>
  )
}

export default function App() {
  const { session, toast } = useApp()

  if (!session) return (
    <>
      <Login />
      {toast && <div className="toast">{toast}</div>}
    </>
  )

  return (
    <div className="app-shell">
      <Topbar />
      <div className="container">
        {session.role === 'admin' ? <AdminDashboard /> : <UserDashboard />}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
