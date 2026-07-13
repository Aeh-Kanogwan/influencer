import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import MastersTab from '../components/MastersTab.jsx'
import UsersTab from '../components/UsersTab.jsx'

export default function AdminDashboard() {
  const { masters, users } = useApp()
  const [tab, setTab] = useState('masters')
  const fileCount = masters.reduce((n, m) => n + m.files.length, 0)

  return (
    <div className="stack-lg">
      <div className="row-between">
        <div>
          <h1 className="headline-lg">แผงควบคุมผู้ดูแล</h1>
          <p className="muted body-md" style={{ marginTop: 4 }}>สร้าง Master ประเภทไฟล์ อัปโหลดไฟล์ และจัดการสิทธิ์ผู้ใช้</p>
        </div>
        <div className="row">
          <button className={`btn ${tab === 'masters' ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setTab('masters')}>＋ สร้าง Master</button>
          <button className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('users')}>＋ สร้างผู้ใช้</button>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card stat"><span className="label-sm muted">Master ทั้งหมด</span><span className="stat-num">{masters.length}</span></div>
        <div className="card stat"><span className="label-sm muted">ไฟล์ทั้งหมด</span><span className="stat-num">{fileCount}</span></div>
        <div className="card stat"><span className="label-sm muted">ผู้ใช้งาน</span><span className="stat-num">{users.length}</span></div>
      </div>

      <div>
        <div className="segmented">
          <button className={`seg ${tab === 'masters' ? 'active' : ''}`} onClick={() => setTab('masters')}>📁 Master &amp; ไฟล์</button>
          <button className={`seg ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>👥 ผู้ใช้งาน &amp; สิทธิ์</button>
        </div>
        {tab === 'masters' ? <MastersTab /> : <UsersTab />}
      </div>
    </div>
  )
}
