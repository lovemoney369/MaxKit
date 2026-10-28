import { _electron as electron } from '@playwright/test'
import { PDFDocument, StandardFonts } from 'pdf-lib'

process.env.HAHAIMAGE_SMOKE = '1'
const packagedExecutable = process.argv[2]
const electronApp = await electron.launch(
  packagedExecutable
    ? { executablePath: packagedExecutable, args: ['--no-sandbox'] }
    : { args: ['.', '--no-sandbox'] },
)

try {
  const source = await PDFDocument.create()
  const font = await source.embedFont(StandardFonts.Helvetica)
  const pageOne = source.addPage([320, 240])
  pageOne.drawText('PDF offline render test - page 1', { x: 24, y: 160, size: 18, font })
  const pageTwo = source.addPage([360, 260])
  pageTwo.drawText('PDF offline render test - page 2', { x: 24, y: 180, size: 18, font })
  const input = Buffer.from(await source.save())

  const page = await electronApp.firstWindow()
  const rendererErrors = []
  page.on('pageerror', error => rendererErrors.push(error.message))
  await page.waitForSelector('text=MaxKit', { timeout: 90_000 })
  await page.evaluate(() => { window.location.hash = '#/pdf-to-images' })
  await page.locator('.tool-head h1', { hasText: 'PDF 转图片' }).waitFor({ timeout: 30_000 })
  await page.locator('input[type=file]').first().setInputFiles({ name: 'offline-test.pdf', mimeType: 'application/pdf', buffer: input })
  await page.getByLabel('页码范围').fill('2')
  await page.getByLabel('清晰度').selectOption('1')
  await page.getByRole('button', { name: /转换 PDF/ }).click()
  await page.locator('.result-item').waitFor({ timeout: 60_000 })
  const magic = await page.locator('.result-item .thumb').evaluate(async image => {
    const bytes = new Uint8Array(await (await fetch(image.src)).arrayBuffer())
    return [...bytes.slice(0, 8)]
  })
  if (magic.join(',') !== '137,80,78,71,13,10,26,10') throw new Error(`PDF 转图片输出异常: ${magic}`)
  if (rendererErrors.length) throw new Error(`PDF 渲染器错误: ${rendererErrors.join('; ')}`)
  console.log('[desktop-pdf-smoke] PDF.js offline worker OK')
} finally {
  await electronApp.close()
}
