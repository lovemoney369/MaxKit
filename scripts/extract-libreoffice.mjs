import { existsSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const version = '26.2.6'
const projectRoot = process.cwd()
const msiPath = path.resolve(projectRoot, `vendor/downloads/LibreOffice_${version}_Win_x86-64.msi`)
const lessMsiZip = path.resolve(projectRoot, 'vendor/downloads/lessmsi-v2.12.9.zip')
const toolRoot = path.resolve(projectRoot, 'vendor/tools/lessmsi')
const executable = path.join(toolRoot, 'lessmsi.exe')
const extractedRoot = path.resolve(projectRoot, `LibreOffice_${version}_Win_x86-64`)

if (!existsSync(msiPath) || !existsSync(lessMsiZip)) throw new Error('依赖未下载，请先运行 fetch-libreoffice.mjs')
if (!existsSync(executable)) {
  mkdirSync(toolRoot, { recursive: true })
  const command = `Expand-Archive -LiteralPath '${lessMsiZip.replaceAll("'", "''")}' -DestinationPath '${toolRoot.replaceAll("'", "''")}' -Force`
  const expanded = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { stdio: 'inherit' })
  if (expanded.status !== 0) throw new Error('lessmsi 解压失败')
}
if (!existsSync(path.join(extractedRoot, 'SourceDir/LibreOffice/program/soffice.exe'))) {
  const extracted = spawnSync(executable, ['x', msiPath], { cwd: projectRoot, stdio: 'inherit', windowsHide: true })
  if (extracted.status !== 0) throw new Error(`LibreOffice MSI 解包失败（${extracted.status ?? 'unknown'}）`)
}

console.log(`[extract-libreoffice] 完成：${extractedRoot}`)
