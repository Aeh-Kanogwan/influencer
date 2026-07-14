import { test, expect } from '@playwright/test'
import { MOCK_URL, makeState, setupApp, loginAs } from './mockApi.js'

test('shows connect screen when no API URL, then connects', async ({ page }) => {
  const state = makeState()
  // install routes but DON'T preset the URL, so the connect screen shows
  await page.context().route(MOCK_URL, async (route) => {
    const body = JSON.parse(route.request().postData() || '{}')
    const { dispatch } = await import('./mockApi.js')
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: dispatch(state, body) }) })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'เชื่อมต่อฐานข้อมูล' })).toBeVisible()
  await page.getByPlaceholder(/script\.google\.com/).fill(MOCK_URL)
  await page.getByRole('button', { name: 'เชื่อมต่อ' }).click()
  await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeVisible()
})

test('admin can log in', async ({ page }) => {
  const state = makeState()
  await setupApp(page, state)
  await page.goto('/')
  await loginAs(page, 'admin', 'admin123')
  await expect(page.getByRole('heading', { name: 'แผงควบคุมผู้ดูแล' })).toBeVisible()
})

test('wrong credentials show an error', async ({ page }) => {
  const state = makeState()
  await setupApp(page, state)
  await page.goto('/')
  await loginAs(page, 'admin', 'wrongpass')
  await expect(page.getByText('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')).toBeVisible()
})

test('disabled user is blocked from logging in', async ({ page }) => {
  const state = makeState({ users: [{ id: 'usr_1', username: 'blocked', password: 'p1', note: '', enabled: false, allowedFileIds: [], createdAt: 1 }] })
  await setupApp(page, state)
  await page.goto('/')
  await loginAs(page, 'blocked', 'p1')
  await expect(page.getByText(/ถูกระงับ/)).toBeVisible()
})

test('enabled user logs in and reaches their download page', async ({ page }) => {
  const state = makeState({ users: [{ id: 'usr_1', username: 'user1', password: 'p1', note: '', enabled: true, allowedFileIds: [], createdAt: 1 }] })
  await setupApp(page, state)
  await page.goto('/')
  await loginAs(page, 'user1', 'p1')
  await expect(page.getByRole('heading', { name: 'ไฟล์สำหรับดาวน์โหลด' })).toBeVisible()
})
