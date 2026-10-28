import { _electron as electron } from '@playwright/test'

process.env.HAHAIMAGE_SMOKE = '1'
const executablePath = process.argv[2]
const electronApp = await electron.launch(executablePath
  ? { executablePath, args: ['--no-sandbox'] }
  : { args: ['.', '--no-sandbox'] })

try {
  const page = await electronApp.firstWindow()
  await page.waitForSelector('text=MaxKit', { timeout: 90_000 })
  const status = await page.evaluate(() => window.hahaimageOffice?.status())
  if (!status?.download?.size || status.download.version !== '25.8.7') {
    throw new Error(`办公组件状态异常：${JSON.stringify(status)}`)
  }
  if (!status.available) {
    await page.getByText('格式转换', { exact: true }).first().click()
    await page.getByText('Word 文档转换', { exact: true }).first().click()
    await page.getByRole('heading', { name: '启用办公文档功能' }).waitFor()
    await page.getByRole('button', { name: '下载并启用组件' }).waitFor()
  }
  console.log(`[office-download-smoke] OK: ${JSON.stringify(status)}`)
} finally {
  await electronApp.close()
}
