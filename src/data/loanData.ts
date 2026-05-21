import { RAW_DISBURSEMENTS } from './loanData.generated'
import type { Disbursement, RatePeriod, SchedulePayment } from './loanData.generated'

export type { Disbursement, RatePeriod, SchedulePayment }

// Color is assigned by tranche index. Add more colors here as new tranches
// are added — must stay in sync with switch sites that paint dot/pill colors
// (search the codebase for `color === 'violet'` for the touchpoints).
const COLORS = ['violet', 'cyan', 'emerald', 'pink'] as const

export type DisbursementColor = (typeof COLORS)[number]

export type DisbursementView = Disbursement & {
  shortName: string
  label: string
  color: DisbursementColor
  rateChanges: { date: string; from: number; to: number }[]
  emiStartIndex: number
  emiStartDate: string | null
  finalDate: string
  totalInterestPlanned: number
  totalPrincipalPlanned: number
  totalPaymentPlanned: number
  peakOutstanding: number
}

const buildView = (d: Disbursement, idx: number): DisbursementView => {
  const isMain = !d.applicationNumber.includes('_')
  const suffix = isMain ? '' : ' · Tranche ' + d.applicationNumber.slice(-1)
  const shortName = isMain ? 'Tranche 1' : `Tranche ${d.applicationNumber.slice(-1)}`
  const label = `${d.applicationNumber}${suffix}`

  const rateChanges: { date: string; from: number; to: number }[] = []
  for (let i = 1; i < d.ratePeriods.length; i++) {
    rateChanges.push({
      date: d.ratePeriods[i].activeStartDate,
      from: d.ratePeriods[i - 1].rateOfInterest,
      to: d.ratePeriods[i].rateOfInterest,
    })
  }

  // EMI starts when principal > 0 first
  const emiStartIndex = d.schedule.findIndex((r) => r.principal > 0)
  const emiStartDate = emiStartIndex >= 0 ? d.schedule[emiStartIndex].dueDate : null

  const totalInterestPlanned = d.schedule.reduce((s, r) => s + r.interest, 0)
  const totalPrincipalPlanned = d.schedule.reduce((s, r) => s + r.principal, 0)
  const totalPaymentPlanned = d.schedule.reduce((s, r) => s + r.paymentDue, 0)
  const peakOutstanding = d.schedule.reduce((m, r) => Math.max(m, r.totalOutstanding), 0)

  return {
    ...d,
    shortName,
    label,
    color: COLORS[idx] ?? 'violet',
    rateChanges,
    emiStartIndex,
    emiStartDate,
    finalDate: d.schedule[d.schedule.length - 1].dueDate,
    totalInterestPlanned,
    totalPrincipalPlanned,
    totalPaymentPlanned,
    peakOutstanding,
  }
}

export const DISBURSEMENTS: DisbursementView[] = RAW_DISBURSEMENTS.map(buildView)

// Master account: aggregates every tranche under a single roll-up view.
export const MASTER = {
  applicationNumber: DISBURSEMENTS[0].applicationNumber,
  applicantName: DISBURSEMENTS[0].applicantName,
  totalDisbursed: DISBURSEMENTS.reduce((s, d) => s + d.disbursedAmount, 0),
  firstDisbursedDate: DISBURSEMENTS.reduce(
    (earliest, d) => (d.disbursedDate < earliest ? d.disbursedDate : earliest),
    DISBURSEMENTS[0].disbursedDate,
  ),
  finalMaturity: DISBURSEMENTS.reduce(
    (latest, d) => (d.finalDate > latest ? d.finalDate : latest),
    DISBURSEMENTS[0].finalDate,
  ),
}

export const findScheduleAtOrBefore = (d: Disbursement, isoDate: string): SchedulePayment | null => {
  let result: SchedulePayment | null = null
  for (const row of d.schedule) {
    if (row.dueDate <= isoDate) result = row
    else break
  }
  return result
}

export const findScheduleAfter = (d: Disbursement, isoDate: string): SchedulePayment | null => {
  for (const row of d.schedule) {
    if (row.dueDate > isoDate) return row
  }
  return null
}

export const findRatePeriodAt = (d: Disbursement, isoDate: string): RatePeriod => {
  for (let i = d.ratePeriods.length - 1; i >= 0; i--) {
    if (d.ratePeriods[i].activeStartDate <= isoDate) return d.ratePeriods[i]
  }
  return d.ratePeriods[0]
}
