import { _electron as electron } from '@playwright/test'

process.env.HAHAIMAGE_SMOKE = '1'
const electronApp = await electron.launch({ args: ['.', '--no-sandbox'] })
try {
  const page = await electronApp.firstWindow()
  page.on('pageerror', error => console.error(`[renderer] ${error.message}`))

  await page.goto('hahaimage://app/index.html#/video-to-gif')
  const webmBase64 = await page.evaluate(() => new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext('2d')
    const recorder = new MediaRecorder(canvas.captureStream(12), { mimeType: 'video/webm' })
    const chunks = []
    recorder.ondataavailable = event => chunks.push(event.data)
    recorder.onerror = () => reject(new Error('MediaRecorder error'))
    recorder.onstop = async () => {
      const bytes = new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer())
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      resolve(btoa(binary))
    }
    recorder.start()
    let hue = 0
    const timer = setInterval(() => {
      hue += 35
      context.fillStyle = `hsl(${hue}, 80%, 50%)`
      context.fillRect(0, 0, 64, 64)
    }, 80)
    setTimeout(() => {
      clearInterval(timer)
      recorder.stop()
    }, 700)
  }))
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'offline-test.webm',
    mimeType: 'video/webm',
    buffer: Buffer.from(webmBase64, 'base64'),
  })
  await page.getByLabel('输出宽度').selectOption('0')
  await page.getByRole('button', { name: '转换为 GIF' }).click()
  await page.locator('.result-item').waitFor({ timeout: 180_000 })
  const gifMagic = await page.locator('.result-item .thumb').first().evaluate(async image => {
    const bytes = new Uint8Array(await (await fetch(image.src)).arrayBuffer())
    return String.fromCharCode(...bytes.slice(0, 4))
  })
  if (gifMagic !== 'GIF8') throw new Error(`FFmpeg 输出异常: ${gifMagic}`)
  console.log('[desktop-feature-smoke] FFmpeg offline OK')

  await page.goto('hahaimage://app/index.html#/remove-bg')
  await page.getByRole('heading', { name: '批量抠图' }).waitFor()
  const pngBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const context = canvas.getContext('2d')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, 128, 128)
    context.fillStyle = '#d6602a'
    context.beginPath()
    context.arc(64, 64, 38, 0, Math.PI * 2)
    context.fill()
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({
    name: 'offline-subject.png',
    mimeType: 'image/png',
    buffer: Buffer.from(pngBase64, 'base64'),
  })
  await page.getByRole('button', { name: /开始抠图（1 个文件）/ }).waitFor()
  await page.getByRole('button', { name: /开始抠图/ }).click()
  await page.locator('.result-item').waitFor({ timeout: 600_000 })
  const pngMagic = await page.locator('.result-item .thumb').first().evaluate(async image => {
    const bytes = new Uint8Array(await (await fetch(image.src)).arrayBuffer())
    return [...bytes.slice(0, 8)]
  })
  if (pngMagic.join(',') !== '137,80,78,71,13,10,26,10') throw new Error(`AI 输出异常: ${pngMagic}`)
  console.log('[desktop-feature-smoke] AI offline OK')
} finally {
  await electronApp.close()
}
