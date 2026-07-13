# ตั้งค่า Google Sheet เป็นฐานข้อมูล (ant-influencer)

ทำครั้งเดียว ~10 นาที หลังจากนี้ข้อมูล user/master/ไฟล์ทั้งหมดจะอยู่ส่วนกลาง — user login จากเครื่องไหนก็ได้

## 1) สร้าง Google Sheet
1. ไปที่ https://sheets.google.com สร้างสเปรดชีตใหม่ ตั้งชื่ออะไรก็ได้ (เช่น `ant-influencer-db`)

## 2) วางโค้ด Apps Script
1. ในชีตนั้น เมนู **Extensions → Apps Script**
2. ลบโค้ดเดิมทั้งหมด แล้ววางเนื้อหาจากไฟล์ **`apps-script/Code.gs`** (ในโปรเจกต์นี้) ลงไป
3. กด **Save** (ไอคอนแผ่นดิสก์)

## 3) รัน initSheets ครั้งเดียว
1. ด้านบนของ Apps Script เลือกฟังก์ชัน **`initSheets`** จาก dropdown
2. กด **Run**
3. จะมีหน้าต่างขอสิทธิ์ → **Review permissions** → เลือกบัญชี Google ของคุณ → (ถ้าขึ้น "Google hasn't verified this app" ให้กด **Advanced → Go to ... (unsafe)**) → **Allow**
   > ปลอดภัย เพราะเป็นสคริปต์ของคุณเองที่เข้าถึงชีต/ไดรฟ์ของคุณเท่านั้น
4. กลับไปดูที่ชีต จะมีแท็บ **Config / Users / Masters / Files** ถูกสร้างขึ้น และมีโฟลเดอร์ `ant-influencer-files` ใน Google Drive

## 4) Deploy เป็น Web App
1. ใน Apps Script กด **Deploy → New deployment**
2. ไอคอนเฟือง ⚙️ → เลือก **Web app**
3. ตั้งค่า:
   - **Execute as:** `Me` (บัญชีคุณ)
   - **Who has access:** `Anyone`   ← สำคัญ ต้องเป็น Anyone ไม่งั้นเว็บเรียกไม่ได้
4. กด **Deploy** → คัดลอก **Web app URL** (ลงท้ายด้วย `/exec`)

## 5) เชื่อมต่อในแอป ant-influencer
1. เปิดเว็บ ant-influencer → หน้าแรกจะให้ **วาง Apps Script Web App URL** → กด **เชื่อมต่อ**
2. Login ด้วย admin เริ่มต้น: **`admin` / `admin123`**
3. เริ่มสร้าง Master, อัปโหลดไฟล์, สร้าง user ได้เลย — ข้อมูลถูกบันทึกลง Google Sheet ทันที

## เปลี่ยนรหัส admin
เปิดชีตแท็บ **Config** แก้ค่าแถว `adminPassword` (และ `adminUsername` ถ้าต้องการ) ได้โดยตรง

## ข้อควรรู้ / ข้อจำกัด
- **ความปลอดภัย:** รหัสผ่านเก็บเป็น plaintext ในชีต และ Web App URL คือความลับ (ใครมี URL + u/p ก็เข้าได้) — เหมาะกับงานภายใน/prototype ถ้าต้องการความปลอดภัยสูงควรทำ backend จริง + hashing
- **ขนาดไฟล์:** ไฟล์ถูกส่งผ่าน API แบบ base64 เหมาะกับไฟล์ไม่ใหญ่มาก (แนะนำ < ~15–20 MB/ไฟล์) ไฟล์ใหญ่ควรใช้ลิงก์ Drive แทน
- **แก้โค้ด Apps Script แล้ว** ต้อง **Deploy → Manage deployments → แก้ไข (ดินสอ) → Version: New version → Deploy** เพื่อให้ URL เดิมอัปเดต
- ถ้าเปลี่ยน URL ใหม่ ให้กด "ตั้งค่าการเชื่อมต่อ" ที่หน้า login เพื่อวาง URL ใหม่

## อัปเดตฟีเจอร์ใหม่ (migration)
เมื่อมีฟีเจอร์ที่เพิ่มแท็บ/ค่า config (เช่น **จำกัดดาวน์โหลดต่อไฟล์**):
1. วางโค้ด `Code.gs` ล่าสุดทับ → Save
2. รัน **`initSheets`** อีกครั้ง — ปลอดภัย ข้อมูลเดิมไม่หาย (จะเพิ่มแท็บ `Downloads` และค่า `maxDownloadsPerFile=3` ให้เอง)
3. **Deploy → Manage deployments → New version**
4. รีเฟรชเว็บ → ตั้งค่าจำนวนครั้งได้ในหน้า admin (การ์ด "จำกัดดาวน์โหลดต่อไฟล์")

## แก้ปัญหา (Troubleshooting)
- **ขึ้น `unauthorized` ตอนสร้าง user / อัปโหลดไฟล์:** โค้ด Apps Script ที่รันอยู่ยังเป็นเวอร์ชันเก่า
  1. วางโค้ด `Code.gs` ล่าสุด (ฟังก์ชัน `requireAdmin` ต้องเช็ค `b.au` ไม่ใช่ `b.username`) → Save
  2. **Deploy → Manage deployments → ดินสอ ✏️ → Version: New version → Deploy**
  3. *แค่กด Save ไม่พอ* Web App จะรันโค้ดเก่าจนกว่าจะสร้าง New version
- **`รูปแบบผลลัพธ์จาก API ไม่ถูกต้อง`:** ตอน Deploy ตั้ง "Who has access" ไม่ใช่ **Anyone** หรือ URL ผิด
- **`เชื่อมต่อ API ไม่ได้`:** URL ไม่ถูก/ยังไม่ได้ Deploy หรือเน็ตบล็อก script.google.com
