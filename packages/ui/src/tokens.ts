/**
 * STOKROVA Brand Design System & Design Tokens
 * Extracted directly from official brand logo & identity standards.
 * Golden Rules Compliance:
 * - Brand discipline: Gold & Slate palettes with pure tonal harmony.
 * - Accessibility: WCAG AAA compliance checks with high contrast ratios.
 * - Pure TypeScript: Zero runtime dependencies.
 */

export const brandColors = {
  // Primary Imperial Gold
  gold: {
    50: '#FDFBF7',
    100: '#F9F4EB',
    200: '#EFE3CE',
    300: '#E0CB9F',
    400: '#CEB274',
    500: '#BD9652', // Core Brand Symbol Hex
    600: '#A47E3D',
    700: '#85642D',
    800: '#684D22',
    900: '#4E381A',
    950: '#33230E',
  },

  // Primary Charcoal Slate
  slate: {
    50: '#F5F7F8',
    100: '#E9ECF0',
    200: '#D2D9DF',
    300: '#ACB8C3',
    400: '#7E919F',
    500: '#586A78',
    600: '#414F5A',
    700: '#333D46',
    800: '#293136', // Core Brand Wordmark Hex
    900: '#1E2428', // Deep App Dark Mode Background
    950: '#161B1E', // Pitch Midnight Surface
  },
} as const;

export const semanticTokens = {
  success: {
    light: { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
    dark: { bg: '#14291F', text: '#4ADE80', border: '#1E4620' },
  },
  warning: {
    light: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
    dark: { bg: '#2B2312', text: '#FBBF24', border: '#4E381A' },
  },
  error: {
    light: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
    dark: { bg: '#2C1518', text: '#F87171', border: '#5C1D24' },
  },
  info: {
    light: { bg: '#F8FAFC', text: '#293136', border: '#CBD5E1' },
    dark: { bg: '#1E2428', text: '#CBD5E1', border: '#333D46' },
  },
} as const;

export const themeTokens = {
  light: {
    background: '#FFFFFF',
    surface: '#F8FAFC',
    card: '#FFFFFF',
    cardHover: '#F1F5F9',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    textPrimary: '#293136',    // Brand Wordmark Charcoal
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    primary: '#BD9652',        // Brand Gold
    primaryHover: '#A47E3D',
    primaryForeground: '#FFFFFF',
    accent: '#EFE3CE',
    ring: '#BD9652',
  },
  dark: {
    background: '#161B1E',     // Deepest Slate
    surface: '#1E2428',        // Main Dark Background
    card: '#242A2F',           // Slightly elevated slate card
    cardHover: '#293136',      // Elevated surface on hover
    border: '#333D46',         // Subtle border derived from wordmark
    borderStrong: '#414F5A',
    textPrimary: '#F8FAFC',    // Crisp high-contrast foreground
    textSecondary: '#ACB8C3',  // Mid slate foreground
    textMuted: '#7E919F',
    primary: '#BD9652',        // Brand Gold
    primaryHover: '#CEB274',
    primaryForeground: '#161B1E',
    accent: '#33230E',         // Dark gold glow
    ring: '#BD9652',
  },
} as const;

export const chartColors = {
  series1: '#BD9652', // gold-500
  series2: '#414F5A', // slate-600
  series3: '#E0CB9F', // gold-300
  series4: '#7E919F', // slate-400
  series5: '#2D8A9E', // teal accent
} as const;

export const gradients = {
  goldSheen: 'linear-gradient(135deg, #CEB274, #BD9652 55%, #A47E3D)',
  goldGhost: 'linear-gradient(180deg, rgba(189, 150, 82, 0.35) 0%, rgba(189, 150, 82, 0.0) 100%)',
  surfaceGhost: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent)',
} as const;

export const typography = {
  fontFamilies: {
    sans: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    display: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  },
  fontWeights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extraBold: 800,
  },
  fontSizes: {
    micro: '0.625rem',  // 10px (barcode labels, status indicators)
    xs: '0.75rem',      // 12px (table headers, metadata)
    caption: '0.8125rem', // 13px (compact descriptions, shortcut pills)
    sm: '0.875rem',     // 14px (compact interface body, inputs)
    base: '1rem',       // 16px (standard reading body)
    lg: '1.25rem',      // 20px (card titles, subtotals)
    xl: '1.5rem',       // 24px (section headers, modal titles)
    '2xl': '2rem',      // 32px (POS totals, primary KPIs)
    '3xl': '2.75rem',   // 44px (hero metric displays)
  },
  lineHeights: {
    none: 1,
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
  letterSpacings: {
    tighter: '-0.03em',
    tight: '-0.015em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.08em',
  },
} as const;

export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

