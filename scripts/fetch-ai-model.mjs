// 下载与 @imgly/background-removal 版本完全匹配的最小离线资源集：
// INT8 IS-Net 模型 + CPU ONNX Runtime WASM/MJS。不会复制 FP16/FP32 或 WebGPU 资源。
import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(await readFile(resolve(root, 'node_modules/@imgly/background-removal/package.json'), 'utf8'))
const version = packageJson.version
const baseUrl = `https://staticimgly.com/@imgly/background-removal-data/${version}/dist/`
const destination = resolve(root, 'public/imgly/dist')
const requiredKeys = [
  '/onnxruntime-web/ort-wasm-simd-threaded.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.mjs',
  '/models/isnet_quint8',
]

async function download(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'HahaImage offline asset builder' } })
  if (!response.ok) throw new Error(`下载失败 ${response.status}: ${url}`)
  return Buffer.from(await response.arrayBuffer())
}

const resourceMap = JSON.parse((await download(`${baseUrl}resources.json`)).toString('utf8'))
const selectedResources = {}
const selectedChunks = new Map()

for (const key of requiredKeys) {
  const entry = resourceMap[key]
  if (!entry) throw new Error(`IMG.LY ${version} 资源清单缺少 ${key}`)
  selectedResources[key] = entry
  for (const chunk of entry.chunks) selectedChunks.set(chunk.name, chunk)
}

await rm(destination, { recursive: true, force: true })
await mkdir(destination, { recursive: true })

let totalBytes = 0
for (const [name, chunk] of selectedChunks) {
  const data = await download(`${baseUrl}${name}`)
  const expectedBytes = chunk.offsets[1] - chunk.offsets[0]
  const digest = createHash('sha256').update(data).digest('hex')
  if (data.length !== expectedBytes || digest !== chunk.hash) throw new Error(`资源校验失败: ${name}`)
  await writeFile(resolve(destination, name), data)
  totalBytes += data.length
  console.log(`[AI] ${name.slice(0, 12)}… ${(data.length / 1024 / 1024).toFixed(1)} MB`)
}

await writeFile(resolve(destination, 'resources.json'), `${JSON.stringify(selectedResources, null, 2)}\n`)
console.log(`[AI] 已准备 IMG.LY ${version} 离线资源，共 ${(totalBytes / 1024 / 1024).toFixed(1)} MB`)
