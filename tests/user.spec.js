import { test, expect } from '@playwright/test'
import { makeState, setupApp, loginAs } from './mockApi.js'

function seed(max = 2) {
  return makeState({
    maxDownloadsPerFile: max,
    masters: [{ id: 'mst_1', name: 'Finance', description: 'งบ', createdAt: 1 }],
    files: [
      { id: 'file_1', masterId: 'mst_1', name: 'budget.xlsx', size: 100, type: '', dataBase64: 'dGVzdA==', uploadedAt: 1 },
      { id: 'file_2', masterId: 'mst_1', name: 'secret.xlsx', size: 100, type: '', dataBase64: 'dGVzdA==', uploadedAt: 1 },
    ],
    users: [{ id: 'usr_1', username: 'user1', password: 'p1', note: '', enabled: true, allowedFileIds: ['file_1'], createdAt: 1 }],
  })
}

async function loginUser(page, state) {
  await setupApp(page, state)
  await page.goto('/')
  await loginAs(page, 'user1', 'p1')
  await expect(page.getByRole('heading', { name: 'ไฟล์สำหรับดาวน์โหลด' })).toBeVisible()
}

test('user sees only permitted files with remaining quota', async ({ page }) => {
  await loginUser(page, seed(2))
  await expect(page.getByText('budget.xlsx')).toBeVisible()
  await expect(page.getByText('secret.xlsx')).toHaveCount(0) // not permitted
  await expect(page.getByText('เหลือ 2/2')).toBeVisible()
})

test('opening a file in Google Drive decrements the quota', async ({ page }) => {
  await loginUser(page, seed(2))
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: /เปิดใน Google Drive/ }).click(),
  ])
  // openFileLink navigates the blank popup to the Drive URL after the API call resolves
  await popup.waitForURL(/drive\.google\.com/, { timeout: 10000 })
  await popup.close()
  await expect(page.getByText('เหลือ 1/2')).toBeVisible()
})

test('download quota is enforced (button disabled when exhausted)', async ({ page }) => {
  await loginUser(page, seed(1)) // only 1 allowed
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: /เปิดใน Google Drive/ }).click(),
  ])
  await popup.close()
  await expect(page.getByRole('button', { name: /ครบจำนวนแล้ว/ })).toBeDisabled()
})

test('user with no permissions sees empty state', async ({ page }) => {
  const state = makeState({ users: [{ id: 'usr_1', username: 'user1', password: 'p1', note: '', enabled: true, allowedFileIds: [], createdAt: 1 }] })
  await loginUser(page, state)
  await expect(page.getByText(/ยังไม่มีไฟล์ที่คุณได้รับสิทธิ์/)).toBeVisible()
})
