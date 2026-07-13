// Remote storage adapter — talks to the Google Apps Script Web App.
// The Web App URL is stored in localStorage so admins can connect without a rebuild.
const URL_KEY = 'antinfu_api_url'

export function getApiUrl() {
  return localStorage.getItem(URL_KEY) || import.meta.env.VITE_API_URL || ''
}
export function setApiUrl(url) {
  if (url) localStorage.setItem(URL_KEY, url.trim())
  else localStorage.removeItem(URL_KEY)
}
export function hasApiUrl() {
  return !!getApiUrl()
}

// Apps Script returns a 302 redirect to script.googleusercontent.com; fetch follows it.
// Use text/plain to avoid a CORS preflight (Apps Script doesn't answer OPTIONS).
export async function call(action, payload = {}) {
  const url = getApiUrl()
  if (!url) throw new Error('ยังไม่ได้เชื่อมต่อ Google Sheet (ไม่มี API URL)')
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow',
    })
  } catch (e) {
    throw new Error('เชื่อมต่อ API ไม่ได้ — ตรวจสอบ URL และการ Deploy (' + e.message + ')')
  }
  let data
  try {
    data = await res.json()
  } catch {
    throw new Error('รูปแบบผลลัพธ์จาก API ไม่ถูกต้อง — ตรวจว่า Deploy เป็น Web app และ Who has access = Anyone')
  }
  if (!data.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์')
  return data.data
}

// Read a File/Blob as a base64 string (no data: prefix).
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Turn a base64 payload from the API back into a Blob for download.
export function base64ToBlob(base64, type) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: type || 'application/octet-stream' })
}
