import { test, expect } from '@playwright/test'
import { makeState, setupApp, loginAs } from './mockApi.js'

const seedMasterFile = {
  masters: [{ id: 'mst_1', name: 'Finance', description: 'งบการเงิน', createdAt: 1 }],
  files: [{ id: 'file_1', masterId: 'mst_1', name: 'budget.xlsx', size: 2048, type: 'application/vnd.ms-excel', dataBase64: 'dGVzdA==', uploadedAt: 1 }],
}

async function loginAdmin(page, state) {
  await setupApp(page, state)
  await page.goto('/')
  await loginAs(page, 'admin', 'admin123')
  await expect(page.getByRole('heading', { name: 'แผงควบคุมผู้ดูแล' })).toBeVisible()
}

test('admin creates a master', async ({ page }) => {
  await loginAdmin(page, makeState())
  await page.getByPlaceholder('เช่น แบบฟอร์มการเงิน, เทมเพลต HR').fill('ฝ่ายบุคคล')
  await page.getByRole('button', { name: '+ สร้าง Master' }).click()
  await expect(page.getByText('รายการ Master (1)')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'ฝ่ายบุคคล' })).toBeVisible()
})

test('admin uploads a file into a master', async ({ page }) => {
  await loginAdmin(page, makeState({ masters: [{ id: 'mst_1', name: 'Finance', description: '', createdAt: 1 }] }))
  await page.locator('input[type="file"]').setInputFiles({
    name: 'report.xlsx', mimeType: 'application/vnd.ms-excel', buffer: Buffer.from('hello-data'),
  })
  await expect(page.getByText('report.xlsx')).toBeVisible()
})

test('admin creates a user with a custom username', async ({ page }) => {
  await loginAdmin(page, makeState())
  await page.getByRole('button', { name: /สร้างผู้ใช้/ }).first().click()
  await page.getByPlaceholder('เช่น somchai, customer-a').fill('somchai')
  await page.getByPlaceholder('ตั้งรหัสผ่าน').fill('secret1')
  await page.getByRole('button', { name: '+ สร้างผู้ใช้' }).click()
  // permission modal opens automatically; close it
  await expect(page.getByRole('heading', { name: 'กำหนดสิทธิ์ดาวน์โหลด' })).toBeVisible()
  await page.getByRole('button', { name: 'ยกเลิก' }).click()
  await expect(page.getByRole('cell', { name: 'somchai' })).toBeVisible()
})

test('duplicate username is rejected', async ({ page }) => {
  await loginAdmin(page, makeState({ users: [{ id: 'usr_1', username: 'somchai', password: 'x', note: '', enabled: true, allowedFileIds: [], createdAt: 1 }] }))
  await page.getByRole('button', { name: /สร้างผู้ใช้/ }).first().click()
  await page.getByPlaceholder('เช่น somchai, customer-a').fill('somchai')
  await page.getByPlaceholder('ตั้งรหัสผ่าน').fill('secret1')
  await page.getByRole('button', { name: '+ สร้างผู้ใช้' }).click()
  await expect(page.getByText(/ชื่อผู้ใช้นี้ถูกใช้แล้ว/)).toBeVisible()
})

test('admin toggles a user login on/off (limit login)', async ({ page }) => {
  await loginAdmin(page, makeState({ users: [{ id: 'usr_1', username: 'user1', password: 'p1', note: '', enabled: true, allowedFileIds: [], createdAt: 1 }] }))
  await page.getByRole('button', { name: /ผู้ใช้งาน & สิทธิ์/ }).click()
  await expect(page.getByText('อนุญาต')).toBeVisible()
  await page.locator('.pill-toggle').click()
  await expect(page.getByText('ระงับ', { exact: true })).toBeVisible()
})

test('admin grants file permission to a user', async ({ page }) => {
  const state = makeState({
    ...seedMasterFile,
    users: [{ id: 'usr_1', username: 'user1', password: 'p1', note: '', enabled: true, allowedFileIds: [], createdAt: 1 }],
  })
  await loginAdmin(page, state)
  await page.getByRole('button', { name: /ผู้ใช้งาน & สิทธิ์/ }).click()
  await page.getByRole('button', { name: 'กำหนดสิทธิ์' }).click()
  await expect(page.getByRole('heading', { name: 'กำหนดสิทธิ์ดาวน์โหลด' })).toBeVisible()
  await page.locator('.perm-master input[type="checkbox"]').check() // select all files in the master
  await page.getByRole('button', { name: 'บันทึกสิทธิ์' }).click()
  await expect(page.getByText('1 ไฟล์')).toBeVisible()
})

test('admin changes the download-limit config', async ({ page }) => {
  await loginAdmin(page, makeState())
  await page.locator('input[type="number"]').fill('5')
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await expect(page.getByText('บันทึกการตั้งค่าแล้ว')).toBeVisible()
})

test('admin can download a file directly', async ({ page }) => {
  await loginAdmin(page, makeState(seedMasterFile))
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'ดาวน์โหลด' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('budget.xlsx')
})
