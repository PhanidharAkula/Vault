import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(__dirname, '../loan_details.txt')
const OUT = resolve(__dirname, '../src/data/loanData.generated.ts')

const text = readFileSync(SRC, 'utf8')

const parseNumber = (s) => {
  if (s == null) return 0
  return Number(String(s).replace(/,/g, '').trim() || 0)
}

// dates are DD/MM/YYYY (or D/M/YYYY)
const parseDate = (s) => {
  if (!s) return null
  const [d, m, y] = s.trim().split('/').map((p) => parseInt(p, 10))
  // store as ISO yyyy-mm-dd (UTC) for stable serialization
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toISOString().slice(0, 10)
}

const parseFloatField = (s) => {
  if (s == null) return 0
  return parseFloat(String(s).replace(',', '').replace(/\s/g, '').replace(/months/i, '').replace(/%p\.a\./i, ''))
}

const lines = text.split(/\r?\n/)
const disbursements = []
let cur = null
let rp = null
let inSchedule = false

for (const raw of lines) {
  if (!raw.trim()) {
    inSchedule = false
    continue
  }
  const cols = raw.split('\t').map((c) => (c == null ? '' : c.trim()))
  const c0 = cols[0]
  if (c0 === 'Application Number') {
    if (cur) disbursements.push(cur)
    cur = {
      applicationNumber: cols[1],
      applicantName: '',
      disbursedAmount: 0,
      disbursedDate: '',
      ratePeriods: [],
      schedule: [],
    }
    rp = null
    inSchedule = false
  } else if (c0 === 'Applicant Name') {
    cur.applicantName = cols[1] && cols[1] !== '-' ? cols[1] : ''
  } else if (c0 === 'Loan Disbursed Amount') {
    cur.disbursedAmount = parseNumber(cols[1])
  } else if (c0 === 'Loan Disbursed Date') {
    cur.disbursedDate = parseDate(cols[1])
  } else if (c0 === 'Tenure') {
    rp = {
      tenure: parseFloatField(cols[1]),
      effectiveTenure: parseFloatField(cols[3]),
      rateOfInterest: parseFloatField(cols[5]),
      studyPeriod: 0,
      gracePeriod: 0,
      emiPeriod: 0,
      activeStartDate: '',
      activeEndDate: '',
      partMonthlyInterest: 0,
      indexInDisbursement: cur.ratePeriods.length,
    }
    inSchedule = false
  } else if (c0 === 'Study Period') {
    rp.studyPeriod = parseFloatField(cols[1])
    rp.gracePeriod = parseFloatField(cols[3])
    rp.emiPeriod = parseFloatField(cols[5])
  } else if (c0 === 'Active Start Date') {
    rp.activeStartDate = parseDate(cols[1]) ?? ''
    rp.activeEndDate = parseDate(cols[3]) ?? ''
  } else if (c0 === 'Part Monthly Interest') {
    rp.partMonthlyInterest = parseNumber(cols[1])
    cur.ratePeriods.push(rp)
  } else if (c0 === 'Sr.No.') {
    inSchedule = true
  } else if (inSchedule && /^\d+$/.test(c0)) {
    const row = {
      srNo: parseInt(c0, 10),
      dueDate: parseDate(cols[1]),
      paymentDue: parseNumber(cols[2]),
      interest: parseNumber(cols[3]),
      principal: parseNumber(cols[4]),
      interestAccrued: parseFloat(cols[5]) || 0,
      totalOutstanding: parseNumber(cols[6]),
      rateAtPayment: rp ? rp.rateOfInterest : 0,
      ratePeriodIndex: rp ? rp.indexInDisbursement : 0,
    }
    cur.schedule.push(row)
  }
}
if (cur) disbursements.push(cur)

mkdirSync(dirname(OUT), { recursive: true })

const ts = `// AUTO-GENERATED from /loan_details.txt — do not edit manually.
// Regenerate with: node scripts/parse-data.mjs

export type RatePeriod = {
  tenure: number
  effectiveTenure: number
  rateOfInterest: number
  studyPeriod: number
  gracePeriod: number
  emiPeriod: number
  activeStartDate: string
  activeEndDate: string
  partMonthlyInterest: number
  indexInDisbursement: number
}

export type SchedulePayment = {
  srNo: number
  dueDate: string
  paymentDue: number
  interest: number
  principal: number
  interestAccrued: number
  totalOutstanding: number
  rateAtPayment: number
  ratePeriodIndex: number
}

export type Disbursement = {
  applicationNumber: string
  applicantName: string
  disbursedAmount: number
  disbursedDate: string
  ratePeriods: RatePeriod[]
  schedule: SchedulePayment[]
}

export const RAW_DISBURSEMENTS: Disbursement[] = ${JSON.stringify(disbursements, null, 2)}
`

writeFileSync(OUT, ts)
console.log(`Wrote ${disbursements.length} disbursements (${disbursements.reduce((s, d) => s + d.schedule.length, 0)} payments) to ${OUT}`)
