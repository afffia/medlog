// Turns raw OCR text into *suggestions* for the upload form.
// Pure and dependency-free so it can be unit-tested. Every field may be null:
// the user always reviews before saving.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

// Regex sources, matched case-insensitively. Short abbreviations use \b so
// "echo" doesn't match inside other words.
const CATEGORY_HINTS = {
  bloodwork: [
    'hemoglobin', 'haemoglobin', '\\bcbc\\b', 'complete blood', 'blood count', 'glucose', 'hba1c',
    'cholesterol', 'triglyceride', 'creatinine', 'platelet', '\\bwbc\\b', '\\brbc\\b', '\\besr\\b',
    'bilirubin', '\\bsgpt\\b', '\\bsgot\\b', 'thyroid', '\\btsh\\b', 'serum', 'lipid', 'blood sugar',
  ],
  imaging: [
    'x-?\\s?ray', 'ultrasound', 'ultrasonogra', '\\busg\\b', '\\bmri\\b', 'ct\\s?scan', 'c\\.t\\.\\s?scan',
    'echocardio', '\\becho\\b', 'radiolog', 'mammogra', 'doppler', 'sonogra',
  ],
  prescription: [
    '\\brx\\b', 'prescription', '\\btab\\.?\\s', '\\bcap\\.?\\s', '\\bsyp\\.?\\s', 'syrup', '\\binj\\.?\\s',
    '\\d\\s?\\+\\s?\\d\\s?\\+\\s?\\d', 'after meal', 'before meal', 'take one',
  ],
  visit: [
    'consultation', 'diagnosis', 'follow[\\s-]?up', 'chief complaint', 'impression', '\\badvice\\b',
    'discharge', 'clinical', 'assessment',
  ],
}
const CATEGORY_ORDER = ['bloodwork', 'imaging', 'prescription', 'visit']

const TITLE_HINTS = [
  [/\bcbc\b|complete blood|blood count/i, 'Complete blood count'],
  [/hba1c/i, 'HbA1c'],
  [/lipid|cholesterol/i, 'Lipid profile'],
  [/thyroid|\btsh\b/i, 'Thyroid profile'],
  [/x-?\s?ray/i, 'X-ray'],
  [/ultrasound|ultrasonogra|\busg\b|sonogra/i, 'Ultrasound'],
  [/\bmri\b/i, 'MRI'],
  [/ct\s?scan|c\.t\.\s?scan/i, 'CT scan'],
  [/echocardio|\becho\b/i, 'Echocardiogram'],
]

export function guessCategory(text) {
  let best = null
  let bestScore = 0
  CATEGORY_ORDER.forEach((cat) => {
    const score = CATEGORY_HINTS[cat].filter((src) => new RegExp(src, 'i').test(text)).length
    if (score > bestScore) { best = cat; bestScore = score }
  })
  return best
}

function validISO(y, m, d, today) {
  if (y < 2000 || m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(y, m - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  const limit = new Date(today)
  limit.setDate(limit.getDate() + 1)       // allow for timezone slop, nothing further out
  if (dt > limit) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const pad4 = (y) => (y < 100 ? 2000 + y : y)

// Dates found in one line of text, in order of appearance.
function datesInLine(line, today) {
  const found = []
  let m
  const iso = /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g
  while ((m = iso.exec(line))) found.push([m.index, validISO(+m[1], +m[2], +m[3], today)])

  // Bangladesh/UK order: day first. If the "month" is >12 and the "day" is <=12, swap.
  const dmy = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b/g
  while ((m = dmy.exec(line))) {
    let d = +m[1]
    let mo = +m[2]
    if (mo > 12 && d <= 12) [d, mo] = [mo, d]
    found.push([m.index, validISO(pad4(+m[3]), mo, d, today)])
  }

  const mon = MONTHS.join('|')
  const dMonY = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s-]+(${mon})[a-z]*\\.?,?[\\s-]+(\\d{4})\\b`, 'gi')
  while ((m = dMonY.exec(line))) found.push([m.index, validISO(+m[3], MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1], today)])

  const monDY = new RegExp(`\\b(${mon})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'gi')
  while ((m = monDY.exec(line))) found.push([m.index, validISO(+m[3], MONTHS.indexOf(m[1].toLowerCase()) + 1, +m[2], today)])

  return found.filter(([, iso2]) => iso2).sort((a, b) => a[0] - b[0]).map(([, iso2]) => iso2)
}

export function guessDate(text, today = new Date()) {
  const lines = text.split(/\r?\n/)
  const candidates = []
  lines.forEach((line) => {
    if (/birth|\bdob\b|d\.o\.b|\bage\b/i.test(line)) return      // not the report date
    const dates = datesInLine(line, today)
    const labelled = /date|collected|reported|issued|dated|printed/i.test(line)
    dates.forEach((d) => candidates.push({ d, labelled }))
  })
  return (candidates.find((c) => c.labelled) || candidates[0])?.d || null
}

const titleCase = (s) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())

// Words that follow "Doctor" on forms but aren't a name
const NOT_A_NAME = /^(signature|sign|name|notes?|advice|review|remarks?|stamp|seal|visit)$/i

export function guessProvider(text) {
  // Prefix may be any case, but the name itself must start with a capital letter
  // so ordinary prose ("no doctor mentioned") isn't read as a name.
  const re = /\b(?:[Dd][Rr]|Doctor|DOCTOR|Prof|PROF)\.?[ \t]+([A-Z][A-Za-z'.-]+(?:[ \t]+[A-Z][A-Za-z'.-]+){0,2})/
  for (const line of text.split(/\r?\n/)) {
    const m = re.exec(line)
    if (!m) continue
    const name = m[1].replace(/[.,;:-]+$/, '').trim()
    if (name.length < 3 || NOT_A_NAME.test(name.split(/\s+/)[0])) continue
    const clean = name === name.toUpperCase() ? titleCase(name) : name
    return `Dr. ${clean}`
  }
  return null
}

export function guessFacility(text) {
  const re = /hospital|diagnostic|clinic|medical|centre|center|laborator|polyclinic/i
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/[^\p{L}\p{N}&.,'() -]/gu, ' ').replace(/\s+/g, ' ').trim()
    if (line.length >= 5 && line.length <= 60 && re.test(line)) return line
  }
  return null
}

export function guessTitle(text) {
  return TITLE_HINTS.find(([re]) => re.test(text))?.[1] || null
}

export function parseReportText(text, today = new Date()) {
  const clean = (text || '').trim()
  if (!clean) return { category: null, date: null, provider: null, facility: null, title: null }
  return {
    category: guessCategory(clean),
    date: guessDate(clean, today),
    provider: guessProvider(clean),
    facility: guessFacility(clean),
    title: guessTitle(clean),
  }
}
