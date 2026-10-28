const { readdir, rm } = require('node:fs/promises')
const path = require('node:path')

const keptLocales = new Set(['zh-CN.pak', 'zh-TW.pak', 'en-US.pak'])

module.exports = async function trimElectronLocales(context) {
  const localeDirectory = path.join(context.appOutDir, 'locales')
  const entries = await readdir(localeDirectory, { withFileTypes: true })
  let removed = 0
  for (const entry of entries) {
    if (!entry.isFile() || keptLocales.has(entry.name)) continue
    await rm(path.join(localeDirectory, entry.name), { force: true })
    removed++
  }
  console.log(`[after-pack] 已保留简中、繁中和英文语言包，删除 ${removed} 个其他语言包`)
}
