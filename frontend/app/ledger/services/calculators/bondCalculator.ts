import { BondLedgerDTO } from '../../../../types/ledger';

export interface CouponPayment {
  paymentDate: string;
  amount: number;
  status: 'PAID' | 'UPCOMING';
}

export interface CalculatedBondMetrics {
  bondId: string;
  couponSchedule: CouponPayment[];
  nextCouponDate: string | null;
  remainingPrincipal: number;
  remainingDaysToCoupon: number | null;
  remainingDaysToMaturity: number;
  interestPerPeriod: number;
  totalInterest: number;
}

/**
 * Parses date string safely
 */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Calculates metrics and coupon schedule for a bond ledger record
 */
export function calculateBondMetrics(bond: BondLedgerDTO, currentDateStr: string = '2026-07-05'): CalculatedBondMetrics {
  const currentDate = new Date(currentDateStr).getTime();
  const purchaseDate = new Date(bond.purchaseDate);
  const maturityDate = new Date(bond.maturityDate);
  
  const interestPerPeriod = bond.faceValue * bond.quantity * (bond.couponRate / 100) * (bond.couponFrequency / 12);
  
  // Generate coupon payment dates from purchase to maturity
  const couponSchedule: CouponPayment[] = [];
  let tempDate = addMonths(purchaseDate, bond.couponFrequency);
  
  while (tempDate.getTime() <= maturityDate.getTime()) {
    const dateStr = tempDate.toISOString().split('T')[0];
    const isPaid = tempDate.getTime() <= currentDate;
    
    couponSchedule.push({
      paymentDate: dateStr,
      amount: interestPerPeriod,
      status: isPaid ? 'PAID' : 'UPCOMING'
    });
    
    tempDate = addMonths(tempDate, bond.couponFrequency);
  }

  // Find next coupon
  const upcomingCoupons = couponSchedule.filter(c => c.status === 'UPCOMING');
  const nextCouponDate = upcomingCoupons.length > 0 ? upcomingCoupons[0].paymentDate : null;
  
  // Calculate remaining days
  let remainingDaysToCoupon: number | null = null;
  if (nextCouponDate) {
    const diffTime = new Date(nextCouponDate).getTime() - currentDate;
    remainingDaysToCoupon = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  const diffMaturity = maturityDate.getTime() - currentDate;
  const remainingDaysToMaturity = Math.max(0, Math.ceil(diffMaturity / (1000 * 60 * 60 * 24)));
  const totalInterest = interestPerPeriod * couponSchedule.length;

  return {
    bondId: bond.id,
    couponSchedule,
    nextCouponDate,
    remainingPrincipal: bond.status === 'MATURED' ? 0 : bond.faceValue * bond.quantity,
    remainingDaysToCoupon,
    remainingDaysToMaturity,
    interestPerPeriod,
    totalInterest
  };
}
