import { expect, test } from '@playwright/test'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { makePng } from './helpers'

async function resultBytes(locator: import('@playwright/test').Locator) {
  return Buffer.from(await locator.evaluate(async element => [...new Uint8Array(await (await fetch((element as HTMLElement).dataset.resultUrl!)).arrayBuffer())]))
}

async function resultText(locator: import('@playwright/test').Locator) {
  return locator.evaluate(async element => (await fetch((element as HTMLElement).dataset.resultUrl!)).text())
}

test.describe('新增格式转换', () => {
  test('SVG 转 128px PNG', async ({ page }) => {
    await page.goto('/#/svg-convert')
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"><rect width="64" height="32" fill="#3366cc"/></svg>')
    await page.locator('input[type=file]').setInputFiles({ name: 'shape.svg', mimeType: 'image/svg+xml', buffer: svg })
    await page.getByLabel('输出宽度（像素）').fill('128')
    await page.getByRole('button', { name: /转换为 PNG/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(1)
    const size = await page.locator('.result-item .thumb').evaluate(async image => { await (image as HTMLImageElement).decode(); return [(image as HTMLImageElement).naturalWidth, (image as HTMLImageElement).naturalHeight] })
    expect(size).toEqual([128, 64])
  })

  test('PNG 转多尺寸 ICO 后再提取 PNG', async ({ page }) => {
    await page.goto('/#/images-to-ico')
    await page.locator('input[type=file]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: await makePng(page, 80, 80) })
    await page.getByRole('button', { name: /生成 ICO/ }).click()
    const ico = await resultBytes(page.locator('.result-item'))
    expect(ico.readUInt16LE(0)).toBe(0); expect(ico.readUInt16LE(2)).toBe(1); expect(ico.readUInt16LE(4)).toBe(6)
    await page.goto('/#/ico-to-png')
    await page.getByRole('heading', { name: 'ICO 转 PNG' }).waitFor()
    await page.locator('input[type=file]').setInputFiles({ name: 'logo.ico', mimeType: 'image/x-icon', buffer: ico })
    await page.getByRole('button', { name: /提取 PNG/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(6)
    expect((await resultBytes(page.locator('.result-item').last())).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  })

  test('SRT 转 WebVTT 并偏移时间轴', async ({ page }) => {
    await page.goto('/#/subtitle-convert')
    const srt = Buffer.from('1\n00:00:01,000 --> 00:00:03,000\nHello world\n', 'utf8')
    await page.locator('input[type=file]').setInputFiles({ name: 'demo.srt', mimeType: 'text/plain', buffer: srt })
    await page.getByLabel('目标格式').selectOption('vtt'); await page.getByLabel('时间轴偏移（秒）').fill('1.5')
    await page.getByRole('button', { name: /转换字幕/ }).click()
    const output = await resultText(page.locator('.result-item'))
    expect(output).toContain('WEBVTT'); expect(output).toContain('00:00:02.500 --> 00:00:04.500'); expect(output).toContain('Hello world')
  })

  test('Markdown 转独立 HTML', async ({ page }) => {
    await page.goto('/#/markdown-convert')
    await page.locator('input[type=file]').setInputFiles({ name: 'readme.md', mimeType: 'text/markdown', buffer: Buffer.from('# 标题\n\n- 项目一\n- 项目二\n\n```js\nalert(1)\n```') })
    await page.getByRole('button', { name: /转换为 HTML/ }).click()
    const output = await resultText(page.locator('.result-item'))
    expect(output).toContain('<h1>标题</h1>'); expect(output).toContain('<li>项目一</li>'); expect(output).toContain('<pre><code>alert(1)</code></pre>')
  })

  test('PDF 提取文字与转纯文本', async ({ page }) => {
    const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica)
    pdf.addPage().drawText('First page text', { x: 40, y: 700, font, size: 18 }); pdf.addPage().drawText('Second page text', { x: 40, y: 700, font, size: 18 })
    const buffer = Buffer.from(await pdf.save())
    await page.goto('/#/pdf-extract-text'); await page.locator('input[type=file]').setInputFiles({ name: 'text.pdf', mimeType: 'application/pdf', buffer }); await page.getByRole('button', { name: /提取文字/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(2); expect(await resultText(page.locator('.result-item').first())).toContain('First page text')
    await page.goto('/#/pdf-to-text'); await page.getByRole('heading', { name: 'PDF 转纯文本' }).waitFor(); await page.locator('input[type=file]').setInputFiles({ name: 'text.pdf', mimeType: 'application/pdf', buffer }); await page.getByRole('button', { name: /转换纯文本/ }).click()
    const plain = await resultText(page.locator('.result-item')); expect(plain).toContain('First page text'); expect(plain).toContain('Second page text')
  })
})
