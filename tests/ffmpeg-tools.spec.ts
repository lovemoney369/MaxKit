import { expect, test } from '@playwright/test'
import { magic, makePng, makeWav, makeWebm, makeWebmWithAudio, resultBuffer, upload } from './helpers'

/**
 * ffmpeg 链路测试：先用浏览器 MediaRecorder 现场生成 WebM 视频，
 * 经「视频转 GIF」得到真实 GIF 夹具，再串联测试全部 GIF 工具。
 * 串行执行 + 同一浏览器上下文，31MB 的 ffmpeg 核心只需下载一次（HTTP 缓存）。
 */
test.describe.serial('GIF / 视频工具（ffmpeg.wasm）', () => {
  test.describe.configure({ timeout: 360_000 })
  let gif: Buffer

  test('视频转 GIF', async ({ page }) => {
    await page.goto('/#/video-to-gif')
    const webm = await makeWebm(page)
    await upload(page, { name: 'test.webm', mimeType: 'video/webm', buffer: webm })
    await page.getByLabel('输出宽度').selectOption('0')
    await page.getByRole('button', { name: '转换为 GIF' }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    gif = await resultBuffer(page)
    expect(magic.isGif(gif)).toBe(true)
  })

  test('剪辑视频转 GIF', async ({ page }) => {
    await page.goto('/#/video-clip-gif')
    const webm = await makeWebm(page)
    await upload(page, { name: 'test.webm', mimeType: 'video/webm', buffer: webm })
    await page.getByLabel('开始时间').fill('0.2')
    await page.getByLabel('结束时间').fill('0.8')
    await page.getByRole('button', { name: '剪辑并转换为 GIF' }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    const out = await resultBuffer(page)
    expect(magic.isGif(out)).toBe(true)
    await expect(page.locator('.result-item .note')).toContainText('0.6 秒')
  })

  test('视频格式转换 WebM → MP4', async ({ page }) => {
    await page.goto('/#/video-convert')
    const webm = await makeWebm(page)
    await upload(page, { name: 'test.webm', mimeType: 'video/webm', buffer: webm })
    await page.getByLabel('输出分辨率').selectOption('0')
    await page.getByRole('button', { name: '转换为 MP4' }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    expect(magic.isMp4(await resultBuffer(page))).toBe(true)
  })

  test('音频格式转换 WAV → WAV', async ({ page }) => {
    await page.goto('/#/audio-convert')
    await upload(page, { name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav() })
    await page.getByLabel('目标格式').selectOption('wav')
    await page.getByRole('button', { name: '转换为 WAV' }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    expect(magic.isWav(await resultBuffer(page))).toBe(true)
  })

  test('音频格式转换的有损与无损输出', async ({ page }) => {
    const checks = {
      mp3: magic.isMp3,
      m4a: magic.isM4a,
      flac: magic.isFlac,
      ogg: magic.isOgg,
    }
    for (const [target, check] of Object.entries(checks)) {
      await page.goto('/#/audio-convert')
      await upload(page, { name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav() })
      await page.getByLabel('目标格式').selectOption(target)
      await page.getByRole('button', { name: new RegExp(target === 'm4a' ? 'AAC / M4A' : target.toUpperCase()) }).click()
      const outcome = await Promise.race([
        page.locator('.result-item').waitFor({ timeout: 120_000 }).then(() => ''),
        page.locator('.msg-error').waitFor({ timeout: 120_000 }).then(async () => await page.locator('.msg-error').innerText()),
      ])
      expect(outcome, `${target} 转换错误`).toBe('')
      expect(check(await resultBuffer(page)), `${target} 文件头`).toBe(true)
    }
  })

  test('从视频提取 MP3 音频', async ({ page }) => {
    await page.goto('/#/extract-audio')
    const webm = await makeWebmWithAudio(page)
    await upload(page, { name: 'with-audio.webm', mimeType: 'video/webm', buffer: webm })
    await page.getByLabel('音频格式').selectOption('mp3')
    await page.getByRole('button', { name: '提取音频' }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    expect(magic.isMp3(await resultBuffer(page))).toBe(true)
  })

  test('GIF 压缩', async ({ page }) => {
    await page.goto('/#/gif-compress')
    await upload(page, { name: 'test.gif', mimeType: 'image/gif', buffer: gif })
    await page.getByLabel('尺寸').selectOption('50')
    await page.getByLabel('颜色数').selectOption('64')
    await page.getByRole('button', { name: /开始压缩/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    expect(magic.isGif(await resultBuffer(page))).toBe(true)
  })

  test('GIF 裁剪', async ({ page }) => {
    await page.goto('/#/gif-crop')
    await upload(page, { name: 'test.gif', mimeType: 'image/gif', buffer: gif })
    await expect(page.locator('.crop-rect')).toBeVisible()
    await page.getByRole('button', { name: '裁剪', exact: true }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    expect(magic.isGif(await resultBuffer(page))).toBe(true)
  })

  test('提取 GIF 帧', async ({ page }) => {
    await page.goto('/#/gif-extract')
    await upload(page, { name: 'test.gif', mimeType: 'image/gif', buffer: gif })
    await page.getByRole('button', { name: '提取全部帧' }).click()
    await expect(page.locator('.result-item').first()).toBeVisible({ timeout: 330_000 })
    const count = await page.locator('.result-item').count()
    expect(count).toBeGreaterThanOrEqual(2)
    expect(magic.isPng(await resultBuffer(page, 0))).toBe(true)
    await expect(page.getByRole('button', { name: /全部打包保存/ })).toBeVisible()
  })

  test('GIF 合并', async ({ page }) => {
    await page.goto('/#/gif-merge')
    await upload(page, [
      { name: 'a.gif', mimeType: 'image/gif', buffer: gif },
      { name: 'b.gif', mimeType: 'image/gif', buffer: gif },
    ])
    await page.getByRole('button', { name: /合并 2 个 GIF/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    expect(magic.isGif(await resultBuffer(page))).toBe(true)
  })

  test('GIF 倒放', async ({ page }) => {
    await page.goto('/#/gif-reverse')
    await upload(page, { name: 'test.gif', mimeType: 'image/gif', buffer: gif })
    await page.getByRole('button', { name: '生成倒放 GIF' }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    expect(magic.isGif(await resultBuffer(page))).toBe(true)
  })

  test('GIF 转动态 WebP', async ({ page }) => {
    await page.goto('/#/gif-convert')
    await upload(page, { name: 'test.gif', mimeType: 'image/gif', buffer: gif })
    await page.getByRole('button', { name: '动态 WebP' }).click()
    await page.getByRole('button', { name: /转换为 WebP/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    expect(magic.isWebp(await resultBuffer(page))).toBe(true)
  })

  test('GIF 转 APNG', async ({ page }) => {
    await page.goto('/#/gif-convert')
    await upload(page, { name: 'test.gif', mimeType: 'image/gif', buffer: gif })
    await page.getByRole('button', { name: 'APNG' }).click()
    await page.getByRole('button', { name: /转换为 APNG/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    const out = await resultBuffer(page)
    expect(magic.isPng(out)).toBe(true)
    expect(out.includes('acTL')).toBe(true) // APNG 动画控制块
  })

  test('多张图片转 GIF', async ({ page }) => {
    await page.goto('/#/images-to-gif')
    const png = await makePng(page, 160, 120)
    await upload(page, [
      { name: '1.png', mimeType: 'image/png', buffer: png },
      { name: '2.png', mimeType: 'image/png', buffer: png },
    ])
    await page.getByLabel('输出宽度（px）').fill('160')
    await page.getByRole('button', { name: /生成 GIF/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    expect(magic.isGif(await resultBuffer(page))).toBe(true)
  })

  test('GIF 调整速度', async ({ page }) => {
    await page.goto('/#/gif-speed')
    await upload(page, { name: 'test.gif', mimeType: 'image/gif', buffer: gif })
    await page.getByLabel('播放速度').selectOption('2')
    await page.getByRole('button', { name: /调整速度/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    expect(magic.isGif(await resultBuffer(page))).toBe(true)
  })

  test('GIF 修改尺寸', async ({ page }) => {
    await page.goto('/#/gif-resize')
    await upload(page, { name: 'test.gif', mimeType: 'image/gif', buffer: gif })
    await page.getByRole('button', { name: /调整尺寸/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    expect(magic.isGif(await resultBuffer(page))).toBe(true)
  })

  test('GIF 中文水印', async ({ page }) => {
    await page.goto('/#/gif-watermark')
    await upload(page, { name: 'test.gif', mimeType: 'image/gif', buffer: gif })
    await page.getByLabel('水印文字').fill('测试水印')
    await page.getByRole('button', { name: /添加水印/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    expect(magic.isGif(await resultBuffer(page))).toBe(true)
  })

  test('GIF 往返播放', async ({ page }) => {
    await page.goto('/#/gif-boomerang')
    await upload(page, { name: 'test.gif', mimeType: 'image/gif', buffer: gif })
    await page.getByRole('button', { name: /生成往返 GIF/ }).click()
    await expect(page.locator('.result-item')).toHaveCount(1, { timeout: 330_000 })
    expect(magic.isGif(await resultBuffer(page))).toBe(true)
  })
})
