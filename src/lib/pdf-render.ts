import { canvasToBlob } from './image'

export interface RenderedPdfPage {
  pageNumber: number
  width: number
  height: number
  blob: Blob
}

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

async function pdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then(module => {
      module.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString()
      return module
    })
  }
  return pdfjsPromise
}

export async function getPdfPageCount(file: Blob): Promise<number> {
  const library = await pdfjs()
  const pdfDocument = await library.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  try {
    return pdfDocument.numPages
  } finally {
    await pdfDocument.destroy()
  }
}

export async function renderPdfPages(
  file: Blob,
  pageIndices: number[],
  scale: number,
  format: 'png' | 'jpeg' = 'png',
  quality = 0.9,
): Promise<RenderedPdfPage[]> {
  const library = await pdfjs()
  const pdfDocument = await library.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const output: RenderedPdfPage[] = []
  try {
    for (const pageIndex of pageIndices) {
      const page = await pdfDocument.getPage(pageIndex + 1)
      const viewport = page.getViewport({ scale })
      const canvas = window.document.createElement('canvas')
      canvas.width = Math.max(1, Math.ceil(viewport.width))
      canvas.height = Math.max(1, Math.ceil(viewport.height))
      await page.render({ canvas, viewport, background: 'rgb(255,255,255)' }).promise
      output.push({
        pageNumber: pageIndex + 1,
        width: canvas.width,
        height: canvas.height,
        blob: await canvasToBlob(canvas, format === 'png' ? 'image/png' : 'image/jpeg', quality),
      })
      page.cleanup()
    }
    return output
  } finally {
    await pdfDocument.destroy()
  }
}
