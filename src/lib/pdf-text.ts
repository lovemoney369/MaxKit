import { parsePageRange } from './pdf'

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

async function pdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then(module => {
      module.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      return module
    })
  }
  return pdfjsPromise
}

function pageText(items: Array<{ str?: string; hasEOL?: boolean }>) {
  let output = ''
  for (const item of items) {
    output += item.str ?? ''
    output += item.hasEOL ? '\n' : ' '
  }
  return output.replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim()
}

export async function extractPdfText(file: Blob, range = 'all') {
  const library = await pdfjs()
  const document = await library.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  try {
    const pages = parsePageRange(range, document.numPages)
    const output: Array<{ pageNumber: number; text: string }> = []
    for (const index of pages) {
      const page = await document.getPage(index + 1)
      const content = await page.getTextContent()
      output.push({ pageNumber: index + 1, text: pageText(content.items as Array<{ str?: string; hasEOL?: boolean }>) })
      page.cleanup()
    }
    return output
  } finally {
    await document.destroy()
  }
}

export function normalizePlainText(text: string) {
  return text
    .replace(/([\p{L}\p{N}])-[ \t]*\r?\n(?=[\p{L}\p{N}])/gu, '$1')
    .replace(/(?<![。！？.!?:：；;])\r?\n(?!\r?\n)/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