export const radii = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  control: '8px',
  card: '10px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
  pill: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 3px rgba(30, 36, 40, 0.06)',
  md: '0 4px 14px rgba(30, 36, 40, 0.08)',
  lg: '0 12px 28px rgba(30, 36, 40, 0.12)',
  xl: '0 20px 32px rgba(30, 36, 40, 0.16)',
  goldGlow: '0 0 20px rgba(189, 150, 82, 0.25)',
  darkElevated: '0 4px 20px 0 rgba(0, 0, 0, 0.45)',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  overlay: 1200,
  modal: 1300,
  popover: 1400,
  toast: 1500,
  tooltip: 1600,
} as const;

// ==========================================
// Accessibility & Contrast Calculation
// ==========================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (rs ?? 0) + 0.7152 * (gs ?? 0) + 0.0722 * (bs ?? 0);
}

/**
 * Calculates WCAG relative contrast ratio between two hex colors.
 * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter luminance.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hexToRgb(hex1));
  const lum2 = getRelativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Validates WCAG AAA compliance:
 * - Normal text: >= 7.0:1
 * - Large text (>= 18pt or 14pt bold): >= 4.5:1
 */
export function isWcagAaaCompliant(fgHex: string, bgHex: string, isLargeText = false): boolean {
  const ratio = contrastRatio(fgHex, bgHex);
  return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
}

// ==========================================
// CSS Variables Generator
// ==========================================

export function generateCssVariables(
  theme: 'light' | 'dark',
  customPrimaryColor?: string,
): Record<string, string> {
  const tokens = themeTokens[theme];
  const primaryColor = customPrimaryColor || tokens.primary;
  return {
    '--stokrova-bg': tokens.background,
    '--stokrova-surface': tokens.surface,
    '--stokrova-card': tokens.card,
    '--stokrova-card-hover': tokens.cardHover,
    '--stokrova-border': tokens.border,
    '--stokrova-border-strong': tokens.borderStrong,
    '--stokrova-text-primary': tokens.textPrimary,
    '--stokrova-text-secondary': tokens.textSecondary,
    '--stokrova-text-muted': tokens.textMuted,
    '--stokrova-primary': primaryColor,
    '--stokrova-primary-hover': customPrimaryColor || tokens.primaryHover,
    '--stokrova-primary-fg': tokens.primaryForeground,
    '--stokrova-accent': tokens.accent,
    '--stokrova-ring': primaryColor,
    '--stokrova-font-sans': typography.fontFamilies.sans,
    '--stokrova-font-mono': typography.fontFamilies.mono,
    '--stokrova-font-display': typography.fontFamilies.display,
    '--stokrova-chart-1': chartColors.series1,
    '--stokrova-chart-2': chartColors.series2,
    '--stokrova-chart-3': chartColors.series3,
    '--stokrova-chart-4': chartColors.series4,
    '--stokrova-chart-5': chartColors.series5,
    '--stokrova-gold-sheen': gradients.goldSheen,
    '--stokrova-gold-ghost': gradients.goldGhost,
    '--stokrova-surface-ghost': gradients.surfaceGhost,
    '--stokrova-radius-sm': radii.sm,
    '--stokrova-radius-md': radii.md,
    '--stokrova-radius-control': radii.control,
    '--stokrova-radius-card': radii.card,
    '--stokrova-radius-pill': radii.pill,
    '--stokrova-shadow-sm': shadows.sm,
    '--stokrova-shadow-md': shadows.md,
    '--stokrova-shadow-lg': shadows.lg,
    '--stokrova-shadow-xl': shadows.xl,
    '--stokrova-shadow-gold-glow': shadows.goldGlow,
    '--stokrova-status-success-bg': semanticTokens.success[theme].bg,
    '--stokrova-status-success-text': semanticTokens.success[theme].text,
    '--stokrova-status-success-border': semanticTokens.success[theme].border,
    '--stokrova-status-warning-bg': semanticTokens.warning[theme].bg,
    '--stokrova-status-warning-text': semanticTokens.warning[theme].text,
    '--stokrova-status-warning-border': semanticTokens.warning[theme].border,
    '--stokrova-status-error-bg': semanticTokens.error[theme].bg,
    '--stokrova-status-error-text': semanticTokens.error[theme].text,
    '--stokrova-status-error-border': semanticTokens.error[theme].border,
    '--stokrova-status-info-bg': semanticTokens.info[theme].bg,
    '--stokrova-status-info-text': semanticTokens.info[theme].text,
    '--stokrova-status-info-border': semanticTokens.info[theme].border,
  };
}

export function generateCssVariableString(
  theme: 'light' | 'dark',
  customPrimaryColor?: string,
): string {
  const vars = generateCssVariables(theme, customPrimaryColor);
  const entries = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return `:root[data-theme="${theme}"] {\n${entries}\n}`;
}
