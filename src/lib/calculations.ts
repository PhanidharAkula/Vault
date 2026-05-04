import { DISBURSEMENTS, findRatePeriodAt, findScheduleAfter, findScheduleAtOrBefore } from '../data/loanData'
import type { DisbursementView, SchedulePayment } from '../data/loanData'
import { daysBetween } from './dates'

type LiveStatus = {
  disbursement: DisbursementView
  ratePeriodIndex: number
  rate: number
  // outstanding at last paid scheduled row (the most recent past row)
  baselineOutstanding: number
  baselineDate: string
  // accrual since baseline
  daysSinceBaseline: number
  dailyInterest: number
  accruedSinceBaseline: number
  // current outstanding = baseline + accrued
  currentOutstanding: number
  // upcoming
  nextPayment: SchedulePayment | null
  daysToNext: number | null
  // progress
  paymentsCompleted: number
  paymentsTotal: number
  isInEMIPhase: boolean
  emiAmount: number | null
}

export const computeLiveStatus = (d: DisbursementView, todayIso: string): LiveStatus => {
  const last = findScheduleAtOrBefore(d, todayIso)
  const next = findScheduleAfter(d, todayIso)
  const ratePeriod = findRatePeriodAt(d, todayIso)

  const baselineOutstanding = last?.totalOutstanding ?? d.disbursedAmount
  const baselineDate = last?.dueDate ?? d.disbursedDate

  const daysSinceBaseline = Math.max(0, daysBetween(baselineDate, todayIso))
  const dailyInterest = (baselineOutstanding * (ratePeriod.rateOfInterest / 100)) / 365
  const accruedSinceBaseline = dailyInterest * daysSinceBaseline
  const currentOutstanding = baselineOutstanding + accruedSinceBaseline

  const paymentsCompleted = last?.srNo ?? 0
  const paymentsTotal = d.schedule.length

  const isInEMIPhase = !!last && last.principal > 0
  const emiAmount = d.emiStartIndex >= 0 ? d.schedule[d.emiStartIndex].paymentDue : null

  return {
    disbursement: d,
    ratePeriodIndex: ratePeriod.indexInDisbursement,
    rate: ratePeriod.rateOfInterest,
    baselineOutstanding,
    baselineDate,
    daysSinceBaseline,
    dailyInterest,
    accruedSinceBaseline,
    currentOutstanding,
    nextPayment: next,
    daysToNext: next ? daysBetween(todayIso, next.dueDate) : null,
    paymentsCompleted,
    paymentsTotal,
    isInEMIPhase,
    emiAmount,
  }
}

export type AggregateStatus = {
  totalDisbursed: number
  totalCurrentOutstanding: number
  totalBaselineOutstanding: number
  totalAccruedToday: number
  totalDailyInterest: number
  totalPaid: number
  totalInterestPaid: number
  totalInterestCharged: number
  totalInterestAccrued: number
  totalPrincipalPaid: number
  totalRemainingPayments: number
  totalPlannedPayments: number
  totalPlannedInterest: number
  totalPlannedPrincipal: number
  totalPlannedPayment: number
  weightedAverageRate: number
  perDisbursement: LiveStatus[]
  // Combined next-due across all tranches that share the earliest upcoming date
  nextDueDate: string | null
  nextDueTotal: number
  nextDueRows: { disbursement: DisbursementView; payment: SchedulePayment }[]
}

