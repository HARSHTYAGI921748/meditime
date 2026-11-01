import { differenceInDays, isAfter, parseISO } from 'date-fns';
import { Medicine, StockStatus } from '../types';

// ============================================================
// Medicine stock utility functions
// ============================================================

/**
 * Returns how many days of stock remain based on doses per day.
 */
export function daysRemainingInStock(medicine: Medicine): number | null {
  if (medicine.currentStock == null || medicine.currentStock <= 0) return null;
  const dosesPerDay = medicine.times.length || 1;
  const unitsPerDose = medicine.dose || 1;
  const dailyUsage = dosesPerDay * unitsPerDose;
  if (dailyUsage <= 0) return null;
  return Math.floor(medicine.currentStock / dailyUsage);
}

/**
 * Returns a colour-coded stock status for display.
 */
export function getStockStatus(medicine: Medicine): StockStatus {
  // Check expiry first
  if (medicine.expiryDate) {
    const expiry = parseISO(medicine.expiryDate);
    if (!isAfter(expiry, new Date())) {
      return { label: 'expired', message: 'Expired – do not use' };
    }
    const daysToExpiry = differenceInDays(expiry, new Date());
    if (daysToExpiry <= 7) {
      return {
        label: 'critical',
        daysRemaining: daysToExpiry,
        message: `Expires in ${daysToExpiry} day${daysToExpiry !== 1 ? 's' : ''}`,
      };
    }
  }

  if (medicine.currentStock == null) {
    return { label: 'unknown', message: 'Stock not tracked' };
  }

  if (medicine.currentStock <= 0) {
    return { label: 'critical', daysRemaining: 0, message: 'Out of stock!' };
  }

  const days = daysRemainingInStock(medicine);
  const threshold = medicine.lowStockThreshold ?? 7; // days

  if (days === null) return { label: 'unknown', message: 'Stock not tracked' };

  if (days <= 0) return { label: 'critical', daysRemaining: 0, message: 'Out of stock!' };

  if (days <= threshold) {
    return {
      label: 'low',
      daysRemaining: days,
      message: `Only ${days} day${days !== 1 ? 's' : ''} of stock left`,
    };
  }

  return {
    label: 'ok',
    daysRemaining: days,
    message: `${days} days of stock remaining`,
  };
}

/**
 * Returns true when stock needs a refill.
 */
export function isLowStock(medicine: Medicine): boolean {
  const status = getStockStatus(medicine);
  return status.label === 'low' || status.label === 'critical';
}

/**
 * Deduct one dose from stock. Returns the new stock value.
 */
export function deductDose(medicine: Medicine): number | undefined {
  if (medicine.currentStock == null) return undefined;
  return Math.max(0, medicine.currentStock - medicine.dose);
}
