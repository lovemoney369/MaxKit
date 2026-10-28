import { expect, test } from '@playwright/test'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { magic, makePng, resultBuffer, upload } from './helpers'

async function makePdf(pageCount: number, prefix = 'page'): Promise<Buffer> {
  const document = await PDFDocument.create()
  const font = await document.embedFont(StandardFonts.Helvetica)
  for (let index = 0; index < pageCount; index++) {
    const page = document.addPage([320 + index, 240 + index])
    page.drawText(`${prefix}-${index + 1}`, { x: 30, y: 180, size: 24, font })
  }
  return Buffer.from(await document.save())
}

test.describe('PDF 工具', () => {
  test('PDF 合并：按顺序合并所有页面', async ({ page }) => {
    await page.goto('/#/pdf-merge')
    await upload(page, [
      { name: 'one.pdf', mimeType: 'application/pdf', buffer: await makePdf(1, 'first') },
      { name: 'two.pdf', mimeType: 'application/pdf', buffer: await makePdf(2, 'second') },
    ])
    await page.getByRole('button', { name: /开始合并/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(1)
    const output = await resultBuffer(page)
    expect(magic.isPdf(output)).toBe(true)
    expect((await PDFDocument.load(output)).getPageCount()).toBe(3)
  })

  test('PDF 拆分：页码范围可提取成一个文件', async ({ page }) => {
    await page.goto('/#/pdf-split')
    await upload(page, [
      { name: 'source-a.pdf', mimeType: 'application/pdf', buffer: await makePdf(4) },
      { name: 'source-b.pdf', mimeType: 'application/pdf', buffer: await makePdf(4) },
    ])
    await page.getByLabel('页码范围').fill('1,3-4')
    await page.getByRole('button', { name: /开始提取/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(2)
    expect((await PDFDocument.load(await resultBuffer(page, 0))).getPageCount()).toBe(3)
    expect((await PDFDocument.load(await resultBuffer(page, 1))).getPageCount()).toBe(3)
  })

  test('PDF 拆分：可把选中页面分别输出', async ({ page }) => {
    await page.goto('/#/pdf-split')
    await upload(page, { name: 'source.pdf', mimeType: 'application/pdf', buffer: await makePdf(3) })
    await page.getByLabel('页码范围').fill('1,3')
    await page.getByRole('button', { name: '每页单独保存' }).click()
    await page.getByRole('button', { name: /开始提取/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(2)
    expect((await PDFDocument.load(await resultBuffer(page, 0))).getPageCount()).toBe(1)
    expect((await PDFDocument.load(await resultBuffer(page, 1))).getPageCount()).toBe(1)
  })

  test('图片转 PDF：每张图片生成一页', async ({ page }) => {
    await page.goto('/#/images-to-pdf')
    await upload(page, [
      { name: 'a.png', mimeType: 'image/png', buffer: await makePng(page, 160, 120) },
      { name: 'b.png', mimeType: 'image/png', buffer: await makePng(page, 120, 160) },
    ])
    await page.getByRole('button', { name: /生成 PDF/ }).click()
    const output = await resultBuffer(page)
    expect(magic.isPdf(output)).toBe(true)
    expect((await PDFDocument.load(output)).getPageCount()).toBe(2)
  })

  test('PDF 删除页面：删除指定范围并保留其他页面', async ({ page }) => {
    await page.goto('/#/pdf-delete-pages')
    await upload(page, [
      { name: 'delete-a.pdf', mimeType: 'application/pdf', buffer: await makePdf(5) },
      { name: 'delete-b.pdf', mimeType: 'application/pdf', buffer: await makePdf(4) },
    ])
    await page.getByLabel('需要删除的页码').fill('2,4')
    await page.getByRole('button', { name: /删除页面/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(2)
    expect((await PDFDocument.load(await resultBuffer(page, 0))).getPageCount()).toBe(3)
    expect((await PDFDocument.load(await resultBuffer(page, 1))).getPageCount()).toBe(2)
  })

  test('PDF 页面旋转：只旋转选择的页面', async ({ page }) => {
    await page.goto('/#/pdf-rotate')
    await upload(page, [
      { name: 'valid.pdf', mimeType: 'application/pdf', buffer: await makePdf(3) },
      { name: 'too-short.pdf', mimeType: 'application/pdf', buffer: await makePdf(1) },
    ])
    await page.getByLabel('页码范围').fill('2')
    await page.getByLabel('顺时针旋转').selectOption('180')
    await page.getByRole('button', { name: /旋转 PDF/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(1)
    await expect(page.locator('.msg-error')).toContainText('too-short.pdf')
    const document = await PDFDocument.load(await resultBuffer(page))
    expect(document.getPage(0).getRotation().angle).toBe(0)
    expect(document.getPage(1).getRotation().angle).toBe(180)
    expect(document.getPage(2).getRotation().angle).toBe(0)
  })

  test('PDF 文字水印：支持中文并保持页数', async ({ page }) => {
    await page.goto('/#/pdf-watermark')
    const source = await makePdf(2)
    await upload(page, [
      { name: 'source-a.pdf', mimeType: 'application/pdf', buffer: source },
      { name: 'source-b.pdf', mimeType: 'application/pdf', buffer: source },
    ])
    await page.getByLabel('水印文字').fill('测试水印')
    await page.getByRole('button', { name: /添加水印/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(2)
    const output = await resultBuffer(page)
    expect((await PDFDocument.load(output)).getPageCount()).toBe(2)
    expect(output.length).toBeGreaterThan(source.length)
  })

  test('PDF 添加页码：可给指定页面编号', async ({ page }) => {
    await page.goto('/#/pdf-page-numbers')
    const source = await makePdf(3)
    await upload(page, [
      { name: 'source-a.pdf', mimeType: 'application/pdf', buffer: source },
      { name: 'source-b.pdf', mimeType: 'application/pdf', buffer: source },
    ])
    await page.getByLabel('页码范围').fill('2-3')
    await page.getByLabel('起始编号').fill('10')
    await page.getByRole('button', { name: /添加页码/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(2)
    const output = await resultBuffer(page)
    expect((await PDFDocument.load(output)).getPageCount()).toBe(3)
    expect(output.length).toBeGreaterThan(source.length)
  })

  test('PDF 转图片：指定页面导出有效 PNG', async ({ page }) => {
    await page.goto('/#/pdf-to-images')
    await upload(page, [
      { name: 'source-a.pdf', mimeType: 'application/pdf', buffer: await makePdf(3) },
      { name: 'source-b.pdf', mimeType: 'application/pdf', buffer: await makePdf(3) },
    ])
    await page.getByLabel('页码范围').fill('2-3')
    await page.getByLabel('清晰度').selectOption('1')
    await page.getByRole('button', { name: /转换 PDF/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(4)
    expect(magic.isPng(await resultBuffer(page, 0))).toBe(true)
    expect(magic.isPng(await resultBuffer(page, 1))).toBe(true)
  })

  test('PDF 页面整理：缩略图排序、旋转和删除生效', async ({ page }) => {
    await page.goto('/#/pdf-organize')
    await upload(page, { name: 'source.pdf', mimeType: 'application/pdf', buffer: await makePdf(3) })
    await expect(page.locator('.pdf-page-card')).toHaveCount(3)
    await page.getByLabel('下移第 1 页').click()
    await page.getByLabel('向右旋转第 1 页').click()
    await page.getByLabel('删除第 3 页').click()
    await page.getByRole('button', { name: '应用整理并生成新 PDF' }).click()
    const document = await PDFDocument.load(await resultBuffer(page))
    expect(document.getPageCount()).toBe(2)
    expect(Math.round(document.getPage(0).getWidth())).toBe(321)
    expect(document.getPage(0).getRotation().angle).toBe(90)
  })

  test('PDF 插入图片：指定页面加入图片', async ({ page }) => {
    await page.goto('/#/pdf-insert-image')
    const source = await makePdf(2)
    await upload(page, [
      { name: 'source-a.pdf', mimeType: 'application/pdf', buffer: source },
      { name: 'source-b.pdf', mimeType: 'application/pdf', buffer: source },
    ])
    await page.locator('input[type=file]').nth(1).setInputFiles({ name: 'signature.png', mimeType: 'image/png', buffer: await makePng(page, 120, 48) })
    await page.getByLabel('页码范围').fill('2')
    await page.getByRole('button', { name: /插入图片/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(2)
    const output = await resultBuffer(page)
    expect((await PDFDocument.load(output)).getPageCount()).toBe(2)
    expect(output.length).toBeGreaterThan(source.length)
  })

  test('PDF 页面裁剪：四边裁剪改变可见区域', async ({ page }) => {
    await page.goto('/#/pdf-crop-pages')
    await upload(page, [
      { name: 'source-a.pdf', mimeType: 'application/pdf', buffer: await makePdf(1) },
      { name: 'source-b.pdf', mimeType: 'application/pdf', buffer: await makePdf(1) },
    ])
    await page.getByLabel('上边（毫米）').fill('10')
    await page.getByLabel('右边（毫米）').fill('10')
    await page.getByLabel('下边（毫米）').fill('10')
    await page.getByLabel('左边（毫米）').fill('10')
    await page.getByRole('button', { name: /裁剪 PDF/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(2)
    const box = (await PDFDocument.load(await resultBuffer(page))).getPage(0).getCropBox()
    expect(box.width).toBeLessThan(270)
    expect(box.height).toBeLessThan(190)
  })
})

