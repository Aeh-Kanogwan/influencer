# ant-influencer — File Distribution Hub

ระบบแจกจ่ายไฟล์ที่จัดการโดยผู้ดูแล พร้อมสิทธิ์การดาวน์โหลดรายบุคคล — พัฒนาด้วย **React + Vite** และ **ไม่ต้องใช้ฐานข้อมูล**

## ฟีเจอร์
- **Admin login** — จัดการทั้งระบบ
- **สร้าง Master** — ตั้งชื่อประเภท/หมวดไฟล์ แล้วอัปโหลดไฟล์เข้าไป
- **Gen ผู้ใช้ (U/P)** — ระบบสุ่ม username/password ให้อัตโนมัติ
- **จำกัดการ login** — เปิด/ปิดสิทธิ์เข้าใช้งานของแต่ละผู้ใช้ (สวิตช์ อนุญาต/ระงับ)
- **จำกัดสิทธิ์ดาวน์โหลด** — เลือกได้ว่าผู้ใช้แต่ละคนโหลดไฟล์ไหนได้บ้างจาก Master ที่มี
- **ผู้ใช้ login** ด้วย U/P ที่ได้รับ → เห็นและดาวน์โหลดเฉพาะไฟล์ที่ได้รับสิทธิ์

## เก็บข้อมูลไว้ที่ไหน — Google Sheets เป็นฐานข้อมูลส่วนกลาง
ข้อมูลทั้งหมดเก็บส่วนกลาง เพื่อให้ user login จากเครื่องไหนก็ได้:
- **Google Sheet** — แท็บ `Config` (admin creds), `Users`, `Masters`, `Files` (metadata)
- **Google Drive** — โฟลเดอร์ `ant-influencer-files` เก็บไฟล์จริง
- **Google Apps Script (Web App)** — เป็น API ให้ React เรียก (ฟรี ไม่ต้องมี server)

ดูวิธีตั้งค่าใน **[GOOGLE_SHEET_SETUP.md](GOOGLE_SHEET_SETUP.md)** — โค้ด backend อยู่ที่ `apps-script/Code.gs`

> เดิม prototype เก็บใน localStorage/IndexedDB (ต่อเครื่อง/เบราว์เซอร์) จึงแชร์ข้ามเครื่องไม่ได้
> จึงเปลี่ยนมาใช้ Google Sheets เพื่อให้ใช้งานจริงได้

## เริ่มใช้งาน
```bash
npm install
npm run dev      # เปิด http://localhost:5173
```
Build สำหรับ production:
```bash
npm run build
npm run preview
```

## บัญชีผู้ดูแลเริ่มต้น
- Username: `admin`
- Password: `admin123`

## ขั้นตอนทดสอบ
1. Login ด้วย admin → แท็บ "Master & ไฟล์" → สร้าง Master แล้วอัปโหลดไฟล์
2. ไปแท็บ "ผู้ใช้งาน & สิทธิ์" → กด "สร้าง & สุ่ม U/P" → กำหนดสิทธิ์ไฟล์ให้ผู้ใช้
3. ออกจากระบบ แล้ว login ด้วย U/P ของผู้ใช้ → ดาวน์โหลดไฟล์ที่ได้รับสิทธิ์
4. ทดสอบ "จำกัด login" โดยสลับสวิตช์เป็น "ระงับ" แล้วลอง login ผู้ใช้นั้นอีกครั้ง

> ข้อมูลทั้งหมดผูกกับเบราว์เซอร์ที่ใช้งาน (localStorage/IndexedDB) — ล้างข้อมูลเบราว์เซอร์จะรีเซ็ตระบบ
