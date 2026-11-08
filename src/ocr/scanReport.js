import { textFromPdf } from './pdfText.js'

// Reads a photo or PDF in the browser and returns its text.
// Everything is loaded on demand, so the OCR engine and PDF reader (several MB)
// are only fetched when someone actually presses "Scan".
//
//  - Photos (JPG/PNG/...): OCR with Tesseract.
//  - PDFs with a text layer: text is read straight out, no OCR needed.
//  - Scanned PDFs (no text layer): pages are drawn to a canvas and OCR'd.
// Only the first few pages are read; the details we want are at the top.

const MAX_PAGES = 3
const MIN_TEXT_CHARS = 40      // less than this = treat the PDF as a scan
const RENDER_SCALE = 2         // higher = sharper for OCR, slower

export const isPdf = (file) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')
export const isImage = (file) => (file.type || '').startsWith('image/')
export const canScan = (file) => !!file && (isPdf(file) || isImage(file))

export async function scanFile(file, onProgress = () => {}) {
  return isPdf(file) ? scanPdf(file, onProgress) : ocr([file], onProgress)
}

// OCR one or more images/canvases with a single Tesseract worker.
async function ocr(sources, onProgress) {
  const { createWorker } = await import('tesseract.js')
  let index = 0
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress(Math.round(((index + m.progress) / sources.length) * 100))
      }
    },
  })
  try {
    const parts = []
    for (index = 0; index < sources.length; index++) {
      const { data } = await worker.recognize(sources[index])
      parts.push(data.text || '')
    }
    return parts.join('\n')
  } finally {
    await worker.terminate()
  }
}

async function scanPdf(file, onProgress) {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  try {
    const text = await textFromPdf(doc, MAX_PAGES)
    if (text.trim().length >= MIN_TEXT_CHARS) {
      onProgress(100)
      return text
    }

    // No text layer: it's a scan. Draw each page and OCR it.
    const canvases = []
    const pages = Math.min(doc.numPages, MAX_PAGES)
    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i)
      const viewport = page.getViewport({ scale: RENDER_SCALE })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      canvases.push(canvas)
    }
    return await ocr(canvases, onProgress)
  } finally {
    await doc.destroy()
  }
}
