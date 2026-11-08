// Pulls the embedded text out of a PDF that pdf.js has already opened.
// Digital lab reports usually have a real text layer, which is faster and far
// more accurate than OCR. Scanned PDFs have none, and the caller falls back to OCR.
//
// Kept separate from scanReport.js so it can be tested with a plain Node import.
export async function textFromPdf(doc, maxPages = 3) {
  const pages = Math.min(doc.numPages, maxPages)
  const out = []
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    let text = ''
    for (const item of content.items) {
      if (typeof item.str !== 'string') continue
      text += item.str + (item.hasEOL ? '\n' : ' ')
    }
    out.push(text)
  }
  return out.join('\n')
}
