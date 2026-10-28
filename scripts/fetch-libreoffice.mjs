import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'

const version = '26.2.6'
const fileName = `LibreOffice_${version}_Win_x86-64.msi`
const url = `https://download.documentfoundation.org/libreoffice/stable/${version}/win/x86_64/${fileName}`
const outputDir = path.resolve('vendor/downloads')
const outputPath = path.join(outputDir, fileName)

mkdirSync(outputDir, { recursive: true })
async function download(sourceUrl, destination, minimumSize, label) {
  if (existsSync(destination) && statSync(destination).size > minimumSize) {
    console.log(`[fetch-libreoffice] 已存在：${destination}`)
    return
  }
  const response = await fetch(sourceUrl, { redirect: 'follow' })
  if (!response.ok || !response.body) throw new Error(`${label} 下载失败：HTTP ${response.status}`)
  const total = Number(response.headers.get('content-length') ?? 0)
  let received = 0
  let lastPercent = -1
  const progress = new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length
      const percent = total ? Math.floor((received / total) * 100) : 0
      if (percent >= lastPercent + 5) {
        lastPercent = percent
        console.log(`[fetch-libreoffice] ${label} ${percent}%`)
      }
      callback(null, chunk)
    },
  })
  await pipeline(Readable.fromWeb(response.body), progress, createWriteStream(destination))
  console.log(`[fetch-libreoffice] 完成：${destination}`)
}

await download(url, outputPath, 300_000_000, 'LibreOffice')
await download(
  'https://github.com/activescott/lessmsi/releases/download/v2.12.9/lessmsi-v2.12.9.zip',
  path.join(outputDir, 'lessmsi-v2.12.9.zip'),
  500_000,
  'lessmsi',
)
