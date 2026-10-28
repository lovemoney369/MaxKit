import { _electron as electron } from '@playwright/test'

process.env.HAHAIMAGE_SMOKE = '1'
// Codex 的受控 Windows 环境不允许 Chromium 子进程沙箱；正式应用仍启用沙箱。
const packagedExecutable = process.argv[2]
const electronApp = await electron.launch(
  packagedExecutable
    ? { executablePath: packagedExecutable, args: ['--no-sandbox'] }
    : { args: ['.', '--no-sandbox'] },
)
try {
  const page = await electronApp.firstWindow()
  page.on('pageerror', error => console.error(`[renderer] ${error.message}`))
  page.on('console', message => message.type() === 'error' && console.error(`[console] ${message.text()}`))
  await page.waitForSelector('text=MaxKit', { timeout: 90_000 })
  const title = await page.title()
  if (!title.includes('MaxKit')) throw new Error(`桌面窗口标题异常: ${title}`)
  const resources = await page.evaluate(async () => {
    const [ai, ffmpeg] = await Promise.all([
      window.maxkitAi?.status(),
      fetch('./ffmpeg/ffmpeg-core.wasm'),
    ])
    return {
      aiBridgeOk: Boolean(ai && typeof ai.available === 'boolean' && ai.download?.size > 50_000_000),
      ffmpegBytes: (await ffmpeg.arrayBuffer()).byteLength,
    }
  })
  if (!resources.aiBridgeOk || resources.ffmpegBytes < 20_000_000) {
    throw new Error(`组件状态异常: ${JSON.stringify(resources)}`)
  }
  console.log(`[desktop-smoke] OK: ${title}`)
} finally {
  await electronApp.close()
}
