import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import MastersTab from '../components/MastersTab.jsx'
import UsersTab from '../components/UsersTab.jsx'

function DownloadLimitCard() {
  const { config, updateConfig, notify } = useApp()
  const [val, setVal] = useState(String(config.maxDownloadsPerFile ?? 3))
  useEffect(() => { setVal(String(config.maxDownloadsPerFile ?? 3)) }, [config.maxDownloadsPerFile])

  const save = async () => {
    const n = parseInt(val, 10)
    if (!(n >= 1)) { notify('กรุณาใส่จำนวนครั้งที่ถูกต้อง (อย่างน้อย 1)'); return }
    try { await updateConfig('maxDownloadsPerFile', String(n)); notify('บันทึกการตั้งค่าแล้ว') }
    catch (e) { notify('บันทึกไม่สำเร็จ: ' + e.message) }
  }

  return (
    <div className="card row-between" style={{ gap: 16 }}>
      <div className="stat">
        <span className="label-sm muted">จำกัดดาวน์โหลดต่อไฟล์ (ต่อผู้ใช้)</span>
        <span className="muted body-md">ผู้ใช้แต่ละคนโหลดไฟล์เดียวกันได้ไม่เกินกี่ครั้ง</span>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <input className="input" type="number" min="1" value={val} onChange={(e) => setVal(e.target.value)} style={{ width: 90 }} />
        <span className="muted">ครั้ง</span>
        <button className="btn btn-primary btn-sm" onClick={save}>บันทึก</button>
      </div>
    </div>
  )
}

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
        <div className="row header-actions">
          <button className={`btn ${tab === 'masters' ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setTab('masters')}>＋ สร้าง Master</button>
          <button className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('users')}>＋ สร้างผู้ใช้</button>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card stat"><span className="label-sm muted">Master ทั้งหมด</span><span className="stat-num">{masters.length}</span></div>
        <div className="card stat"><span className="label-sm muted">ไฟล์ทั้งหมด</span><span className="stat-num">{fileCount}</span></div>
        <div className="card stat"><span className="label-sm muted">ผู้ใช้งาน</span><span className="stat-num">{users.length}</span></div>
      </div>

      <DownloadLimitCard />

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
