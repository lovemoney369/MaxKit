import { _electron as electron } from '@playwright/test'

process.env.HAHAIMAGE_SMOKE = '1'
const packagedExecutable = process.argv[2]
const electronApp = await electron.launch(
  packagedExecutable
    ? { executablePath: packagedExecutable, args: ['--no-sandbox'] }
    : { args: ['.', '--no-sandbox'] },
)

try {
  const page = await electronApp.firstWindow()
  const rendererErrors = []
  page.on('pageerror', error => rendererErrors.push(error.message))
  await page.goto('hahaimage://app/index.html#/word-convert')
  await page.getByRole('heading', { name: 'Word 文档转换' }).waitFor({ timeout: 90_000 })
  await page.getByText(/转换引擎：LibreOffice 26\.2\.6/).waitFor({ timeout: 30_000 })
  const rtf = Buffer.from('{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Arial;}}\\f0\\fs28 Office conversion smoke test.\\par}', 'ascii')
  await page.locator('input[type=file]').setInputFiles({ name: 'office-smoke.rtf', mimeType: 'application/rtf', buffer: rtf })
  await page.getByLabel('目标格式').selectOption('pdf')
  await page.getByRole('button', { name: /批量转换为 PDF/ }).click()
  await page.locator('.result-item').waitFor({ timeout: 180_000 })
  const magic = await page.locator('.result-item').evaluate(async element => {
    const bytes = new Uint8Array(await (await fetch(element.dataset.resultUrl)).arrayBuffer())
    return String.fromCharCode(...bytes.slice(0, 5))
  })
  if (magic !== '%PDF-') throw new Error(`办公文档输出异常：${magic}`)
  await page.goto('hahaimage://app/index.html#/word-to-images')
  await page.getByRole('heading', { name: 'Word 转图片' }).waitFor()
  await page.locator('input[type=file]').setInputFiles({ name: 'word-image.rtf', mimeType: 'application/rtf', buffer: rtf })
  await page.getByRole('button', { name: /开始转换/ }).click()
  await page.locator('.result-item').waitFor({ timeout: 180_000 })
  const wordPng = await page.locator('.result-item').first().evaluate(async element => [...new Uint8Array(await (await fetch(element.dataset.resultUrl)).arrayBuffer()).slice(0, 8)])
  if (wordPng.join(',') !== '137,80,78,71,13,10,26,10') throw new Error(`Word 转图片异常：${wordPng}`)
  console.log('[desktop-office-smoke] Word -> PNG offline OK')

  await page.goto('hahaimage://app/index.html#/spreadsheet-to-images')
  await page.getByRole('heading', { name: 'Excel 转图片' }).waitFor()
  await page.locator('input[type=file]').setInputFiles({ name: 'sheet.csv', mimeType: 'text/csv', buffer: Buffer.from('name,value\nalpha,42\nbeta,73\n', 'utf8') })
  await page.getByRole('button', { name: /开始转换/ }).click()
  await page.locator('.result-item').waitFor({ timeout: 180_000 })
  const sheetPng = await page.locator('.result-item').first().evaluate(async element => [...new Uint8Array(await (await fetch(element.dataset.resultUrl)).arrayBuffer()).slice(0, 8)])
  if (sheetPng.join(',') !== '137,80,78,71,13,10,26,10') throw new Error(`Excel 转图片异常：${sheetPng}`)
  console.log('[desktop-office-smoke] Excel -> PNG offline OK')

  await page.goto('hahaimage://app/index.html#/markdown-convert')
  await page.getByRole('heading', { name: 'Markdown 转 HTML / PDF' }).waitFor()
  await page.locator('input[type=file]').setInputFiles({ name: 'notes.md', mimeType: 'text/markdown', buffer: Buffer.from('# Markdown PDF\n\n- local\n- private\n', 'utf8') })
  await page.getByLabel('目标格式').selectOption('pdf')
  await page.getByRole('button', { name: /转换为 PDF/ }).click()
  await page.locator('.result-item').waitFor({ timeout: 180_000 })
  const markdownPdf = await page.locator('.result-item').first().evaluate(async element => String.fromCharCode(...new Uint8Array(await (await fetch(element.dataset.resultUrl)).arrayBuffer()).slice(0, 5)))
  if (markdownPdf !== '%PDF-') throw new Error(`Markdown 转 PDF 异常：${markdownPdf}`)
  console.log('[desktop-office-smoke] Markdown -> PDF offline OK')
  if (rendererErrors.length) throw new Error(`渲染器错误：${rendererErrors.join('; ')}`)
  console.log('[desktop-office-smoke] RTF -> PDF offline OK')
} finally {
  await electronApp.close()
}
