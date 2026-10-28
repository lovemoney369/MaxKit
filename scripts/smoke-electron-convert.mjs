import { _electron as electron } from '@playwright/test'

function makeWav(durationSeconds = 0.3, sampleRate = 16_000) {
  const sampleCount = Math.floor(durationSeconds * sampleRate)
  const dataSize = sampleCount * 2
  const output = Buffer.alloc(44 + dataSize)
  output.write('RIFF', 0)
  output.writeUInt32LE(36 + dataSize, 4)
  output.write('WAVE', 8)
  output.write('fmt ', 12)
  output.writeUInt32LE(16, 16)
  output.writeUInt16LE(1, 20)
  output.writeUInt16LE(1, 22)
  output.writeUInt32LE(sampleRate, 24)
  output.writeUInt32LE(sampleRate * 2, 28)
  output.writeUInt16LE(2, 32)
  output.writeUInt16LE(16, 34)
  output.write('data', 36)
  output.writeUInt32LE(dataSize, 40)
  for (let i = 0; i < sampleCount; i++) output.writeInt16LE(Math.round(Math.sin((i * 440 * Math.PI * 2) / sampleRate) * 12_000), 44 + i * 2)
  return output
}

process.env.HAHAIMAGE_SMOKE = '1'
const executablePath = process.argv[2]
const app = await electron.launch(executablePath
  ? { executablePath, args: ['--no-sandbox'] }
  : { args: ['.', '--no-sandbox'] })

try {
  const page = await app.firstWindow()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.waitForSelector('text=MaxKit', { timeout: 90_000 })
  await page.goto('hahaimage://app/index.html#/conversions')
  await page.locator('.tool-card').first().waitFor({ timeout: 30_000 })
  if (await page.locator('.tool-card').count() !== 9) throw new Error('格式转换工具数量异常')

  await page.goto('hahaimage://app/index.html#/audio-convert')
  await page.locator('input[type=file]').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav() })
  await page.getByLabel('目标格式').selectOption('mp3')
  await page.getByRole('button', { name: '转换为 MP3' }).click()
  await page.locator('.result-item').waitFor({ timeout: 180_000 })
  const url = await page.locator('.result-item').getAttribute('data-result-url')
  const magic = await page.evaluate(async resultUrl => {
    const bytes = new Uint8Array(await (await fetch(resultUrl)).arrayBuffer())
    return [...bytes.slice(0, 3)]
  }, url)
  const id3 = magic.join(',') === '73,68,51'
  const frame = magic[0] === 255 && (magic[1] & 224) === 224
  if (!id3 && !frame) throw new Error(`MP3 输出异常: ${magic}`)
  if (errors.length) throw new Error(`渲染器错误: ${errors.join('; ')}`)
  console.log('[desktop-convert-smoke] conversion page + offline MP3 OK')
} finally {
  await app.close()
}
