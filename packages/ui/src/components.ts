/**
 * STOKROVA UI Component Primitives & Styling Engine
 * Pure TypeScript render descriptors and style builders for cross-platform components.
 */

import { themeTokens, semanticTokens, brandColors, radii, typography, shadows } from './tokens.js';

export interface ButtonStyleProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

export interface InputStyleProps {
  hasError?: boolean;
  isFocused?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface StatusBadgeDescriptor {
  bg: string;
  text: string;
  border: string;
  label: string;
  tone: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

/**
 * Formats minor currency integer units into readable string with decimal separator.
 * Pure integer arithmetic, zero float precision drift.
 */
export function formatCurrencyMinor(
  amountMinor?: string | bigint | number | null,
  currencyCode = 'USD',
): string {
  if (amountMinor === undefined || amountMinor === null || amountMinor === '') {
    return formatCurrencyMinor(0n, currencyCode);
  }
  let big: bigint;
  try {
    big = BigInt(amountMinor);
  } catch {
    return formatCurrencyMinor(0n, currencyCode);
  }
  const isNegative = big < 0n;
  const abs = isNegative ? -big : big;
  const major = abs / 100n;
  const minor = abs % 100n;
  const majorStr = major.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const paddedMinor = minor.toString().padStart(2, '0');
  const formattedNumber = `${majorStr}.${paddedMinor}`;
  const prefix = isNegative ? '-' : '';

  switch (currencyCode.toUpperCase()) {
    case 'USD':
      return `${prefix}$${formattedNumber}`;
    case 'EUR':
      return `${prefix}€${formattedNumber}`;
    case 'GBP':
      return `${prefix}£${formattedNumber}`;
    case 'NGN':
      return `${prefix}₦${formattedNumber}`;
    default:
      return `${prefix}${currencyCode} ${formattedNumber}`;
  }
}

/**
 * Returns accessible styling descriptor for lifecycle and operational status badges.
 */
export function getStatusBadgeStyle(
  status: string,
  theme: 'light' | 'dark' = 'light',
): StatusBadgeDescriptor {
  const s = status.toUpperCase();

  // 1. Success States
  if (['PAID', 'DELIVERED', 'COMPLETED', 'ACTIVE', 'WON', 'CONFIRMED', 'ONLINE', 'ACCEPTED'].includes(s)) {
    const sem = semanticTokens.success[theme];
    return {
      bg: sem.bg,
      text: sem.text,
      border: sem.border,
      label: status,
      tone: 'success',
    };
  }

  // 2. Warning / In-Progress States
  if (['PENDING', 'PROCESSING', 'PICKING', 'PACKING', 'DISPATCHED', 'PARTIALLY_PAID', 'DEGRADED', 'DRAFT'].includes(s)) {
    const sem = semanticTokens.warning[theme];
    return {
      bg: sem.bg,
      text: sem.text,
      border: sem.border,
      label: status,
      tone: 'warning',
    };
  }

  // 3. Error / Destructive States
  if (['CANCELLED', 'FAILED', 'LOST', 'OVERDUE', 'REJECTED', 'OFFLINE', 'EXPIRED'].includes(s)) {
    const sem = semanticTokens.error[theme];
    return {
      bg: sem.bg,
      text: sem.text,
      border: sem.border,
      label: status,
      tone: 'error',
    };
  }

  // 4. Neutral / Info States
  const sem = semanticTokens.info[theme];
  return {
    bg: sem.bg,
    text: sem.text,
    border: sem.border,
    label: status,
    tone: 'info',
  };
}

/**
 * Computes CSS style properties for buttons across variants and themes.
 */
export function getButtonStyles(
  props: ButtonStyleProps,
  theme: 'light' | 'dark' = 'light',
): {
  background: string;
  color: string;
  border: string;
  hoverBackground: string;
  cursor: string;
  padding: string;
  fontSize: string;
  fontWeight: number;
  borderRadius: string;
  opacity: number;
  width: string;
} {
  const tokens = themeTokens[theme];
  const variant = props.variant ?? 'primary';
  const size = props.size ?? 'md';
  const disabled = props.disabled || props.loading;

  let bg: string = tokens.primary;
  let color: string = tokens.primaryForeground;
  let border: string = '1px solid transparent';
  let hoverBg: string = tokens.primaryHover;

  if (variant === 'secondary') {
    bg = theme === 'light' ? '#FFFFFF' : '#1E2428';
    color = tokens.textPrimary;
    border = `1px solid ${tokens.borderStrong}`;
    hoverBg = theme === 'light' ? tokens.surface : '#293136';
  } else if (variant === 'ghost') {
    bg = 'transparent';
    color = tokens.textPrimary;
    border = '1px solid transparent';
    hoverBg = theme === 'light' ? tokens.surface : tokens.cardHover;
  } else if (variant === 'danger') {
    bg = theme === 'light' ? '#DC2626' : '#991B1B';
    color = '#FFFFFF';
    border = '1px solid transparent';
    hoverBg = theme === 'light' ? '#B91C1C' : '#7F1D1D';
  } else if (variant === 'subtle') {
    bg = theme === 'light' ? brandColors.gold[100] : brandColors.gold[950];
    color = theme === 'light' ? brandColors.gold[800] : brandColors.gold[400];
    border = `1px solid ${theme === 'light' ? brandColors.gold[200] : brandColors.gold[800]}`;
    hoverBg = theme === 'light' ? brandColors.gold[200] : brandColors.gold[900];
  }

  let padding: string = '8px 16px';
  let fontSize: string = typography.fontSizes.sm;
  if (size === 'sm') {
    padding = '6px 12px';
    fontSize = typography.fontSizes.xs;
  } else if (size === 'lg') {
    padding = '12px 24px';
    fontSize = typography.fontSizes.base;
  }

  return {
    background: bg,
    color,
    border,
    hoverBackground: hoverBg,
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding,
    fontSize,
    fontWeight: typography.fontWeights.medium,
    borderRadius: radii.md,
    opacity: disabled ? 0.6 : 1,
    width: props.fullWidth ? '100%' : 'auto',
  };
}

/**
 * Computes CSS styles for high-density inputs, search bars, and barcode scanners.
 */
export function getInputStyles(
  props: InputStyleProps,
  theme: 'light' | 'dark' = 'light',
): {
  background: string;
  color: string;
  border: string;
  boxShadow: string;
  padding: string;
  fontSize: string;
  borderRadius: string;
  outline: string;
} {
  const tokens = themeTokens[theme];
  const bg = theme === 'light' ? '#FFFFFF' : tokens.card;
  const color = tokens.textPrimary;
  let border = `1px solid ${tokens.border}`;
  let boxShadow = 'none';

  if (props.hasError) {
    border = '1px solid #EF4444';
    if (props.isFocused) {
      boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
    }
  } else if (props.isFocused) {
    border = `1px solid ${tokens.ring}`;
    boxShadow = `0 0 0 2px ${theme === 'light' ? 'rgba(189, 150, 82, 0.25)' : 'rgba(189, 150, 82, 0.4)'}`;
  }

  let padding: string = '8px 12px';
  let fontSize: string = typography.fontSizes.sm;
  if (props.size === 'sm') {
    padding = '6px 10px';
    fontSize = typography.fontSizes.xs;
  } else if (props.size === 'lg') {
    padding = '12px 16px';
    fontSize = typography.fontSizes.base;
  }

  return {
    background: bg,
    color,
    border,
    boxShadow,
    padding,
    fontSize,
    borderRadius: radii.md,
    outline: 'none',
  };
}

/**
 * Computes table container, header, row, and cell styles.
 */
export function getTableStyles(theme: 'light' | 'dark' = 'light'): {
  headerBg: string;
  headerColor: string;
  rowBorder: string;
  hoverBg: string;
  textColor: string;
  fontSize: string;
} {
  const tokens = themeTokens[theme];
  return {
    headerBg: theme === 'light' ? tokens.surface : '#181E22',
    headerColor: tokens.textSecondary,
    rowBorder: `1px solid ${tokens.border}`,
    hoverBg: tokens.cardHover,
    textColor: tokens.textPrimary,
    fontSize: typography.fontSizes.sm,
  };
}

/**
 * Computes modal backdrop and dialog container styling.
 */
export function getModalStyles(theme: 'light' | 'dark' = 'light'): {
  backdrop: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  textColor: string;
  borderRadius: string;
} {
  const tokens = themeTokens[theme];
  return {
    backdrop: theme === 'light' ? 'rgba(41, 49, 54, 0.4)' : 'rgba(0, 0, 0, 0.75)',
    cardBg: theme === 'light' ? '#FFFFFF' : tokens.card,
    cardBorder: `1px solid ${tokens.border}`,
    cardShadow: theme === 'light' ? shadows.xl : shadows.darkElevated,
    textColor: tokens.textPrimary,
    borderRadius: radii.lg,
  };
}
