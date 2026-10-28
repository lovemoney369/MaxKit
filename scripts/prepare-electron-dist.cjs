const { cp, readdir, rm } = require('node:fs/promises')
const { existsSync } = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const source = path.join(root, 'node_modules', 'electron', 'dist')
const destination = path.join(root, '.electron-dist-clean')
const keptLocales = new Set(['zh-CN.pak', 'zh-TW.pak', 'en-US.pak'])

async function main() {
  if (!existsSync(path.join(source, 'electron.exe'))) {
    throw new Error('未找到 Electron 运行文件，请先运行 npm install；如仍缺失，请运行 node node_modules/electron/install.js')
  }

  await rm(destination, { recursive: true, force: true })
  await cp(source, destination, { recursive: true })

  const localeDirectory = path.join(destination, 'locales')
  const locales = await readdir(localeDirectory, { withFileTypes: true })
  let removed = 0
  for (const locale of locales) {
    if (!locale.isFile() || keptLocales.has(locale.name)) continue
    await rm(path.join(localeDirectory, locale.name), { force: true })
    removed++
  }
  console.log(`[prepare-electron-dist] Electron 运行目录已就绪，删除 ${removed} 个非必要语言包`)
}

main().catch(error => {
  console.error(`[prepare-electron-dist] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