export const computeAggregate = (todayIso: string): AggregateStatus => {
  const perDisbursement = DISBURSEMENTS.map((d) => computeLiveStatus(d, todayIso))

  const totalDisbursed = DISBURSEMENTS.reduce((s, d) => s + d.disbursedAmount, 0)
  const totalCurrentOutstanding = perDisbursement.reduce((s, p) => s + p.currentOutstanding, 0)
  const totalBaselineOutstanding = perDisbursement.reduce((s, p) => s + p.baselineOutstanding, 0)
  const totalAccruedToday = perDisbursement.reduce((s, p) => s + p.accruedSinceBaseline, 0)
  const totalDailyInterest = perDisbursement.reduce((s, p) => s + p.dailyInterest, 0)

  let totalPaid = 0
  let totalInterestPaid = 0
  let totalInterestCharged = 0
  let totalPrincipalPaid = 0
  let totalRemainingPayments = 0
  let totalPlannedPayments = 0
  let totalPlannedInterest = 0
  let totalPlannedPrincipal = 0
  let totalPlannedPayment = 0

  for (const d of DISBURSEMENTS) {
    totalPlannedPayments += d.schedule.length
    totalPlannedInterest += d.totalInterestPlanned
    totalPlannedPrincipal += d.totalPrincipalPlanned
    totalPlannedPayment += d.totalPaymentPlanned
    for (const row of d.schedule) {
      if (row.dueDate <= todayIso) {
        totalPaid += row.paymentDue
        // interest "charged" = full interest column for the period
        totalInterestCharged += row.interest
        // interest "actually paid in cash" = payment_due minus principal
        // pre-EMI: payment_due is the part-interest paid, principal is 0
        // EMI: payment_due = interest_portion + principal_portion
        totalInterestPaid += row.paymentDue - row.principal
        totalPrincipalPaid += row.principal
      } else {
        totalRemainingPayments++
      }
    }
  }
  // Interest accrued (unpaid, riding on outstanding) = charged − cash-paid
  const totalInterestAccrued = Math.max(0, totalInterestCharged - totalInterestPaid)

  // Compute combined next due across all tranches sharing the earliest upcoming date
  let earliestNext: string | null = null
  for (const p of perDisbursement) {
    if (p.nextPayment) {
      if (!earliestNext || p.nextPayment.dueDate < earliestNext) {
        earliestNext = p.nextPayment.dueDate
      }
    }
  }
  const nextDueRows = earliestNext
    ? perDisbursement
        .filter((p) => p.nextPayment && p.nextPayment.dueDate === earliestNext)
        .map((p) => ({ disbursement: p.disbursement, payment: p.nextPayment! }))
    : []
  const nextDueTotal = nextDueRows.reduce((s, x) => s + x.payment.paymentDue, 0)

  const weightedAverageRate =
    totalCurrentOutstanding > 0
      ? perDisbursement.reduce((s, p) => s + p.currentOutstanding * p.rate, 0) / totalCurrentOutstanding
      : 0

  return {
    totalDisbursed,
    totalCurrentOutstanding,
    totalBaselineOutstanding,
    totalAccruedToday,
    totalDailyInterest,
    totalPaid,
    totalInterestPaid,
    totalInterestCharged,
    totalInterestAccrued,
    totalPrincipalPaid,
    totalRemainingPayments,
    totalPlannedPayments,
    totalPlannedInterest,
    totalPlannedPrincipal,
    totalPlannedPayment,
    weightedAverageRate,
    perDisbursement,
    nextDueDate: earliestNext,
    nextDueTotal,
    nextDueRows,
  }
}

// Build a combined timeline series: at each unique due date, sum total outstanding across all loans
type TimelinePoint = {
  date: string
  total: number
  // per-loan keys: d0, d1, d2 (one for each disbursement)
  [k: string]: number | string
}

export const buildCombinedTimeline = (): TimelinePoint[] => {
  const dateSet = new Set<string>()
  for (const d of DISBURSEMENTS) {
    dateSet.add(d.disbursedDate)
    for (const r of d.schedule) dateSet.add(r.dueDate)
  }
  const dates = [...dateSet].sort()

  // For each disbursement, build a function date -> outstanding (last known on or before date)
  const points: TimelinePoint[] = []
  const cursors = DISBURSEMENTS.map(() => 0)
  const lastVals = DISBURSEMENTS.map((d) => ({ value: 0, started: false, disbursedDate: d.disbursedDate }))

  for (const date of dates) {
    let total = 0
    const point: TimelinePoint = { date, total: 0 }
    for (let i = 0; i < DISBURSEMENTS.length; i++) {
      const d = DISBURSEMENTS[i]
      const lv = lastVals[i]
      if (!lv.started && date >= lv.disbursedDate) {
        lv.started = true
        lv.value = d.disbursedAmount
      }
      while (cursors[i] < d.schedule.length && d.schedule[cursors[i]].dueDate <= date) {
        lv.value = d.schedule[cursors[i]].totalOutstanding
        cursors[i]++
      }
      point[`d${i}`] = lv.started ? lv.value : 0
      total += lv.started ? lv.value : 0
    }
    point.total = total
    points.push(point)
  }
  return points
}

