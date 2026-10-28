import { canvasToBlob, drawToCanvas, loadImage } from './image'

export function sanitizeSvg(source: string) {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml')
  if (document.querySelector('parsererror')) throw new Error('SVG 文件格式无效')
  document.querySelectorAll('script,foreignObject,iframe,object,embed').forEach(node => node.remove())
  document.querySelectorAll('*').forEach(node => {
    for (const attribute of [...node.attributes]) {
      const value = attribute.value.trim()
      if (attribute.name.toLowerCase().startsWith('on') || (/^(href|xlink:href)$/i.test(attribute.name) && /^(https?:|file:|javascript:)/i.test(value))) node.removeAttribute(attribute.name)
    }
  })
  return new XMLSerializer().serializeToString(document)
}

export async function convertSvg(file: File, target: 'png' | 'jpeg' | 'webp', width: number, quality: number, background: string) {
  const safe = sanitizeSvg(await file.text())
  const image = await loadImage(new Blob([safe], { type: 'image/svg+xml' }))
  const sourceWidth = image.naturalWidth || 1024; const sourceHeight = image.naturalHeight || 1024
  const outputWidth = width > 0 ? width : sourceWidth
  const outputHeight = Math.max(1, Math.round(sourceHeight * outputWidth / sourceWidth))
  const mime = target === 'png' ? 'image/png' : target === 'jpeg' ? 'image/jpeg' : 'image/webp'
  const canvas = drawToCanvas(image, outputWidth, outputHeight, { bg: target === 'jpeg' ? background : undefined })
  return { blob: await canvasToBlob(canvas, mime, quality / 100), width: outputWidth, height: outputHeight }
}
