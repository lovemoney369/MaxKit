import { canvasToBlob, drawToCanvas, loadImage } from './image'

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
const isPng = (bytes: Uint8Array) => pngSignature.every((value, index) => bytes[index] === value)

export async function imageToIco(file: Blob, sizes: number[]) {
  const image = await loadImage(file)
  const frames: Array<{ size: number; bytes: Uint8Array }> = []
  for (const size of [...new Set(sizes)].sort((a, b) => a - b)) {
    const canvas = drawToCanvas(image, size, size)
    frames.push({ size, bytes: new Uint8Array(await (await canvasToBlob(canvas, 'image/png')).arrayBuffer()) })
  }
  const headerSize = 6 + frames.length * 16
  const total = headerSize + frames.reduce((sum, frame) => sum + frame.bytes.length, 0)
  const output = new Uint8Array(total); const view = new DataView(output.buffer)
  view.setUint16(0, 0, true); view.setUint16(2, 1, true); view.setUint16(4, frames.length, true)
  let offset = headerSize
  frames.forEach((frame, index) => {
    const entry = 6 + index * 16; output[entry] = frame.size === 256 ? 0 : frame.size; output[entry + 1] = frame.size === 256 ? 0 : frame.size
    view.setUint16(entry + 4, 1, true); view.setUint16(entry + 6, 32, true); view.setUint32(entry + 8, frame.bytes.length, true); view.setUint32(entry + 12, offset, true)
    output.set(frame.bytes, offset); offset += frame.bytes.length
  })
  return new Blob([output.buffer], { type: 'image/x-icon' })
}

export async function icoToPngs(file: Blob) {
  const bytes = new Uint8Array(await file.arrayBuffer()); const view = new DataView(bytes.buffer)
  if (view.getUint16(0, true) !== 0 || view.getUint16(2, true) !== 1) throw new Error('ICO 文件头无效')
  const count = view.getUint16(4, true); const results: Array<{ size: number; blob: Blob }> = []
  for (let index = 0; index < count; index++) {
    const entry = 6 + index * 16; const width = bytes[entry] || 256; const height = bytes[entry + 1] || 256
    const length = view.getUint32(entry + 8, true); const offset = view.getUint32(entry + 12, true)
    if (offset + length > bytes.length) continue
    const frame = bytes.slice(offset, offset + length)
    if (isPng(frame)) results.push({ size: Math.max(width, height), blob: new Blob([frame.buffer], { type: 'image/png' }) })
  }
  if (results.length) return results
  const image = await loadImage(file); const size = Math.max(image.naturalWidth, image.naturalHeight)
  return [{ size, blob: await canvasToBlob(drawToCanvas(image, image.naturalWidth, image.naturalHeight), 'image/png') }]
}
