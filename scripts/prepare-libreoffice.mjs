import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const sourceRoot = path.resolve(projectRoot, 'LibreOffice_26.2.6_Win_x86-64/SourceDir/LibreOffice')
const system64Root = path.resolve(projectRoot, 'LibreOffice_26.2.6_Win_x86-64/SourceDir/System64')
const vendorRoot = path.resolve(projectRoot, 'vendor')
const targetRoot = path.resolve(vendorRoot, 'libreoffice')

if (!existsSync(path.join(sourceRoot, 'program/soffice.exe'))) {
  throw new Error('未找到已解包的 LibreOffice，请先运行 fetch-libreoffice 并使用 lessmsi 解包 MSI')
}
if (!targetRoot.startsWith(`${vendorRoot}${path.sep}`)) throw new Error('LibreOffice 目标目录越界')

rmSync(targetRoot, { recursive: true, force: true })
mkdirSync(targetRoot, { recursive: true })

function copy(relativePath) {
  const source = path.join(sourceRoot, relativePath)
  if (existsSync(source)) cpSync(source, path.join(targetRoot, relativePath), { recursive: true })
}

for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
  if (['program', 'share', 'help', 'readmes'].includes(entry.name)) continue
  copy(entry.name)
}

mkdirSync(path.join(targetRoot, 'program'), { recursive: true })
for (const entry of readdirSync(path.join(sourceRoot, 'program'), { withFileTypes: true })) {
  if (entry.name === 'resource') continue
  copy(path.join('program', entry.name))
}
for (const locale of ['common', 'zh_CN', 'zh_TW', 'en_GB']) copy(path.join('program/resource', locale))

mkdirSync(path.join(targetRoot, 'share'), { recursive: true })
for (const entry of readdirSync(path.join(sourceRoot, 'share'), { withFileTypes: true })) {
  if (['extensions', 'registry'].includes(entry.name)) continue
  copy(path.join('share', entry.name))
}
for (const extension of readdirSync(path.join(sourceRoot, 'share/extensions'))) {
  if (extension === 'dict-en' || extension.startsWith('dict-zh')) copy(path.join('share/extensions', extension))
}
for (const registryFile of readdirSync(path.join(sourceRoot, 'share/registry'))) {
  const isLangpack = registryFile.startsWith('Langpack-')
  const keepLangpack = /^Langpack-(en-GB|zh-CN|zh-TW)\.xcd$/i.test(registryFile)
  if (!isLangpack || keepLangpack) copy(path.join('share/registry', registryFile))
}

for (const dll of readdirSync(system64Root)) {
  if (!dll.includes('.duplicate')) cpSync(path.join(system64Root, dll), path.join(targetRoot, 'program', dll))
}

console.log(`[prepare-libreoffice] 完成：${targetRoot}`)
