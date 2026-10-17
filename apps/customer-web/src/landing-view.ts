/**
 * STOKROVA Customer Web — Public Marketing Website & Universal Business Workspace Portal
 * Self-service business onboarding, role-based staff login, and tenant workspace launcher.
 * 
 * Non-negotiables preserved:
 * - Brand Colours: Imperial Gold #BD9652, Wordmark Charcoal #293136, Midnight background #161B1E, Slate surface #1E2428, Border #333D46.
 * - Supporting Colours: Reconciliation Teal #2D8A9E, Success/Balanced Green #4ADE80.
 * - Typography: Plus Jakarta Sans for UI, JetBrains Mono for monetary/GL/SKU values.
 * - Mobile Sizing Discipline:
 *   - Headings: H1 26–30px, H2 20–24px, H3 15–17px.
 *   - Body: 14–16px (16px on inputs to prevent iOS auto-zoom).
 *   - Touch targets >= 44x44px on all controls.
 *   - Section spacing 24–36px, page gutters 12–16px.
 * - Integer minor currency math, multi-tenant enterprise data privacy.
 * - Pure TypeScript + inline SVG and CSS (zero third-party chart/framework bloat).
 */

import { formatCurrencyMinor, themeTokens } from '@stokrova/ui';

export interface PricingPlanItem {
  id: string;
  name: string;
  monthlyPriceMinor: bigint;
  currency: string;
  badge?: string;
  description: string;
  features: string[];
  recommended?: boolean;
}

export const WORLD_COUNTRIES: Array<{ code: string; name: string }> = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'Congo (DRC)' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CI', name: "Cote d'Ivoire" },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KP', name: 'North Korea' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PS', name: 'Palestine' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'Sao Tome and Principe' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vatican City' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
];

export class LandingViewModel {
  private theme: 'light' | 'dark';

  constructor(theme: 'light' | 'dark' = 'dark') {
    this.theme = theme;
  }

  public getPricingPlans(): PricingPlanItem[] {
    return [
      {
        id: 'starter',
        name: 'Starter',
        monthlyPriceMinor: 4900n, // $49.00
        currency: 'USD',
        description: 'Single-location retailers and boutique shops seeking automated inventory and fast POS.',
        features: [
          '1 Branch Location & Cashier Till',
          'Up to 3 Staff Members',
          'Offline-First Touch POS Register',
          'Basic Real-Time Stock Tracking',
          'Standard Thermal Receipt Printing',
          'Community & Email Support',
        ],
      },
      {
        id: 'growth',
        name: 'Growth',
        monthlyPriceMinor: 14900n, // $149.00
        currency: 'USD',
        badge: 'MOST POPULAR',
        recommended: true,
        description: 'Fast-growing brands operating multiple stores with inter-branch transfers and lot tracking.',
        features: [
          'Up to 5 Branch Locations',
          'Unlimited Staff & Till Sessions',
          'Inter-Store Stock Transfers & IN-TRANSIT Tracking',
          'FEFO & Expiration Lot Management',
          'Automated Double-Entry Accounting Ledger',
          'Priority 24/7 SLA Support',
        ],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        monthlyPriceMinor: 39900n, // $399.00
        currency: 'USD',
        badge: 'ENTERPRISE',
        description: 'Large distribution networks and multi-warehouse enterprises with custom workflows.',
        features: [
          'Unlimited Branches & Regional Warehouses',
          'Rugged Warehouse Wave-Picking Checklist',
          'Visual DAG Business Workflow Engine',
          'Dedicated Multi-Tenant Isolation',
          'Custom Webhooks & REST/GraphQL API Access',
          'Dedicated Solution Architect & Custom Onboarding',
        ],
      },
    ];
  }

  /**
   * Crisp, thin-line SVG icons rendered with Imperial Gold stroke and subtle rounded backing.
   */
  public renderSvgIcon(name: string, size = 20): string {
    const stroke = '#BD9652';
    const s = size;
    switch (name) {
      case 'branch':
      case 'store':
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
      case 'pos':
      case 'bolt':
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
      case 'box':
      case 'fefo':
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
      case 'ledger':
      case 'scales':
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18"></path><path d="M3 7l9-4 9 4"></path><path d="M6 13a3 3 0 0 0 6 0l-3-6-3 6z"></path><path d="M15 13a3 3 0 0 0 6 0l-3-6-3 6z"></path></svg>`;
      case 'dag':
      case 'workflow':
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5" cy="6" r="3"></circle><circle cx="19" cy="6" r="3"></circle><circle cx="12" cy="18" r="3"></circle><path d="M7.5 7.5L10 15"></path><path d="M16.5 7.5L14 15"></path></svg>`;
      case 'shield':
      case 'security':
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>`;
      case 'holding':
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="2" y1="22" x2="22" y2="22"></line><line x1="12" y1="2" x2="12" y2="6"></line><path d="M4 18V9l8-4 8 4v9"></path><line x1="8" y1="18" x2="8" y2="12"></line><line x1="12" y1="18" x2="12" y2="12"></line><line x1="16" y1="18" x2="16" y2="12"></line></svg>`;
      case 'truck':
      case 'transfer':
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`;
      case 'lock':
      case 'isolation':
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
      case 'scanner':
      case 'barcode':
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5v4M3 5h4M21 5v4M21 5h-4M3 19v-4M3 19h4M21 19v-4M21 19h-4"></path><line x1="7" y1="8" x2="7" y2="16"></line><line x1="11" y1="8" x2="11" y2="16"></line><line x1="13" y1="8" x2="13" y2="16"></line><line x1="17" y1="8" x2="17" y2="16"></line><line x1="4" y1="12" x2="20" y2="12" stroke="#4ADE80" stroke-width="1.5"></line></svg>`;
      case 'card':
      case 'split':
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`;
      case 'offline':
      case 'queue':
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>`;
      case 'receipt':
      case 'thermal':
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"></path><line x1="8" y1="7" x2="16" y2="7"></line><line x1="8" y1="11" x2="16" y2="11"></line><line x1="8" y1="15" x2="12" y2="15"></line></svg>`;
      case 'profit':
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`;
      default:
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
  }

  /**
   * Helper to render mini SVG sparklines for telemetry tiles.
   */
  public renderSparklineSvg(data: number[], color = '#BD9652', width = 64, height = 20): string {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" style="overflow: visible;" aria-hidden="true">
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
  }

  public renderHeaderHtml(): string {
    const tokens = themeTokens[this.theme];
    return `
      <header id="main-header" style="background: ${tokens.surface}; border-bottom: 1px solid ${tokens.border}; padding: 14px 32px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; transition: all 0.2s ease;">
        <div style="display: flex; align-items: center; gap: 28px;">
          <a href="#" onclick="window.scrollTo({ top: 0, behavior: 'smooth' }); return false;" aria-label="STOKROVA Home" style="text-decoration: none; display: flex; align-items: center; gap: 10px; min-height: 44px;">
            <img src="./assets/stokrova-symbol.png" alt="" width="26" height="26" style="display: block; object-fit: contain;" onerror="this.style.display='none'; document.getElementById('hdr-fallback-sym').style.display='inline-block';" />
            <span id="hdr-fallback-sym" style="display: none; color: ${tokens.primary}; font-size: 1.3rem; font-weight: 800;">◆</span>
            <span style="color: ${tokens.textPrimary}; font-size: 1.25rem; font-weight: 800; letter-spacing: 0.05em; font-family: var(--font-sans);">STOKROVA</span>
          </a>
          <nav class="desktop-nav" style="display: flex; gap: 20px; font-size: 0.875rem;">
            <a href="#features" style="color: ${tokens.textSecondary}; text-decoration: none; font-weight: 500;">Features</a>
            <a href="#money-flow" style="color: ${tokens.textSecondary}; text-decoration: none; font-weight: 500;">Money Flow</a>
            <a href="#architecture" style="color: ${tokens.textSecondary}; text-decoration: none; font-weight: 500;">Multi-Branch</a>
            <a href="#pos" style="color: ${tokens.textSecondary}; text-decoration: none; font-weight: 500;">Offline POS</a>
            <a href="#pricing" style="color: ${tokens.textSecondary}; text-decoration: none; font-weight: 500;">Pricing</a>
            <a href="#faq" style="color: ${tokens.textSecondary}; text-decoration: none; font-weight: 500;">FAQ</a>
          </nav>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="desktop-auth-actions" style="display: flex; align-items: center; gap: 12px;">
            <button onclick="window.stokrovaCustomerApp.openLoginModal()" style="background: transparent; color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong}; padding: 8px 18px; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">
              Staff Sign In
            </button>
            <button onclick="window.stokrovaCustomerApp.openRegisterModal()" style="background: ${tokens.primary}; color: #0E1116; border: none; padding: 8px 20px; border-radius: 6px; font-size: 0.875rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(189,150,82,0.3); transition: all 0.15s ease;">
              Register Your Business
            </button>
          </div>

          <!-- Mobile Hamburger Toggle (44x44px touch target) -->
          <button id="nav-hamburger-btn" class="mobile-hamburger" onclick="window.stokrovaCustomerApp.toggleMobileMenu()" aria-label="Toggle navigation menu" style="display: none; background: transparent; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 6px; cursor: pointer; align-items: center; justify-content: center; padding: 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </header>

      <!-- Full-Height Mobile Slate Drawer -->
      <div id="mobile-nav-drawer" style="display: none; position: fixed; inset: 0; background: rgba(14, 17, 22, 0.98); backdrop-filter: blur(12px); z-index: 10000; padding: 20px 16px; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid ${tokens.border}; padding-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: ${tokens.primary}; font-size: 1.3rem; font-weight: 800;">◆</span>
              <span style="color: ${tokens.textPrimary}; font-size: 1.25rem; font-weight: 800; letter-spacing: 0.05em;">STOKROVA</span>
            </div>
            <button onclick="window.stokrovaCustomerApp.toggleMobileMenu()" aria-label="Close navigation menu" style="background: transparent; border: none; width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.75rem; color: ${tokens.textMuted}; cursor: pointer;">&times;</button>
          </div>

          <nav style="display: flex; flex-direction: column; gap: 8px; font-size: 1rem; font-weight: 600;">
            <a href="#features" onclick="window.stokrovaCustomerApp.toggleMobileMenu()" style="color: ${tokens.textPrimary}; text-decoration: none; min-height: 44px; display: flex; align-items: center; padding: 0 8px;">Features</a>
            <a href="#money-flow" onclick="window.stokrovaCustomerApp.toggleMobileMenu()" style="color: ${tokens.textPrimary}; text-decoration: none; min-height: 44px; display: flex; align-items: center; padding: 0 8px;">Money Flow</a>
            <a href="#architecture" onclick="window.stokrovaCustomerApp.toggleMobileMenu()" style="color: ${tokens.textPrimary}; text-decoration: none; min-height: 44px; display: flex; align-items: center; padding: 0 8px;">Multi-Branch Architecture</a>
            <a href="#pos" onclick="window.stokrovaCustomerApp.toggleMobileMenu()" style="color: ${tokens.textPrimary}; text-decoration: none; min-height: 44px; display: flex; align-items: center; padding: 0 8px;">Offline POS Engine</a>
            <a href="#pricing" onclick="window.stokrovaCustomerApp.toggleMobileMenu()" style="color: ${tokens.textPrimary}; text-decoration: none; min-height: 44px; display: flex; align-items: center; padding: 0 8px;">Pricing Plans</a>
            <a href="#faq" onclick="window.stokrovaCustomerApp.toggleMobileMenu()" style="color: ${tokens.textPrimary}; text-decoration: none; min-height: 44px; display: flex; align-items: center; padding: 0 8px;">Frequently Asked Questions</a>
          </nav>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; border-top: 1px solid ${tokens.border}; padding-top: 20px;">
          <button onclick="window.stokrovaCustomerApp.toggleMobileMenu(); window.stokrovaCustomerApp.openLoginModal()" style="width: 100%; min-height: 44px; background: transparent; color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong}; border-radius: 6px; font-size: 0.95rem; font-weight: 600; cursor: pointer;">
            Staff Sign In
          </button>
          <button onclick="window.stokrovaCustomerApp.toggleMobileMenu(); window.stokrovaCustomerApp.openRegisterModal()" style="width: 100%; min-height: 44px; background: ${tokens.primary}; color: #0E1116; border: none; border-radius: 6px; font-size: 0.95rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 10px rgba(189,150,82,0.4);">
            Register Your Business Workspace →
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Section 2: Large tilted Command Center product window embedded directly inside the Hero.
   */
  public renderHeroCommandCenterHtml(): string {
    const tokens = themeTokens[this.theme];

    // Sparkline series data
    const gmvSpark = [22, 24, 25, 27, 26, 30, 31, 34];
    const revSpark = [18, 20, 22, 21, 24, 26, 27, 29];
    const marginSpark = [34, 35, 36, 35, 37, 38, 38.2, 38.5];
    const riskSpark = [8, 7, 6, 6, 5, 5, 4, 4];

    return `
      <div class="command-center-outer-wrapper" style="position: relative; max-width: 1040px; margin: 36px auto 0 auto; text-align: left;">
        <!-- Subtle Breathing Gold Glow -->
        <div class="command-center-glow" style="position: absolute; inset: -16px; background: radial-gradient(ellipse 70% 50% at 50% 20%, rgba(189,150,82,0.18), transparent 75%); filter: blur(35px); pointer-events: none; z-index: 0;" aria-hidden="true"></div>

        <!-- Floating Depth Card 1: Live POS Ticket -->
        <div class="floating-depth-card floating-depth-receipt" style="position: absolute; right: -24px; bottom: 24px; background: ${tokens.surface}; border: 1px solid ${tokens.primary}; border-radius: 8px; padding: 14px 18px; box-shadow: 0 16px 36px rgba(0,0,0,0.65); z-index: 10; width: 260px;" aria-hidden="true">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; color: ${tokens.primary};">
              ${this.renderSvgIcon('receipt', 14)} <span>POS Sale #10482</span>
            </div>
            <span style="color: #4ADE80; font-size: 0.65rem; background: #14291F; border: 1px solid #1E4620; padding: 2px 6px; border-radius: 4px; font-weight: 700;">PAID</span>
          </div>
          <div style="font-family: var(--stokrova-font-mono); font-size: 1.25rem; font-weight: 800; color: ${tokens.textPrimary}; margin-bottom: 2px;">$86.40</div>
          <div style="color: ${tokens.textSecondary}; font-size: 0.75rem;">Split: Card $60.00 + Cash $26.40</div>
          <div style="font-family: var(--stokrova-font-mono); color: ${tokens.textMuted}; font-size: 0.6875rem; margin-top: 6px; border-top: 1px solid ${tokens.border}; padding-top: 6px;">
            London Flagship • QR Verified
          </div>
        </div>

        <!-- Floating Depth Card 2: Balanced General Ledger -->
        <div class="floating-depth-card floating-depth-ledger" style="position: absolute; left: -24px; bottom: 90px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; border-left: 3px solid #4ADE80; border-radius: 8px; padding: 12px 16px; box-shadow: 0 16px 36px rgba(0,0,0,0.65); z-index: 10; width: 250px;" aria-hidden="true">
          <div style="display: flex; align-items: center; gap: 6px; color: #4ADE80; font-size: 0.75rem; font-weight: 700; margin-bottom: 6px;">
            <span>✓</span> <span>JRNL-849201 Balanced</span>
          </div>
          <div style="font-family: var(--stokrova-font-mono); color: ${tokens.textSecondary}; font-size: 0.75rem; line-height: 1.45;">
            <div>DR 1010 Cash: <strong style="color: ${tokens.textPrimary};">$86.40</strong></div>
            <div>CR 4010 Sales: <strong style="color: ${tokens.textPrimary};">$86.40</strong></div>
          </div>
          <div style="color: #4ADE80; font-size: 0.6875rem; margin-top: 4px; font-weight: 600;">Delta: $0.00 (Pure Ledger Truth)</div>
        </div>

        <!-- Main Product Window -->
        <div class="command-center-window" role="region" aria-label="Example executive overview" style="position: relative; z-index: 1; background: #161B1E; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 1px rgba(189,150,82,0.3); overflow: hidden; transform: perspective(1200px) rotateX(1.5deg); transition: transform 0.3s ease;">
          
          <!-- Window Chrome Titlebar -->
          <div style="background: ${tokens.surface}; border-bottom: 1px solid ${tokens.border}; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #414F5A; display: inline-block;"></span>
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #333D46; display: inline-block;"></span>
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #293136; display: inline-block;"></span>
            </div>

            <!-- Address Bar Pill -->
            <div class="command-center-addr" style="display: flex; align-items: center; gap: 6px; background: #161B1E; border: 1px solid ${tokens.border}; border-radius: 6px; padding: 3px 12px; font-family: var(--stokrova-font-mono); font-size: 0.75rem; color: ${tokens.textSecondary};">
              <span style="color: ${tokens.primary};">🔒</span>
              <span>app.stokrova.com/command-center</span>
            </div>

            <!-- Branch Selector Chip -->
            <div style="font-size: 0.75rem; font-weight: 600; color: ${tokens.primary}; background: rgba(189,150,82,0.12); border: 1px solid rgba(189,150,82,0.3); border-radius: 4px; padding: 3px 8px; display: flex; align-items: center; gap: 4px;">
              <span>All branches</span> <span style="font-size: 0.65rem;">▾</span>
            </div>
          </div>

          <!-- Window Interior Body -->
          <div style="padding: 20px 16px;">
            <!-- Telemetry Header Row -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #4ADE80; box-shadow: 0 0 8px #4ADE80; display: inline-block;"></span>
                <h3 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: ${tokens.textPrimary}; letter-spacing: -0.01em;">Executive Operations Command</h3>
                <span style="font-size: 0.75rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono);">• 4 Branches</span>
              </div>
              <div style="font-size: 0.6875rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono);">Illustrative platform data.</div>
            </div>

            <!-- 5 KPI Tiles Grid -->
            <div class="kpi-tiles-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px;">
              
              <!-- KPI 1: GMV -->
              <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px 14px;">
                <div style="font-size: 0.6875rem; color: ${tokens.textMuted}; font-weight: 700; text-transform: uppercase;">GMV</div>
                <div class="kpi-num" style="font-size: 1.35rem; font-weight: 900; color: ${tokens.primary}; font-family: var(--stokrova-font-mono); margin: 3px 0;" font-variant-numeric: tabular-nums>$4,850,000</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.6875rem; color: #4ADE80;">▲ +18.4%</span>
                  ${this.renderSparklineSvg(gmvSpark, '#BD9652')}
                </div>
              </div>

              <!-- KPI 2: Net Revenue -->
              <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px 14px;">
                <div style="font-size: 0.6875rem; color: ${tokens.textMuted}; font-weight: 700; text-transform: uppercase;">Net Revenue</div>
                <div class="kpi-num" style="font-size: 1.35rem; font-weight: 900; color: ${tokens.textPrimary}; font-family: var(--stokrova-font-mono); margin: 3px 0;" font-variant-numeric: tabular-nums>$382,000.00</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.6875rem; color: #4ADE80;">▲ +12.1%</span>
                  ${this.renderSparklineSvg(revSpark, '#BD9652')}
                </div>
              </div>

              <!-- KPI 3: Gross Margin -->
              <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px 14px;">
                <div style="font-size: 0.6875rem; color: ${tokens.textMuted}; font-weight: 700; text-transform: uppercase;">Gross Margin</div>
                <div class="kpi-num" style="font-size: 1.35rem; font-weight: 900; color: ${tokens.textPrimary}; font-family: var(--stokrova-font-mono); margin: 3px 0;" font-variant-numeric: tabular-nums>38.50%</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.6875rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono);">3850 bps</span>
                  ${this.renderSparklineSvg(marginSpark, '#BD9652')}
                </div>
              </div>

              <!-- KPI 4: Stockout Risk -->
              <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px 14px;">
                <div style="font-size: 0.6875rem; color: ${tokens.textMuted}; font-weight: 700; text-transform: uppercase;">Stockout Risk</div>
                <div class="kpi-num" style="font-size: 1.35rem; font-weight: 900; color: #4ADE80; font-family: var(--stokrova-font-mono); margin: 3px 0;" font-variant-numeric: tabular-nums>4/100</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.6875rem; color: ${tokens.textMuted};">Low Risk</span>
                  ${this.renderSparklineSvg(riskSpark, '#4ADE80')}
                </div>
              </div>

              <!-- KPI 5: Till Variance -->
              <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px 14px;">
                <div style="font-size: 0.6875rem; color: ${tokens.textMuted}; font-weight: 700; text-transform: uppercase;">Till Variance</div>
                <div class="kpi-num" style="font-size: 1.35rem; font-weight: 900; color: #4ADE80; font-family: var(--stokrova-font-mono); margin: 3px 0;" font-variant-numeric: tabular-nums>$0.00</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.65rem; color: #4ADE80; background: #14291F; border: 1px solid #1E4620; padding: 1px 6px; border-radius: 4px; font-weight: 700;">Balanced</span>
                  <span style="font-size: 0.6875rem; color: ${tokens.textMuted};">6 Tills</span>
                </div>
              </div>

            </div>

            <!-- Revenue Chart & Branch Share Dual Panel -->
            <div class="chart-dual-panel" style="display: grid; grid-template-columns: 2.1fr 1fr; gap: 16px;">
              
              <!-- 12-Month Area Chart -->
              <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 16px 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                  <div style="font-size: 0.8125rem; font-weight: 700; color: ${tokens.textPrimary};">12-Month Net Revenue vs Cost of Goods</div>
                  <div style="display: flex; align-items: center; gap: 12px; font-size: 0.75rem;">
                    <span style="display: inline-flex; align-items: center; gap: 4px; color: ${tokens.primary};">
                      <span style="width: 8px; height: 8px; border-radius: 50%; background: ${tokens.primary};"></span> Revenue
                    </span>
                    <span style="display: inline-flex; align-items: center; gap: 4px; color: #2D8A9E;">
                      <span style="width: 8px; height: 8px; border-radius: 50%; background: #2D8A9E;"></span> Cost of Goods (Teal)
                    </span>
                  </div>
                </div>

                <!-- SVG Area Chart -->
                <div style="width: 100%; overflow-x: auto;">
                  <svg viewBox="0 0 540 180" style="width: 100%; height: auto; display: block;" aria-hidden="true">
                    <defs>
                      <linearGradient id="goldAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#BD9652" stop-opacity="0.32" />
                        <stop offset="100%" stop-color="#BD9652" stop-opacity="0.0" />
                      </linearGradient>
                    </defs>

                    <!-- Horizontal Grid lines -->
                    <line x1="35" y1="30" x2="520" y2="30" stroke="#222830" stroke-dasharray="3,3" />
                    <line x1="35" y1="70" x2="520" y2="70" stroke="#222830" stroke-dasharray="3,3" />
                    <line x1="35" y1="110" x2="520" y2="110" stroke="#222830" stroke-dasharray="3,3" />
                    <line x1="35" y1="150" x2="520" y2="150" stroke="#333D46" />

                    <!-- Axis Labels -->
                    <text x="30" y="34" fill="#7E919F" font-size="9" text-anchor="end" font-family="'JetBrains Mono', monospace">$400k</text>
                    <text x="30" y="74" fill="#7E919F" font-size="9" text-anchor="end" font-family="'JetBrains Mono', monospace">$300k</text>
                    <text x="30" y="114" fill="#7E919F" font-size="9" text-anchor="end" font-family="'JetBrains Mono', monospace">$200k</text>
                    <text x="30" y="154" fill="#7E919F" font-size="9" text-anchor="end" font-family="'JetBrains Mono', monospace">$100k</text>

                    <!-- Gold Area Fill -->
                    <polygon points="35,89.3 79.1,65.5 123.2,80.7 167.3,74.2 211.4,59.0 255.5,52.5 299.5,46.0 343.6,39.5 387.7,37.3 431.8,33.0 475.9,29.5 520,27.8 520,150 35,150" fill="url(#goldAreaGrad)" />

                    <!-- Teal Line: Cost of Goods -->
                    <polyline points="35,129.2 79.1,114.5 123.2,124.0 167.3,119.7 211.4,111.0 255.5,106.7 299.5,102.3 343.6,98.9 387.7,97.1 431.8,94.5 475.9,92.8 520,91.5" fill="none" stroke="#2D8A9E" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />

                    <!-- Gold Line: Net Revenue -->
                    <polyline class="chart-revenue-line" points="35,89.3 79.1,65.5 123.2,80.7 167.3,74.2 211.4,59.0 255.5,52.5 299.5,46.0 343.6,39.5 387.7,37.3 431.8,33.0 475.9,29.5 520,27.8" fill="none" stroke="#BD9652" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

                    <!-- Month X labels (spaced bi-monthly for clean mobile legibility) -->
                    <text x="35" y="166" fill="#7E919F" font-size="9" text-anchor="middle" font-family="'JetBrains Mono', monospace">NOV</text>
                    <text x="123" y="166" fill="#7E919F" font-size="9" text-anchor="middle" font-family="'JetBrains Mono', monospace">JAN</text>
                    <text x="211" y="166" fill="#7E919F" font-size="9" text-anchor="middle" font-family="'JetBrains Mono', monospace">MAR</text>
                    <text x="299" y="166" fill="#7E919F" font-size="9" text-anchor="middle" font-family="'JetBrains Mono', monospace">MAY</text>
                    <text x="387" y="166" fill="#7E919F" font-size="9" text-anchor="middle" font-family="'JetBrains Mono', monospace">JUL</text>
                    <text x="475" y="166" fill="#7E919F" font-size="9" text-anchor="middle" font-family="'JetBrains Mono', monospace">SEP</text>
                    <text x="520" y="166" fill="#BD9652" font-size="9" text-anchor="middle" font-weight="700" font-family="'JetBrains Mono', monospace">OCT</text>

                    <!-- Interactive Data Circle with SVG Tooltip -->
                    <circle cx="520" cy="27.8" r="5" fill="#BD9652" stroke="#161B1E" stroke-width="2">
                      <title>OCT (Current): Net Revenue $382,000.00 | COGS $235,000.00 | Margin 38.5%</title>
                    </circle>
                  </svg>
                </div>
              </div>

              <!-- Branch Share Distribution Bar Panel -->
              <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 16px 14px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="font-size: 0.8125rem; font-weight: 700; color: ${tokens.textPrimary}; margin-bottom: 10px;">Branch Revenue Share</div>
                  
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 3px;">
                        <span style="color: ${tokens.textPrimary}; font-weight: 600;">Lagos Central</span>
                        <span style="font-family: var(--stokrova-font-mono); color: ${tokens.primary};">$152.8k (40%)</span>
                      </div>
                      <div style="height: 5px; background: #293136; border-radius: 3px; overflow: hidden;">
                        <div style="width: 40%; height: 100%; background: ${tokens.primary}; border-radius: 3px;"></div>
                      </div>
                    </div>

                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 3px;">
                        <span style="color: ${tokens.textPrimary}; font-weight: 600;">Abuja Mall</span>
                        <span style="font-family: var(--stokrova-font-mono); color: ${tokens.primary};">$114.6k (30%)</span>
                      </div>
                      <div style="height: 5px; background: #293136; border-radius: 3px; overflow: hidden;">
                        <div style="width: 30%; height: 100%; background: ${tokens.primary}; border-radius: 3px;"></div>
                      </div>
                    </div>

                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 3px;">
                        <span style="color: ${tokens.textPrimary}; font-weight: 600;">Kano DC</span>
                        <span style="font-family: var(--stokrova-font-mono); color: ${tokens.primary};">$68.7k (18%)</span>
                      </div>
                      <div style="height: 5px; background: #293136; border-radius: 3px; overflow: hidden;">
                        <div style="width: 18%; height: 100%; background: ${tokens.primary}; border-radius: 3px;"></div>
                      </div>
                    </div>

                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 3px;">
                        <span style="color: ${tokens.textPrimary}; font-weight: 600;">Port Harcourt</span>
                        <span style="font-family: var(--stokrova-font-mono); color: ${tokens.primary};">$45.8k (12%)</span>
                      </div>
                      <div style="height: 5px; background: #293136; border-radius: 3px; overflow: hidden;">
                        <div style="width: 12%; height: 100%; background: ${tokens.primary}; border-radius: 3px;"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid ${tokens.border}; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #4ADE80;">
                  <span>● Inter-Branch Sync</span>
                  <span style="font-family: var(--stokrova-font-mono);">0ms lag</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- Visually Hidden Table for Full WCAG AAA Accessibility -->
        <table class="sr-only">
          <caption>Executive Command Center Operational Overview</caption>
          <thead>
            <tr><th>Metric</th><th>Current Value</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td>Gross Merchandise Value (GMV)</td><td>$4,850,000.00</td><td>+18.4% vs last month</td></tr>
            <tr><td>Today's Net Revenue</td><td>$382,000.00</td><td>+12.1%</td></tr>
            <tr><td>Gross Margin</td><td>38.50%</td><td>3,850 bps</td></tr>
            <tr><td>Stockout Risk Index</td><td>4 / 100</td><td>Low Risk</td></tr>
            <tr><td>Till Cashier Variance</td><td>$0.00</td><td>Balanced across 6 till sessions</td></tr>
          </tbody>
        </table>
      </div>
    `;
  }

  public renderHeroHtml(): string {
    const tokens = themeTokens[this.theme];
    const commandCenterHtml = this.renderHeroCommandCenterHtml();

    return `
      <section class="landing-section hero-section" style="padding: 56px 32px 48px 32px; text-align: center; max-width: 1080px; margin: 0 auto;">
        <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(189,150,82,0.12); border: 1px solid ${tokens.primary}; padding: 4px 14px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; color: ${tokens.primary}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 20px;">
          <span>⚡ Next-Generation Multi-Branch Retail & Logistics ERP</span>
        </div>
        <h1 class="hero-h1" style="font-size: clamp(2rem, 4.8vw, 3.25rem); font-weight: 900; line-height: 1.15; color: ${tokens.textPrimary}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
          One Unified Operating System for Stores, Warehouses & Finance
        </h1>
        <p class="hero-sub" style="font-size: 1.1rem; line-height: 1.6; color: ${tokens.textSecondary}; max-width: 780px; margin: 0 auto 32px auto;">
          Run your point of sale offline without fear of data loss, manage inventory across hundreds of branches with authoritative FEFO lot tracking, and maintain pure double-entry ledger accuracy.
        </p>
        <div class="hero-cta-btns" style="display: flex; justify-content: center; gap: 14px; flex-wrap: wrap;">
          <button onclick="window.stokrovaCustomerApp.openRegisterModal()" style="min-height: 44px; background: ${tokens.primary}; color: #0E1116; border: none; padding: 12px 28px; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(189,150,82,0.4);">
            Register Your Business Workspace →
          </button>
          <button onclick="window.stokrovaCustomerApp.openLoginModal()" style="min-height: 44px; background: ${tokens.surface}; color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong}; padding: 12px 24px; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer;">
            Staff Sign In to Workspace
          </button>
        </div>

        <!-- The Hero Command Center Window -->
        ${commandCenterHtml}

        <!-- Product Capability & Trust Row -->
        <div style="margin-top: 40px; padding-top: 28px; border-top: 1px solid ${tokens.border};">
          <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${tokens.textMuted}; margin-bottom: 14px;">
            Engineered for High-Volume Retailers, Distributors & Regional Warehouses
          </div>

          <div style="display: flex; justify-content: center; gap: 24px; flex-wrap: wrap; color: ${tokens.textSecondary}; font-size: 0.8125rem;">
            <div><strong style="color: ${tokens.primary}; font-family: var(--stokrova-font-mono);">&lt; 50ms</strong> Hardware Laser Scanner Buffer</div>
            <div><strong style="color: ${tokens.primary}; font-family: var(--stokrova-font-mono);">100%</strong> Balanced Double-Entry Ledgers</div>
            <div><strong style="color: ${tokens.primary}; font-family: var(--stokrova-font-mono);">0</strong> Phantom Stock (Two-Step Transfers)</div>
            <div><strong style="color: ${tokens.primary}; font-family: var(--stokrova-font-mono);">24/7</strong> Offline-First Local Till Engine</div>
          </div>

          <div style="display: flex; justify-content: center; gap: 20px; margin-top: 16px; color: ${tokens.textMuted}; font-size: 0.75rem; flex-wrap: wrap;">
            <div>✓ Offline-First POS Engine</div>
            <div>✓ Multi-Branch Stock Transfers</div>
            <div>✓ Balanced Double-Entry Journals</div>
            <div>✓ Strict Multi-Tenant Isolation</div>
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Section 3: Animated "Money flow" strip answering "What does STOKROVA do?" in 5 seconds.
   */
  public renderMoneyFlowStripHtml(): string {
    const tokens = themeTokens[this.theme];

    const steps = [
      {
        num: '01',
        icon: 'scanner',
        title: 'Scan at till',
        sub: 'Hardware scanner buffer',
        mono: '5011000000018',
      },
      {
        num: '02',
        icon: 'receipt',
        title: 'Sale recorded',
        sub: 'Split tender checkout',
        mono: '$86.40 receipt',
      },
      {
        num: '03',
        icon: 'box',
        title: 'Stock updated',
        sub: 'Authoritative FEFO',
        mono: '-1 unit, Lagos',
      },
      {
        num: '04',
        icon: 'ledger',
        title: 'Ledger balanced',
        sub: 'Double-entry journals',
        mono: 'DR 1010 = CR 4010',
      },
      {
        num: '05',
        icon: 'profit',
        title: 'Owner sees profit',
        sub: 'Live executive margins',
        mono: '+$31.20 margin',
      },
    ];

    const cardsHtml = steps
      .map(
        (st) => `
        <div class="money-flow-step" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 18px 14px; flex: 1; text-align: left; position: relative; transition: all 0.2s ease;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="background: rgba(189,150,82,0.1); border: 1px solid rgba(189,150,82,0.25); border-radius: 6px; padding: 6px; display: inline-flex;">
              ${this.renderSvgIcon(st.icon, 18)}
            </div>
            <span style="font-family: var(--stokrova-font-mono); font-size: 0.6875rem; color: ${tokens.textMuted}; font-weight: 700;">${st.num}</span>
          </div>
          <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 700; color: ${tokens.textPrimary};">${st.title}</h4>
          <div style="font-size: 0.75rem; color: ${tokens.textSecondary}; margin-bottom: 8px;">${st.sub}</div>
          <div style="font-family: var(--stokrova-font-mono); font-size: 0.75rem; color: ${tokens.primary}; background: #161B1E; border: 1px solid ${tokens.border}; border-radius: 4px; padding: 3px 8px; display: inline-block;">
            ${st.mono}
          </div>
        </div>
      `
      )
      .join('');

    return `
      <section id="money-flow" class="landing-section" style="padding: 56px 32px; max-width: 1120px; margin: 0 auto; border-top: 1px solid ${tokens.border};">
        <div style="text-align: center; margin-bottom: 36px;">
          <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(189,150,82,0.12); border: 1px solid ${tokens.primary}; padding: 4px 14px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; color: ${tokens.primary}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px;">
            <span>Universal Financial Pipeline</span>
          </div>
          <h2 class="section-h2" style="font-size: 2.25rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 0 0 10px 0;">Every sale, counted once — everywhere.</h2>
          <p class="section-sub" style="font-size: 1rem; color: ${tokens.textSecondary}; max-width: 680px; margin: 0 auto;">
            From physical counter barcode scan to consolidated general ledger and profit telemetry in under 50 milliseconds.
          </p>
        </div>

        <div class="money-flow-track" style="display: flex; gap: 12px; position: relative;">
          ${cardsHtml}
        </div>
      </section>
    `;
  }

  public renderFeaturesGridHtml(): string {
    const tokens = themeTokens[this.theme];

    return `
      <section id="features" class="landing-section" style="padding: 56px 32px; max-width: 1120px; margin: 0 auto; border-top: 1px solid ${tokens.border};">
        <div style="text-align: center; margin-bottom: 40px;">
          <h2 class="section-h2" style="font-size: 2.25rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 0 0 10px 0;">Built for Rigorous Physical Operations</h2>
          <p class="section-sub" style="font-size: 1rem; color: ${tokens.textSecondary}; max-width: 600px; margin: 0 auto;">Engineered specifically to eliminate inventory shrink, stockout penalties, and till variance.</p>
        </div>

        <div class="features-enhanced-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
          
          <!-- Card 1: Multi-Branch & Inter-Store Transfers -->
          <div class="feature-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 12px; padding: 24px; text-align: left;">
            <div style="background: rgba(189,150,82,0.1); border: 1px solid rgba(189,150,82,0.25); border-radius: 8px; padding: 8px; display: inline-flex; margin-bottom: 14px;">
              ${this.renderSvgIcon('branch', 22)}
            </div>
            <h3 class="card-h3" style="font-size: 1.125rem; font-weight: 700; color: ${tokens.textPrimary}; margin: 0 0 8px 0;">Multi-Branch & Inter-Store Transfers</h3>
            <p style="font-size: 0.875rem; line-height: 1.5; color: ${tokens.textSecondary}; margin: 0 0 12px 0;">
              Execute stock movements between stores and distribution centers with two-step dispatch/receipt and IN-TRANSIT ledger tracking.
            </p>
            <div style="font-size: 0.75rem; font-family: var(--stokrova-font-mono); color: ${tokens.primary}; background: #161B1E; padding: 6px 10px; border-radius: 4px; border: 1px solid ${tokens.border};">
              Dispatch → IN_TRANSIT Custody → Receiving Receipt
            </div>
          </div>

          <!-- Card 2: Offline-Tolerant Point of Sale -->
          <div class="feature-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 12px; padding: 24px; text-align: left;">
            <div style="background: rgba(189,150,82,0.1); border: 1px solid rgba(189,150,82,0.25); border-radius: 8px; padding: 8px; display: inline-flex; margin-bottom: 14px;">
              ${this.renderSvgIcon('pos', 22)}
            </div>
            <h3 class="card-h3" style="font-size: 1.125rem; font-weight: 700; color: ${tokens.textPrimary}; margin: 0 0 8px 0;">Offline-Tolerant Point of Sale</h3>
            <p style="font-size: 0.875rem; line-height: 1.5; color: ${tokens.textSecondary}; margin: 0 0 12px 0;">
              Keep ringing up sales even during internet blackouts. Background sync queues reconcile sales orders and payments when connectivity returns.
            </p>
            <div style="font-size: 0.75rem; font-family: var(--stokrova-font-mono); color: #4ADE80; background: #14291F; padding: 6px 10px; border-radius: 4px; border: 1px solid #1E4620;">
              Zero-Drop SQLite Outbox • Sub-50ms Laser Scans
            </div>
          </div>

          <!-- Card 3: Authoritative FEFO & Serial Lot Control -->
          <div class="feature-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 12px; padding: 24px; text-align: left;">
            <div style="background: rgba(189,150,82,0.1); border: 1px solid rgba(189,150,82,0.25); border-radius: 8px; padding: 8px; display: inline-flex; margin-bottom: 14px;">
              ${this.renderSvgIcon('box', 22)}
            </div>
            <h3 class="card-h3" style="font-size: 1.125rem; font-weight: 700; color: ${tokens.textPrimary}; margin: 0 0 8px 0;">Authoritative FEFO & Serial Lot Control</h3>
            <p style="font-size: 0.875rem; line-height: 1.5; color: ${tokens.textSecondary}; margin: 0 0 12px 0;">
              First-Expired, First-Out picking prevents perishable write-offs. Full chain of custody for serial-numbered and batch items.
            </p>
            <!-- Mini Lot Expiry Table -->
            <div style="background: #161B1E; border: 1px solid ${tokens.border}; border-radius: 6px; padding: 8px 10px; font-size: 0.75rem; font-family: var(--stokrova-font-mono);">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #222830; padding-bottom: 4px; margin-bottom: 4px;">
                <span>LOT-2026-B1</span>
                <span>Exp: 2026-11-15</span>
                <span style="color: #4ADE80; font-weight: 700;">USE FIRST</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: ${tokens.textMuted};">
                <span>LOT-2026-B2</span>
                <span>Exp: 2027-01-20</span>
                <span>STANDBY</span>
              </div>
            </div>
          </div>

          <!-- Card 4 (WIDE FEATURE CARD): Immutable Double-Entry Ledger with Till Reconciliation Visual -->
          <div class="feature-card wide-feature-card" style="grid-column: 1 / -1; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; padding: 28px; text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 20px;">
              
              <div style="flex: 1; min-width: 280px;">
                <div style="background: rgba(189,150,82,0.1); border: 1px solid rgba(189,150,82,0.25); border-radius: 8px; padding: 8px; display: inline-flex; margin-bottom: 14px;">
                  ${this.renderSvgIcon('ledger', 22)}
                </div>
                <h3 class="card-h3" style="font-size: 1.2rem; font-weight: 700; color: ${tokens.textPrimary}; margin: 0 0 8px 0;">Immutable Double-Entry Ledger & Cash Truth</h3>
                <p style="font-size: 0.875rem; line-height: 1.6; color: ${tokens.textSecondary}; margin: 0 0 16px 0;">
                  Every inventory intake, sale, and return automatically posts balanced journal entries (Debits = Credits) in pure integer minor units. Blind session reconciliation enforces financial accountability at every cash drawer.
                </p>

                <!-- General Ledger Entry Box -->
                <div style="background: #161B1E; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px 14px; font-family: var(--stokrova-font-mono); font-size: 0.8125rem;">
                  <div style="color: #4ADE80; font-weight: 700; margin-bottom: 4px;">✓ JRNL-849201 | Automatic Revenue Post</div>
                  <div style="color: ${tokens.textSecondary}; margin-left: 12px;">DR 1010 Cash at Bank: <strong style="color: ${tokens.textPrimary};">$4,250.00</strong></div>
                  <div style="color: ${tokens.textSecondary}; margin-left: 12px;">CR 4010 Retail Revenue: <strong style="color: ${tokens.textPrimary};">$4,250.00</strong></div>
                  <div style="color: #4ADE80; font-size: 0.75rem; margin-left: 12px; margin-top: 4px;">Delta: $0.00 (Balanced Double-Entry Books)</div>
                </div>
              </div>

              <!-- Till Reconciliation Waterfall Visual -->
              <div style="flex: 1; min-width: 300px; background: #161B1E; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 0.8125rem; font-weight: 700; color: ${tokens.textPrimary};">Till Session Reconciliation Visual</span>
                  <span style="font-size: 0.6875rem; color: #4ADE80; background: #14291F; border: 1px solid #1E4620; padding: 2px 8px; border-radius: 9999px; font-weight: 700;">$0.00 VARIANCE ✓</span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 7px; font-family: var(--stokrova-font-mono); font-size: 0.8125rem;">
                  <div style="display: flex; justify-content: space-between; padding: 3px 0;">
                    <span style="color: ${tokens.textSecondary};">Opening Float</span>
                    <span style="color: ${tokens.textPrimary}; font-weight: 600;">$200.00</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 3px 0; color: ${tokens.primary};">
                    <span>(+) Net Cash Sales</span>
                    <span style="font-weight: 700;">+$4,250.00</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 3px 0; color: #F87171;">
                    <span>(-) Paid Out / Expense</span>
                    <span style="font-weight: 600;">-$150.00</span>
                  </div>
                  <div style="border-top: 1px solid ${tokens.border}; padding-top: 6px; display: flex; justify-content: space-between; color: #2D8A9E; font-weight: 700;">
                    <span>(=) Expected Drawer Cash</span>
                    <span>$4,300.00</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 3px 0; color: ${tokens.textPrimary}; font-weight: 700;">
                    <span>Actual Blind Closing Count</span>
                    <span>$4,300.00</span>
                  </div>
                </div>

                <!-- Waterfall Progress Bar -->
                <div style="height: 6px; background: #293136; border-radius: 3px; overflow: hidden; margin-top: 10px; display: flex;">
                  <div style="width: 5%; background: #7E919F;" title="Float $200"></div>
                  <div style="width: 95%; background: ${tokens.primary};" title="Cash Sales $4,250"></div>
                </div>
              </div>

            </div>
          </div>

          <!-- Card 5: Visual Workflow Automation -->
          <div class="feature-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 12px; padding: 24px; text-align: left;">
            <div style="background: rgba(189,150,82,0.1); border: 1px solid rgba(189,150,82,0.25); border-radius: 8px; padding: 8px; display: inline-flex; margin-bottom: 14px;">
              ${this.renderSvgIcon('dag', 22)}
            </div>
            <h3 class="card-h3" style="font-size: 1.125rem; font-weight: 700; color: ${tokens.textPrimary}; margin: 0 0 8px 0;">Visual DAG Workflow Automation</h3>
            <p style="font-size: 0.875rem; line-height: 1.5; color: ${tokens.textSecondary}; margin: 0 0 12px 0;">
              Automate approvals, stock thresholds, and purchase orders with reliable multi-step business logic.
            </p>
            <div style="font-size: 0.75rem; font-family: var(--stokrova-font-mono); color: ${tokens.primary}; background: #161B1E; padding: 6px 10px; border-radius: 4px; border: 1px solid ${tokens.border};">
              Threshold Trigger → Policy Validation → Branch Manager Approval
            </div>
          </div>

          <!-- Card 6: Role-Based Access & Security -->
          <div class="feature-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 12px; padding: 24px; text-align: left;">
            <div style="background: rgba(189,150,82,0.1); border: 1px solid rgba(189,150,82,0.25); border-radius: 8px; padding: 8px; display: inline-flex; margin-bottom: 14px;">
              ${this.renderSvgIcon('shield', 22)}
            </div>
            <h3 class="card-h3" style="font-size: 1.125rem; font-weight: 700; color: ${tokens.textPrimary}; margin: 0 0 8px 0;">Role-Based Access & Security</h3>
            <p style="font-size: 0.875rem; line-height: 1.5; color: ${tokens.textSecondary}; margin: 0 0 12px 0;">
              Enforce branch-scoped permissions across Cashiers, Store Managers, Warehouse Pickers, and Business Owners.
            </p>
            <div style="font-size: 0.75rem; font-family: var(--stokrova-font-mono); color: #4ADE80; background: #14291F; padding: 6px 10px; border-radius: 4px; border: 1px solid #1E4620;">
              Branch-Scoped Access & Permissions
            </div>
          </div>

        </div>
      </section>
    `;
  }

  public renderArchitectureSectionHtml(): string {
    const tokens = themeTokens[this.theme];
    return `
      <section id="architecture" class="landing-section" style="padding: 56px 32px; max-width: 1120px; margin: 0 auto; border-top: 1px solid ${tokens.border};">
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(189,150,82,0.12); border: 1px solid ${tokens.primary}; padding: 4px 14px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; color: ${tokens.primary}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px;">
            <span>Multi-Company & Multi-Branch Topology</span>
          </div>
          <h2 class="section-h2" style="font-size: 2.25rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 0 0 10px 0;">Authoritative Inventory Across Every Location</h2>
          <p class="section-sub" style="font-size: 1rem; color: ${tokens.textSecondary}; max-width: 680px; margin: 0 auto;">
            From parent holding companies and bonded regional warehouses to high-street retail stores and pop-up locations, STOKROVA maintains unified inventory integrity and real-time in-transit tracking.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 32px;">
          
          <!-- Card 1: Multi-Entity Holding Hierarchy with Visual Tree Diagram -->
          <div class="arch-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 12px; padding: 24px;">
            <div style="background: rgba(189,150,82,0.1); border: 1px solid rgba(189,150,82,0.25); border-radius: 8px; padding: 8px; display: inline-flex; margin-bottom: 10px;">
              ${this.renderSvgIcon('holding', 22)}
            </div>
            <h3 class="card-h3" style="font-size: 1.1rem; font-weight: 700; color: ${tokens.textPrimary}; margin: 0 0 6px 0;">Multi-Entity Holding Hierarchy</h3>
            <p style="font-size: 0.85rem; line-height: 1.5; color: ${tokens.textSecondary}; margin: 0 0 14px 0;">
              Manage multiple trading entities, legal subsidiaries, and operating currencies under a single tenant with automatic intercompany elimination.
            </p>
            
            <!-- Visual Branch Tree Diagram -->
            <div style="background: #161B1E; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px; font-size: 0.75rem; font-family: var(--stokrova-font-mono);">
              <div style="color: ${tokens.primary}; font-weight: 700; margin-bottom: 6px;">🏛️ Enterprise Group Holdings</div>
              <div style="margin-left: 12px; border-left: 2px solid ${tokens.borderStrong}; padding-left: 10px; display: flex; flex-direction: column; gap: 6px;">
                <div>
                  <div style="color: ${tokens.textPrimary}; font-weight: 600;">├── Primary Retail Subsidiary (GBP)</div>
                  <div style="margin-left: 12px; color: ${tokens.textMuted}; font-size: 0.7rem;">• London Flagship: <strong style="color: ${tokens.primary};">$184k/mo</strong></div>
                  <div style="margin-left: 12px; color: ${tokens.textMuted}; font-size: 0.7rem;">• Manchester Store: $92k/mo</div>
                </div>
                <div>
                  <div style="color: ${tokens.textPrimary}; font-weight: 600;">└── Regional Logistics Entity (USD/NGN)</div>
                  <div style="margin-left: 12px; color: ${tokens.textMuted}; font-size: 0.7rem;">• Lagos Central: <strong style="color: ${tokens.primary};">$153k/mo</strong></div>
                  <div style="margin-left: 12px; color: ${tokens.textMuted}; font-size: 0.7rem;">• Abuja Distribution Hub: $115k/mo</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: Two-Step In-Transit Transfers with 3-Stage Pipeline Diagram -->
          <div class="arch-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 12px; padding: 24px;">
            <div style="background: rgba(189,150,82,0.1); border: 1px solid rgba(189,150,82,0.25); border-radius: 8px; padding: 8px; display: inline-flex; margin-bottom: 10px;">
              ${this.renderSvgIcon('truck', 22)}
            </div>
            <h3 class="card-h3" style="font-size: 1.1rem; font-weight: 700; color: ${tokens.textPrimary}; margin: 0 0 6px 0;">Two-Step In-Transit Transfers</h3>
            <p style="font-size: 0.85rem; line-height: 1.5; color: ${tokens.textSecondary}; margin: 0 0 14px 0;">
              Zero phantom stock. When goods leave a central distribution center, they sit in an audited IN-TRANSIT GL account until received and verified by the destination branch.
            </p>

            <!-- 3-Step Milestone Pipeline (<ol>) -->
            <ol style="list-style: none; padding: 0; margin: 0; background: #161B1E; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px; font-size: 0.75rem; font-family: var(--stokrova-font-mono); display: flex; flex-direction: column; gap: 8px;">
              <li style="display: flex; align-items: center; gap: 8px;">
                <span style="background: ${tokens.primary}; color: #0E1116; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800;">1</span>
                <span>Central DC Dispatch (Scan Barcode)</span>
              </li>
              <li style="display: flex; align-items: center; gap: 8px; color: ${tokens.primary};">
                <span style="background: rgba(189,150,82,0.2); border: 1px solid ${tokens.primary}; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800;">2</span>
                <span>In-Transit (GL Custody Account)</span>
              </li>
              <li style="display: flex; align-items: center; gap: 8px; color: #4ADE80;">
                <span style="background: #14291F; border: 1px solid #1E4620; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800;">3</span>
                <span>Blind Receiving Count (20/20 LAPTOP-PRO-16 ✓)</span>
              </li>
            </ol>
          </div>

          <!-- Card 3: Multi-Tenant Security & Isolation -->
          <div class="arch-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 12px; padding: 24px;">
            <div style="background: rgba(189,150,82,0.1); border: 1px solid rgba(189,150,82,0.25); border-radius: 8px; padding: 8px; display: inline-flex; margin-bottom: 10px;">
              ${this.renderSvgIcon('lock', 22)}
            </div>
            <h3 class="card-h3" style="font-size: 1.1rem; font-weight: 700; color: ${tokens.textPrimary}; margin: 0 0 6px 0;">Multi-Tenant Security & Isolation</h3>
            <p style="font-size: 0.85rem; line-height: 1.5; color: ${tokens.textSecondary}; margin: 0 0 14px 0;">
              Every subscriber's catalog, financial records, orders, and customer data are strictly partitioned. Complete organizational privacy with zero cross-business data leakage.
            </p>
            <div style="font-size: 0.75rem; font-family: var(--stokrova-font-mono); color: #4ADE80; background: #14291F; padding: 10px 12px; border-radius: 6px; border: 1px solid #1E4620; line-height: 1.45;">
              <div>✓ Enterprise Privacy Protection Active</div>
              <div>✓ Encrypted Offline Data Protection</div>
              <div>✓ Dedicated Business Isolation</div>
            </div>
          </div>

        </div>
      </section>
    `;
  }

  public renderPosSectionHtml(): string {
    const tokens = themeTokens[this.theme];
    return `
      <section id="pos" class="landing-section" style="padding: 56px 32px; max-width: 1120px; margin: 0 auto; border-top: 1px solid ${tokens.border};">
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(189,150,82,0.12); border: 1px solid ${tokens.primary}; padding: 4px 14px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; color: ${tokens.primary}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px;">
            <span>High-Speed Retail Checkout</span>
          </div>
          <h2 class="section-h2" style="font-size: 2.25rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 0 0 10px 0;">Offline-Tolerant Point of Sale Architecture</h2>
          <p class="section-sub" style="font-size: 1rem; color: ${tokens.textSecondary}; max-width: 680px; margin: 0 auto;">
            Engineered for high-volume retail counters. Ring up sales at the speed of light with hardware laser scanner detection, split tenders, and continuous offline operation.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 32px;">
          <div class="pos-benefit-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 18px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: ${tokens.primary};">
              ${this.renderSvgIcon('bolt', 18)}
              <span style="font-weight: 700; font-size: 0.95rem;">Sub-50ms Scans</span>
            </div>
            <h4 style="margin: 0 0 4px 0; font-size: 0.9rem; color: ${tokens.textPrimary}; font-weight: 700;">Hardware Scanner Buffer</h4>
            <p style="margin: 0; font-size: 0.8rem; color: ${tokens.textSecondary}; line-height: 1.4;">Automatic distinction between keyboard input and laser barcode scanner bursts without dropping focus.</p>
          </div>

          <div class="pos-benefit-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 18px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: ${tokens.primary};">
              ${this.renderSvgIcon('card', 18)}
              <span style="font-weight: 700; font-size: 0.95rem;">Split Tender</span>
            </div>
            <h4 style="margin: 0 0 4px 0; font-size: 0.9rem; color: ${tokens.textPrimary}; font-weight: 700;">Multi-Payment Splitting</h4>
            <p style="margin: 0; font-size: 0.8rem; color: ${tokens.textSecondary}; line-height: 1.4;">Accept multiple payment methods per ticket (cash + card + gift card) computed in pure integer minor units.</p>
          </div>

          <div class="pos-benefit-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 18px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: ${tokens.primary};">
              ${this.renderSvgIcon('queue', 18)}
              <span style="font-weight: 700; font-size: 0.95rem;">Zero-Drop Local Queue</span>
            </div>
            <h4 style="margin: 0 0 4px 0; font-size: 0.9rem; color: ${tokens.textPrimary}; font-weight: 700;">Reliable Offline Storage</h4>
            <p style="margin: 0; font-size: 0.8rem; color: ${tokens.textSecondary}; line-height: 1.4;">Transactions persist to local indexed storage with UUID idempotency keys, syncing seamlessly upon reconnect.</p>
          </div>

          <div class="pos-benefit-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 18px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: ${tokens.primary};">
              ${this.renderSvgIcon('receipt', 18)}
              <span style="font-weight: 700; font-size: 0.95rem;">Thermal Receipts</span>
            </div>
            <h4 style="margin: 0 0 4px 0; font-size: 0.9rem; color: ${tokens.textPrimary}; font-weight: 700;">ESC/POS & Verification</h4>
            <p style="margin: 0; font-size: 0.8rem; color: ${tokens.textSecondary}; line-height: 1.4;">Standard 80mm & 58mm thermal output featuring tamper-evident QR verification and itemized tax breakdowns.</p>
          </div>
        </div>

        <!-- Interactive Till & Receipt Preview Card (Dual Tabbed) -->
        <div class="pos-preview-wrapper" style="background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
            <div>
              <h3 class="card-h3" style="margin: 0 0 4px 0; font-size: 1.15rem; color: ${tokens.textPrimary}; font-weight: 800;">Experience the POS in Action</h3>
              <p style="margin: 0; font-size: 0.85rem; color: ${tokens.textSecondary};">Simulate an authentic high-speed retail checkout with split tenders and live 80mm receipt generation.</p>
            </div>

            <!-- Tab Buttons (Concise touch-accessible labels >= 44px) -->
            <div style="display: flex; gap: 6px; background: #161B1E; padding: 4px; border-radius: 8px; border: 1px solid ${tokens.border};">
              <button id="btn-tab-pos-scanner" class="pos-tab-btn" onclick="window.stokrovaCustomerApp.switchPosTab('scanner')" style="min-height: 44px; background: ${tokens.primary}; color: #0E1116; border: none; padding: 8px 14px; border-radius: 6px; font-size: 0.8125rem; font-weight: 700; cursor: pointer;">
                Scanner & Cart
              </button>
              <button id="btn-tab-pos-receipt" class="pos-tab-btn" onclick="window.stokrovaCustomerApp.switchPosTab('receipt')" style="min-height: 44px; background: transparent; color: ${tokens.textSecondary}; border: none; padding: 8px 14px; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; cursor: pointer;">
                Thermal Receipt
              </button>
            </div>
          </div>

          <!-- Tab Content 1: Scanner & Split Tender Cart -->
          <div id="tab-content-scanner" style="display: block;">
            <div class="chart-dual-panel" style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; align-items: start;">
              
              <!-- Left: Live Scanner Buffer & Cart Table -->
              <div style="background: #161B1E; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 16px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: ${tokens.primary}; text-transform: uppercase;">Laser Buffer Ready:</span>
                  <div style="display: inline-flex; align-items: center; gap: 6px; background: #222830; border: 1px solid #333D46; padding: 4px 8px; border-radius: 4px; font-family: var(--stokrova-font-mono); font-size: 0.75rem; color: #4ADE80;">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: #4ADE80; animation: pulseDot 1.5s infinite;"></span>
                    <span>5011000000018 (Pro 16 Laptop)</span>
                  </div>
                </div>

                <!-- 3 Line Items Table -->
                <table style="width: 100%; border-collapse: collapse; font-size: 0.8125rem; font-family: var(--stokrova-font-mono);">
                  <thead>
                    <tr style="border-bottom: 1px solid ${tokens.border}; color: ${tokens.textMuted}; text-align: left; font-size: 0.7rem;">
                      <th style="padding: 6px 0;">ITEM / SKU</th>
                      <th style="padding: 6px 0; text-align: center;">QTY</th>
                      <th style="padding: 6px 0; text-align: right;">PRICE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid #222830; color: ${tokens.textPrimary};">
                      <td style="padding: 8px 0;">Pro 16 Workstation Laptop<br><span style="color: ${tokens.textMuted}; font-size: 0.7rem;">SKU: LAPTOP-PRO-16</span></td>
                      <td style="padding: 8px 0; text-align: center;">1</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 700;">$2,499.00</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #222830; color: ${tokens.textPrimary};">
                      <td style="padding: 8px 0;">Ultra 5G Smartphone<br><span style="color: ${tokens.textMuted}; font-size: 0.7rem;">SKU: PHONE-ULTRA-5G</span></td>
                      <td style="padding: 8px 0; text-align: center;">1</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 700;">$999.00</td>
                    </tr>
                    <tr style="color: ${tokens.textPrimary};">
                      <td style="padding: 8px 0;">Oxford Cotton Shirt<br><span style="color: ${tokens.textMuted}; font-size: 0.7rem;">SKU: SHIRT-OXFORD-BLU</span></td>
                      <td style="padding: 8px 0; text-align: center;">2</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 700;">$130.00</td>
                    </tr>
                  </tbody>
                </table>

                <div aria-live="polite" class="sr-only" id="pos-aria-announcer">Current till ticket subtotal $3,628.00</div>
              </div>

              <!-- Right: Split Payment Summary Box -->
              <div style="background: #161B1E; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 16px; font-family: var(--stokrova-font-mono);">
                <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-bottom: 4px; font-weight: 700;">TICKET SETTLEMENT</div>
                <div style="font-size: 1.5rem; font-weight: 900; color: ${tokens.textPrimary}; margin-bottom: 10px;" font-variant-numeric: tabular-nums>$3,628.00</div>

                <div style="border-top: 1px solid ${tokens.border}; padding-top: 8px; font-size: 0.75rem; display: flex; flex-direction: column; gap: 5px;">
                  <div style="display: flex; justify-content: space-between; color: ${tokens.textSecondary};">
                    <span>Subtotal:</span> <span>$3,628.00</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; color: ${tokens.textSecondary};">
                    <span>Tax (0.00% VAT Ex.):</span> <span>$0.00</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; color: ${tokens.primary}; font-weight: 700;">
                    <span>💳 Visa Card Tender:</span> <span>$3,000.00</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; color: #4ADE80; font-weight: 700;">
                    <span>💵 Cash Collected:</span> <span>$628.00</span>
                  </div>
                </div>

                <div style="margin-top: 12px; background: #14291F; border: 1px solid #1E4620; padding: 6px 8px; border-radius: 6px; font-size: 0.6875rem; color: #4ADE80; text-align: center;">
                  📴 Offline Outbox: 3 sales queued locally in SQLite, syncing on connect
                </div>
              </div>

            </div>
          </div>

          <!-- Tab Content 2: 80mm Thermal Receipt (ESC/POS) -->
          <div id="tab-content-receipt" style="display: none;">
            <div style="display: flex; justify-content: center; padding: 8px 0;">
              <!-- 80mm Receipt Container with Serrated Bottom Edge -->
              <div class="thermal-receipt-paper" style="width: 100%; max-width: 300px; background: #FFFFFF; color: #1E2428; border-radius: 4px; padding: 20px 16px 28px 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-family: var(--stokrova-font-mono); font-size: 0.75rem; line-height: 1.4; position: relative;">
                
                <div style="text-align: center; border-bottom: 1px dashed #ACB8C3; padding-bottom: 10px; margin-bottom: 10px;">
                  <div style="font-weight: 900; font-size: 0.9rem; letter-spacing: 0.05em;">RETAIL COMMERCE ENTERPRISE</div>
                  <div style="font-size: 0.7rem; color: #586069;">Main Flagship Facility #01</div>
                  <div style="font-size: 0.65rem; color: #586069;">VAT ID: GB 000 000 000</div>
                  <div style="font-size: 0.65rem; color: #586069; margin-top: 2px;">Tx: POS-SALE-10482 • Cashier: Terminal Active</div>
                </div>

                <div style="border-bottom: 1px dashed #ACB8C3; padding-bottom: 10px; margin-bottom: 10px;">
                  <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 4px;">
                    <span>1x Pro 16 Workstation Laptop</span>
                    <span>$2,499.00</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 4px;">
                    <span>1x Ultra 5G Smartphone</span>
                    <span>$999.00</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-weight: 700;">
                    <span>2x Oxford Cotton Shirt</span>
                    <span>$130.00</span>
                  </div>
                </div>

                <div style="border-bottom: 1px dashed #ACB8C3; padding-bottom: 10px; margin-bottom: 10px;">
                  <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: #586069;">
                    <span>SUBTOTAL</span> <span>$3,628.00</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: #586069;">
                    <span>TAX (0.00%)</span> <span>$0.00</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 1.05rem; margin-top: 4px;">
                    <span>TOTAL</span> <span>$3,628.00</span>
                  </div>
                </div>

                <!-- SVG QR Code with Integrity Hash -->
                <div style="text-align: center; margin-top: 10px;">
                  <svg width="78" height="78" viewBox="0 0 84 84" style="margin: 0 auto; display: block;" aria-hidden="true">
                    <rect width="84" height="84" fill="#FFFFFF" />
                    <rect x="6" y="6" width="24" height="24" fill="#1E2428" />
                    <rect x="10" y="10" width="16" height="16" fill="#FFFFFF" />
                    <rect x="14" y="14" width="8" height="8" fill="#1E2428" />
                    
                    <rect x="54" y="6" width="24" height="24" fill="#1E2428" />
                    <rect x="58" y="10" width="16" height="16" fill="#FFFFFF" />
                    <rect x="62" y="14" width="8" height="8" fill="#1E2428" />
                    
                    <rect x="6" y="54" width="24" height="24" fill="#1E2428" />
                    <rect x="10" y="58" width="16" height="16" fill="#FFFFFF" />
                    <rect x="14" y="62" width="8" height="8" fill="#1E2428" />

                    <rect x="36" y="10" width="12" height="6" fill="#1E2428" />
                    <rect x="36" y="24" width="6" height="12" fill="#1E2428" />
                    <rect x="44" y="40" width="16" height="6" fill="#1E2428" />
                    <rect x="36" y="54" width="8" height="18" fill="#1E2428" />
                    <rect x="54" y="48" width="18" height="6" fill="#1E2428" />
                    <rect x="64" y="62" width="12" height="12" fill="#1E2428" />
                  </svg>
                  <div style="font-size: 0.6rem; color: #586069; margin-top: 4px;">SHA256: 0x9f4a82...e12b</div>
                  <div style="font-size: 0.65rem; font-weight: 700; margin-top: 2px; color: #1E2428;">OFFICIAL TAMPER-EVIDENT FISCAL RECEIPT</div>
                </div>

              </div>
            </div>
          </div>

          <!-- Bottom Action Row -->
          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid ${tokens.border}; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
            <div style="font-size: 0.8125rem; color: ${tokens.textSecondary};">
              Ready to test in-browser? Open the interactive simulation with 28 live operations modules.
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button onclick="window.stokrovaCustomerApp.confirmOpenDemo()" style="min-height: 44px; background: ${tokens.primary}; color: #0E1116; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 0.875rem; cursor: pointer; box-shadow: 0 2px 8px rgba(189,150,82,0.3); touch-action: manipulation;">
                Launch Interactive Workspace →
              </button>
              <button onclick="window.stokrovaCustomerApp.openRegisterModal()" style="min-height: 44px; background: transparent; color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong}; padding: 12px 20px; border-radius: 6px; font-weight: 600; font-size: 0.875rem; cursor: pointer; touch-action: manipulation;">
                Register Your Business →
              </button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Section 5: "Who It's For" Row to prevent solo merchants from assuming STOKROVA is only enterprise bloat.
   */
  public renderWhoItsForSectionHtml(): string {
    const tokens = themeTokens[this.theme];

    const profiles = [
      {
        badge: 'SINGLE BOUTIQUE',
        title: 'Single Shop & Retail Store',
        desc: 'Frictionless checkout and automatic bookkeeping for high-street boutiques, pop-ups, and independent merchants.',
        bullets: [
          'Sub-50ms touch POS register',
          'Standard thermal receipt output',
          'Zero manual spreadsheet logging',
          'Offline operation with local SQLite storage',
        ],
      },
      {
        badge: 'EXPANDING BRAND',
        title: 'Growing Multi-Store Chain',
        desc: 'Multi-branch visibility and two-step stock routing for brands opening second, third, or tenth store locations.',
        bullets: [
          'Inter-store transfers & IN-TRANSIT tracking',
          'FEFO lot expiry & serial warranty control',
          'Centralized pricing & customer accounts',
          'Cashier till session variance auditing',
        ],
      },
      {
        badge: 'REGIONAL ENTERPRISE',
        title: 'Distribution & Warehouse Group',
        desc: 'Unified multi-company holding hierarchy for large-scale FMCG distribution, cold stores, and bonded warehouses.',
        bullets: [
          'Parent holding intercompany elimination',
          'Visual multi-step workflow automation',
          'Wave-picking & dock receiving checklists',
          'Enterprise organization privacy & security',
        ],
      },
    ];

    const cardsHtml = profiles
      .map(
        (p) => `
        <div class="who-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 12px; padding: 24px; text-align: left; display: flex; flex-direction: column;">
          <div style="font-size: 0.6875rem; font-weight: 800; color: ${tokens.primary}; letter-spacing: 0.08em; margin-bottom: 6px;">${p.badge}</div>
          <h3 class="card-h3" style="font-size: 1.15rem; font-weight: 700; color: ${tokens.textPrimary}; margin: 0 0 6px 0;">${p.title}</h3>
          <p style="font-size: 0.85rem; line-height: 1.5; color: ${tokens.textSecondary}; margin: 0 0 16px 0; flex-grow: 1;">${p.desc}</p>
          <ul style="list-style: none; padding: 0; margin: 0; border-top: 1px solid ${tokens.border}; padding-top: 12px; font-size: 0.8125rem; color: ${tokens.textSecondary}; display: flex; flex-direction: column; gap: 7px;">
            ${p.bullets.map((b) => `<li style="display: flex; align-items: center; gap: 8px;"><span style="color: ${tokens.primary}; font-weight: 800;">✓</span> <span>${b}</span></li>`).join('')}
          </ul>
        </div>
      `
      )
      .join('');

    return `
      <section id="who-its-for" class="landing-section" style="padding: 56px 32px; max-width: 1120px; margin: 0 auto; border-top: 1px solid ${tokens.border};">
        <div style="text-align: center; margin-bottom: 36px;">
          <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(189,150,82,0.12); border: 1px solid ${tokens.primary}; padding: 4px 14px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; color: ${tokens.primary}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px;">
            <span>Configurable Operational Scale</span>
          </div>
          <h2 class="section-h2" style="font-size: 2.25rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 0 0 10px 0;">Engineered to Fit Your Operational Scale</h2>
          <p class="section-sub" style="font-size: 1rem; color: ${tokens.textSecondary}; max-width: 620px; margin: 0 auto;">
            The business does not adapt itself to our software. Our software adapts itself to the business.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
          ${cardsHtml}
        </div>
      </section>
    `;
  }

  public renderPricingSectionHtml(): string {
    const tokens = themeTokens[this.theme];
    const plans = this.getPricingPlans();

    const plansHtml = plans
      .map((p) => {
        const isRec = p.recommended;
        const borderStyle = isRec ? `2px solid ${tokens.primary}` : `1px solid ${tokens.border}`;
        const badgeHtml = p.badge
          ? `<span style="background: ${isRec ? tokens.primary : tokens.cardHover}; color: ${isRec ? '#0E1116' : tokens.textPrimary}; font-size: 0.7rem; font-weight: 800; padding: 3px 10px; border-radius: 9999px; letter-spacing: 0.06em;">${p.badge}</span>`
          : '';

        const featuresList = p.features
          .map(
            (feat) => `
            <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 0.85rem; color: ${tokens.textSecondary};">
              <span style="color: ${tokens.primary}; font-weight: 800;">✓</span>
              <span>${feat}</span>
            </li>
          `
          )
          .join('');

        const enterpriseContactLink =
          p.id === 'enterprise'
            ? `<div style="text-align: center; margin-top: 14px; font-size: 0.75rem;"><a href="mailto:solutions@stokrova.com?subject=Enterprise%20Plan%20Inquiry" style="color: ${tokens.primary}; text-decoration: none; font-weight: 600;">Talk to our solutions architect team →</a></div>`
            : '';

        return `
          <div class="pricing-card" style="background: ${tokens.surface}; border: ${borderStyle}; border-radius: 12px; padding: 28px 24px; display: flex; flex-direction: column; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <h3 style="font-size: 1.25rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 0;">${p.name}</h3>
              ${badgeHtml}
            </div>
            <!-- Ensured description text uses slate-300 #ACB8C3 for WCAG AAA 7:1+ contrast -->
            <p style="font-size: 0.8125rem; color: #ACB8C3; min-height: 40px; margin: 0 0 16px 0; line-height: 1.5;">${p.description}</p>
            <div style="margin-bottom: 20px;">
              <span class="pricing-card-price" style="font-size: 2.25rem; font-weight: 900; color: ${tokens.textPrimary}; font-family: var(--stokrova-font-mono);" font-variant-numeric: tabular-nums>${formatCurrencyMinor(p.monthlyPriceMinor, p.currency)}</span>
              <span style="font-size: 0.875rem; color: ${tokens.textMuted};"> / month</span>
            </div>
            <button onclick="window.stokrovaCustomerApp.openRegisterModal('${p.id}')" style="min-height: 44px; background: ${isRec ? tokens.primary : 'transparent'}; color: ${isRec ? '#0E1116' : tokens.textPrimary}; border: ${isRec ? 'none' : `1px solid ${tokens.borderStrong}`}; padding: 12px 20px; border-radius: 6px; font-size: 0.875rem; font-weight: 700; cursor: pointer; margin-bottom: 20px; transition: all 0.15s ease;">
              Choose ${p.name} →
            </button>
            <ul style="list-style: none; padding: 0; margin: 0; border-top: 1px solid ${tokens.border}; padding-top: 18px; flex-grow: 1;">
              ${featuresList}
            </ul>
            ${enterpriseContactLink}
          </div>
        `;
      })
      .join('');

    return `
      <section id="pricing" class="landing-section" style="padding: 56px 32px; max-width: 1120px; margin: 0 auto; border-top: 1px solid ${tokens.border};">
        <div style="text-align: center; margin-bottom: 40px;">
          <h2 class="section-h2" style="font-size: 2.25rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 0 0 10px 0;">Simple, Transparent SaaS Pricing</h2>
          <p class="section-sub" style="font-size: 1rem; color: ${tokens.textSecondary}; max-width: 600px; margin: 0 auto;">No hidden transaction percentages. Select the tier that matches your physical operational scale.</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; align-items: stretch;">
          ${plansHtml}
        </div>
        <p style="text-align: center; margin: 22px auto 0; max-width: 640px; font-size: 0.8125rem; color: #ACB8C3; line-height: 1.6;">✓ Every plan starts with a <strong style="color: ${tokens.textPrimary};">30-day free trial</strong> — no credit card required. After your first month, the plan you chose is billed from the Plan &amp; Billing page in your workspace.</p>
      </section>
    `;
  }

  /**
   * Section 6: Native HTML5 <details>/<summary> FAQ accordion for enterprise objection handling.
   */
  public renderFaqSectionHtml(): string {
    const tokens = themeTokens[this.theme];

    const faqs = [
      {
        q: 'How does STOKROVA maintain 100% uptime when retail internet goes down?',
        a: 'STOKROVA is built with an offline-first transactional engine. All counter actions, barcode scans, and split payments persist to encrypted local IndexedDB and SQLite outbox queues with deterministic UUID idempotency keys. When connection returns, transactions sync automatically with zero dropped records or duplicate charges.',
      },
      {
        q: 'How does STOKROVA guarantee our business and financial data is kept isolated?',
        a: 'Your business and financial data are strictly segregated at all times. Every transaction, product catalog, and customer record is accessible only by your authorized team members, with complete data privacy and enterprise protection.',
      },
      {
        q: 'What receipt printers, barcode scanners, and counter hardware are supported?',
        a: 'Universal standard retail hardware: ESC/POS thermal printers (both 80mm and 58mm via USB, Network, and Bluetooth), hardware laser barcode scanners with high-speed input buffering (sub-50ms scans), and automated cash drawers via standard RJ11/RJ12 pulses.',
      },
      {
        q: 'Can we import our existing inventory catalogs and historical customer records?',
        a: 'Yes. Built-in batch CSV/Excel import tools with intelligent column matching allow you to migrate thousands of products, variants, serial lots, and customer credit balances in seconds. REST and GraphQL bulk APIs are also available for enterprise systems.',
      },
      {
        q: 'Can we upgrade, downgrade, or add branches at any time?',
        a: 'Yes. You can add new branch stores, till sessions, or regional distribution warehouses directly from your business workspace settings. Subscription changes are calculated with pure integer minor unit precision and prorated down to the second.',
      },
      {
        q: 'How does live business onboarding and workspace setup work?',
        a: 'When you register your business, STOKROVA instantly provisions your dedicated organization workspace, configures your primary store branch and POS till, sets up your chart of accounts, and equips you to start ringing sales, managing inventory, and inviting staff immediately.',
      },
      {
        q: 'How does the interactive demo workspace work?',
        a: 'The interactive workspace provides a fully live, in-browser simulated environment of STOKROVA. You can ring items at the POS, scan test barcodes, inspect double-entry general ledger postings, and test inter-branch transfers with zero real financial exposure.',
      },
    ];

    const itemsHtml = faqs
      .map(
        (f) => `
        <details class="faq-details" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 14px 18px; transition: border-color 0.2s ease;">
          <summary style="font-size: 0.95rem; font-weight: 700; color: ${tokens.textPrimary}; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; min-height: 48px; padding: 2px 0;">
            <span style="padding-right: 12px; line-height: 1.4;">${f.q}</span>
            <span style="color: ${tokens.primary}; font-weight: 800; font-size: 1.1rem; flex-shrink: 0; width: 24px; text-align: center;">+</span>
          </summary>
          <div style="font-size: 0.875rem; line-height: 1.6; color: ${tokens.textSecondary}; margin-top: 10px; border-top: 1px solid ${tokens.border}; padding-top: 10px;">
            ${f.a}
          </div>
        </details>
      `
      )
      .join('');

    return `
      <section id="faq" class="landing-section" style="padding: 56px 32px; max-width: 900px; margin: 0 auto; border-top: 1px solid ${tokens.border};">
        <div style="text-align: center; margin-bottom: 36px;">
          <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(189,150,82,0.12); border: 1px solid ${tokens.primary}; padding: 4px 14px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; color: ${tokens.primary}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px;">
            <span>Clear Answers</span>
          </div>
          <h2 class="section-h2" style="font-size: 2.25rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 0 0 10px 0;">Frequently Asked Questions</h2>
          <p class="section-sub" style="font-size: 1rem; color: ${tokens.textSecondary}; max-width: 600px; margin: 0 auto;">Everything you need to know about offline reliability, data sovereignty, and hardware compatibility.</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${itemsHtml}
        </div>
      </section>
    `;
  }

  /**
   * Section 7: Pre-Footer Final Conversion Banner.
   */
  public renderClosingCtaHtml(): string {
    const tokens = themeTokens[this.theme];

    return `
      <section class="landing-section" style="padding: 56px 32px; max-width: 1120px; margin: 0 auto;">
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.primary}; border-radius: 14px; padding: 40px 28px; text-align: center; box-shadow: 0 0 35px rgba(189,150,82,0.15); position: relative; overflow: hidden;">
          
          <div style="position: relative; z-index: 1; max-width: 720px; margin: 0 auto;">
            <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(189,150,82,0.12); border: 1px solid ${tokens.primary}; padding: 4px 14px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; color: ${tokens.primary}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px;">
              <span>Accelerate Your Commerce Operations</span>
            </div>
            <h2 class="section-h2 closing-cta-h2" style="font-size: clamp(1.8rem, 3.8vw, 2.5rem); font-weight: 900; color: ${tokens.textPrimary}; margin: 0 0 14px 0; letter-spacing: -0.02em;">
              Run every branch from one screen.
            </h2>
            <p style="font-size: 1rem; line-height: 1.6; color: ${tokens.textSecondary}; margin: 0 0 28px 0;">
              Experience the speed of offline-first retail, zero phantom inventory, and pure double-entry ledger truth. Provision your workspace in under 60 seconds.
            </p>

            <div style="display: flex; justify-content: center; gap: 14px; flex-wrap: wrap;">
              <button onclick="window.stokrovaCustomerApp.openRegisterModal()" style="min-height: 44px; background: ${tokens.primary}; color: #0E1116; border: none; padding: 12px 28px; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(189,150,82,0.4); touch-action: manipulation;">
                Register your business →
              </button>
              <button onclick="window.stokrovaCustomerApp.confirmOpenDemo()" style="min-height: 44px; background: #161B1E; color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong}; padding: 12px 24px; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; touch-action: manipulation;">
                Explore the demo
              </button>
              <button onclick="window.stokrovaCustomerApp.openLoginModal()" style="min-height: 44px; background: transparent; color: ${tokens.textSecondary}; border: 1px solid ${tokens.border}; padding: 12px 20px; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; touch-action: manipulation;">
                Staff sign in →
              </button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  public renderRegisterModalHtml(): string {
    const tokens = themeTokens[this.theme];
    return `
      <div id="modal-register" role="dialog" aria-modal="true" aria-labelledby="reg-modal-title" style="display: none; position: fixed; inset: 0; background: rgba(14, 17, 22, 0.9); backdrop-filter: blur(10px); z-index: 20000; align-items: center; justify-content: center; padding: 16px;">
        
        <!-- Ambient High-Class Cosmic Particle Canvas -->
        <canvas id="signup-cosmic-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0;"></canvas>

        <div class="modal-dialog-inner signup-stepper-card" style="position: relative; z-index: 1; background: radial-gradient(circle at 50% 0%, #1c2328 0%, #13171a 100%); border: 1px solid ${tokens.borderStrong}; border-radius: 16px; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; box-shadow: 0 35px 85px rgba(0,0,0,0.85), 0 0 30px rgba(189,150,82,0.18), inset 0 1px 0 rgba(255,255,255,0.06); padding: 26px;">
          
          <style>
            .stk-country-opt:hover {
              background: rgba(189, 150, 82, 0.16) !important;
              color: #FFFFFF !important;
            }
            #reg-country-list::-webkit-scrollbar {
              width: 5px;
            }
            #reg-country-list::-webkit-scrollbar-track {
              background: #0E1114;
            }
            #reg-country-list::-webkit-scrollbar-thumb {
              background: #2A3238;
              border-radius: 3px;
            }
            #reg-country-list::-webkit-scrollbar-thumb:hover {
              background: #BD9652;
            }
          </style>
          
          <!-- Centered Brand & Single-Line Header with Step Counter -->
          <div style="position: relative; text-align: center; margin-bottom: 18px; border-bottom: 1px solid rgba(65, 79, 90, 0.35); padding-bottom: 14px;">
            <!-- Top-Left Edge: Small Branded Step Counter Pill -->
            <div id="signup-step-badge" style="position: absolute; top: 0; left: 0; display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 4px; background: rgba(189,150,82,0.08); border: 1px solid rgba(189,150,82,0.3); font-family: var(--stokrova-font-mono); font-size: 0.6875rem; font-weight: 700; color: ${tokens.primary}; letter-spacing: 0.08em; text-transform: uppercase;">
              <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: ${tokens.primary};"></span>
              <span>STEP</span>
              <span id="signup-current-step-num">1</span>
              <span style="opacity: 0.4;">/</span>
              <span style="opacity: 0.7;">4</span>
            </div>

            <!-- Top Center: Small Crystal Icon + STOKROVA -->
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 7px; margin-bottom: 6px;">
              <span style="color: ${tokens.primary}; font-size: 1rem; line-height: 1;">◆</span>
              <span style="font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-weight: 800; font-size: 0.95rem; letter-spacing: 0.12em; color: ${tokens.textPrimary};">STOKROVA</span>
            </div>
            <!-- Underneath: REGISTER YOUR BUSINESS in clean beautiful normal font on full one line -->
            <h2 id="reg-modal-title" style="margin: 0; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-size: 1.15rem; font-weight: 700; color: ${tokens.textPrimary}; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap;">Register Your Business</h2>

            <!-- Minimalist Top-Right Close Button -->
            <button onclick="window.stokrovaCustomerApp.closeRegisterModal()" aria-label="Close dialog" style="position: absolute; top: -2px; right: 0; background: rgba(255,255,255,0.04); border: 1px solid ${tokens.border}; width: 34px; height: 34px; min-width: 34px; min-height: 34px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.25rem; color: ${tokens.textMuted}; cursor: pointer; transition: all 0.15s ease;">&times;</button>
          </div>

          <!-- Progress Stepper Track (Clean hairline progress bar without subtitles) -->
          <div id="signup-stepper-header" style="margin-bottom: 20px;">
            <span id="signup-step-percent" style="display: none;">25%</span>
            <div style="height: 3px; background: #121619; border-radius: 2px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06);">
              <div id="signup-progress-fill" style="width: 25%; height: 100%; background: linear-gradient(90deg, #BD9652, #E0CB9F); box-shadow: 0 0 8px rgba(189,150,82,0.6); transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1);"></div>
            </div>
          </div>

          <!-- Inter-Step Micro-Loader (Clean, normal beautiful font) -->
          <div id="signup-step-loader" style="display: none; text-align: center; padding: 48px 20px;">
            <div style="position: relative; width: 56px; height: 56px; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
              <div class="command-center-glow" style="position: absolute; inset: -4px; border-radius: 50%; background: radial-gradient(circle, rgba(189,150,82,0.4), transparent 70%);"></div>
              <div style="width: 48px; height: 48px; border-radius: 50%; background: #121619; border: 2px solid ${tokens.primary}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(189,150,82,0.45);">
                <span style="font-size: 1.3rem; color: ${tokens.primary}; animation: pulseDot 1.2s infinite alternate;">◆</span>
              </div>
            </div>
            <h3 id="signup-loader-title" style="margin: 0 0 6px 0; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-size: 1.1rem; font-weight: 700; color: ${tokens.textPrimary}; letter-spacing: -0.01em;">
              Loading Next Step...
            </h3>
            <p id="signup-loader-sub" style="margin: 0; font-size: 0.8125rem; color: ${tokens.textSecondary}; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);">
              Calibrating your business parameters and security settings...
            </p>
          </div>

          <form id="form-register-customer" novalidate onsubmit="window.stokrovaCustomerApp.handleRegisterSubmit(event)">
            
            <!-- STEP 1: Business Identity & Legal Entity -->
            <div id="reg-step-1" class="signup-step-pane" style="display: block;">

              <div style="margin-bottom: 14px;">
                <label for="reg-company-name" class="form-label stk-industrial-label" style="display: block; font-size: 0.72rem; font-weight: 700; color: ${tokens.textSecondary}; margin-bottom: 6px; letter-spacing: 0.08em; text-transform: uppercase;">BUSINESS / COMPANY LEGAL NAME *</label>
                <input id="reg-company-name" class="form-input" type="text" required placeholder="e.g. Acme Enterprises Ltd" oninput="window.stokrovaCustomerApp.autoSuggestSlug(this.value)" style="width: 100%; min-height: 44px; padding: 10px 14px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 16px;" />
              </div>

              <div style="margin-bottom: 14px;">
                <label for="reg-slug" class="form-label stk-industrial-label" style="display: block; font-size: 0.72rem; font-weight: 700; color: ${tokens.textSecondary}; margin-bottom: 6px; letter-spacing: 0.08em; text-transform: uppercase;">WORKSPACE SLUG (SUBDOMAIN) *</label>
                <div style="display: flex; align-items: center; background: ${tokens.background}; border: 1px solid ${tokens.border}; border-radius: 6px; overflow: hidden; min-height: 44px;">
                  <input id="reg-slug" class="form-input" type="text" required placeholder="acme" style="flex: 1; min-height: 44px; padding: 10px 14px; background: transparent; border: none; color: ${tokens.textPrimary}; font-size: 16px; font-family: var(--stokrova-font-mono);" />
                  <span style="padding: 0 14px; font-size: 0.75rem; color: ${tokens.primary}; font-family: var(--stokrova-font-mono); font-weight: 700;">.stokrova.com</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.7rem;">
                  <span style="color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono);">Only lowercase letters, numbers, and hyphens.</span>
                  <span id="reg-slug-badge" style="color: #4ADE80; font-weight: 600; font-family: var(--stokrova-font-mono);">✓ Subdomain available</span>
                </div>
              </div>

              <div style="margin-bottom: 22px;">
                <label for="reg-currency" class="form-label stk-industrial-label" style="display: block; font-size: 0.72rem; font-weight: 700; color: ${tokens.textSecondary}; margin-bottom: 6px; letter-spacing: 0.08em; text-transform: uppercase;">BASE CURRENCY *</label>
                <select id="reg-currency" class="form-input stk-currency-select" onchange="window.stokrovaCustomerApp?.onBaseCurrencyChange ? window.stokrovaCustomerApp.onBaseCurrencyChange(this.value) : null" style="width: 100%; min-height: 42px; height: 42px; padding: 8px 12px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.8125rem; font-weight: 600; font-family: var(--stokrova-font-mono);">
                  <option value="USD">USD ($) — US Dollar</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="NGN">NGN (₦) — Nigerian Naira</option>
                  <option value="KES">KES (KSh) — Kenyan Shilling</option>
                  <option value="ZAR">ZAR (R) — South African Rand</option>
                </select>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button type="button" onclick="window.stokrovaCustomerApp.closeRegisterModal()" style="min-height: 44px; padding: 10px 18px; border-radius: 6px; border: 1px solid ${tokens.border}; background: transparent; color: ${tokens.textPrimary}; font-size: 0.875rem; cursor: pointer;">
                  Cancel
                </button>
                <button id="btn-signup-step1" class="stk-industrial-btn-primary" type="button" onclick="window.stokrovaCustomerApp.nextSignupStep(1)" style="min-height: 44px; padding: 10px 24px; border-radius: 6px; border: none; background: ${tokens.primary}; color: #0E1116; font-weight: 700; font-size: 0.875rem; cursor: pointer; box-shadow: 0 4px 14px rgba(189,150,82,0.35); font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); letter-spacing: 0.02em;">
                  Confirm & Continue →
                </button>
              </div>
            </div>

            <!-- STEP 2: Store / Branch & Operational Configuration -->
            <div id="reg-step-2" class="signup-step-pane" style="display: none;">
              <div style="margin-bottom: 14px;">
                <label class="form-label stk-industrial-label" style="display: block; font-size: 0.72rem; font-weight: 700; color: ${tokens.textSecondary}; margin-bottom: 8px; letter-spacing: 0.08em; text-transform: uppercase;">OPERATIONAL INDUSTRY MODEL *</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <label class="industry-choice-label" style="background: #14181B; border: 1px solid ${tokens.primary}; border-radius: 8px; padding: 10px 12px; cursor: pointer; display: flex; align-items: flex-start; gap: 8px; transition: all 0.2s ease;">
                    <input type="radio" name="reg-industry" value="retail" checked style="accent-color: ${tokens.primary}; margin-top: 2px;" />
                    <div>
                      <div style="font-weight: 700; font-size: 0.8125rem; color: ${tokens.textPrimary}; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);">High-Street Retail & Store</div>
                      <div style="font-size: 0.7rem; color: ${tokens.textMuted};">Offline POS, split tenders & receipt engine</div>
                    </div>
                  </label>
                  <label class="industry-choice-label" style="background: #14181B; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 10px 12px; cursor: pointer; display: flex; align-items: flex-start; gap: 8px; transition: all 0.2s ease;">
                    <input type="radio" name="reg-industry" value="supermarket" style="accent-color: ${tokens.primary}; margin-top: 2px;" />
                    <div>
                      <div style="font-weight: 700; font-size: 0.8125rem; color: ${tokens.textPrimary}; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);">Supermarket & FMCG</div>
                      <div style="font-size: 0.7rem; color: ${tokens.textMuted};">Laser scanner buffer, multi-till cashiers</div>
                    </div>
                  </label>
                  <label class="industry-choice-label" style="background: #14181B; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 10px 12px; cursor: pointer; display: flex; align-items: flex-start; gap: 8px; transition: all 0.2s ease;">
                    <input type="radio" name="reg-industry" value="warehouse" style="accent-color: ${tokens.primary}; margin-top: 2px;" />
                    <div>
                      <div style="font-weight: 700; font-size: 0.8125rem; color: ${tokens.textPrimary}; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);">Distribution & Warehouse</div>
                      <div style="font-size: 0.7rem; color: ${tokens.textMuted};">In-transit transfers, bin waves & FEFO</div>
                    </div>
                  </label>
                  <label class="industry-choice-label" style="background: #14181B; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 10px 12px; cursor: pointer; display: flex; align-items: flex-start; gap: 8px; transition: all 0.2s ease;">
                    <input type="radio" name="reg-industry" value="electronics" style="accent-color: ${tokens.primary}; margin-top: 2px;" />
                    <div>
                      <div style="font-weight: 700; font-size: 0.8125rem; color: ${tokens.textPrimary}; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);">Serialized Electronics</div>
                      <div style="font-size: 0.7rem; color: ${tokens.textMuted};">Serial warranty tracking & lot history</div>
                    </div>
                  </label>
                </div>
              </div>

              <div style="margin-bottom: 14px;">
                <label for="reg-branch-name" class="form-label stk-industrial-label" style="display: block; font-size: 0.72rem; font-weight: 700; color: ${tokens.textSecondary}; margin-bottom: 6px; letter-spacing: 0.08em; text-transform: uppercase;">INITIAL FLAGSHIP / STORE BRANCH NAME *</label>
                <input id="reg-branch-name" class="form-input" type="text" placeholder="e.g. Central Flagship" style="width: 100%; min-height: 44px; padding: 10px 14px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 16px;" />
              </div>

              <div style="margin-bottom: 22px;">
                <label for="reg-country-trigger" class="form-label stk-industrial-label" style="display: block; font-size: 0.72rem; font-weight: 700; color: ${tokens.textSecondary}; margin-bottom: 6px; letter-spacing: 0.08em; text-transform: uppercase;">COUNTRY *</label>
                
                <div id="reg-country-dropdown-wrap" style="position: relative; width: 100%;">
                  <!-- Trigger Field displaying selected full-color flag and country name -->
                  <button id="reg-country-trigger" type="button" onclick="window.stokrovaCustomerApp?.toggleCountryDropdown()" aria-haspopup="listbox" aria-expanded="false" style="width: 100%; min-height: 44px; padding: 10px 14px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; display: flex; align-items: center; justify-content: space-between; cursor: pointer; text-align: left; transition: border-color 0.2s ease, box-shadow 0.2s ease;">
                    <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                      <img id="reg-country-selected-flag" src="https://flagcdn.com/w40/gb.png" srcset="https://flagcdn.com/w80/gb.png 2x" width="22" height="15" alt="GB" style="border-radius: 2px; object-fit: cover; box-shadow: 0 0 2px rgba(0,0,0,0.6); flex-shrink: 0;" />
                      <span id="reg-country-selected-label" style="font-weight: 600; font-size: 0.875rem; color: ${tokens.textPrimary}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">United Kingdom</span>
                    </div>
                    <span id="reg-country-chevron" style="color: ${tokens.textMuted}; font-size: 0.7rem; transition: transform 0.2s ease; margin-left: 8px;">▼</span>
                  </button>

                  <!-- Downward Dropdown Menu Panel (Renders Strictly Downwards) -->
                  <div id="reg-country-menu" role="listbox" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #14181B; border: 1px solid ${tokens.border}; border-radius: 6px; box-shadow: 0 16px 36px rgba(0,0,0,0.75); z-index: 1000; overflow: hidden;">
                    <!-- Country Search Bar -->
                    <div style="padding: 8px 10px; border-bottom: 1px solid ${tokens.border}; background: #0E1114;">
                      <div style="display: flex; align-items: center; gap: 8px; background: ${tokens.background}; border: 1px solid ${tokens.border}; border-radius: 4px; padding: 6px 10px;">
                        <span style="color: ${tokens.textMuted}; font-size: 0.75rem;">🔍</span>
                        <input type="text" id="reg-country-search" placeholder="Search country..." autocomplete="off" oninput="window.stokrovaCustomerApp?.filterCountries(this.value)" style="width: 100%; background: transparent; border: none; outline: none; color: ${tokens.textPrimary}; font-size: 0.8125rem; font-family: inherit;" />
                      </div>
                    </div>

                    <!-- Scrollable Country List with Reduced Height -->
                    <div id="reg-country-list" style="max-height: 180px; overflow-y: auto; padding: 4px 0;">
                      ${WORLD_COUNTRIES.map(c => `
                        <div class="stk-country-opt" data-code="${c.code}" data-name="${c.name.toLowerCase()}" onclick="window.stokrovaCustomerApp?.selectCountry('${c.code}', '${c.name.replace(/'/g, "\\'")}')" style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; cursor: pointer; font-size: 0.8125rem; color: ${tokens.textPrimary}; transition: background 0.15s ease;">
                          <img src="https://flagcdn.com/w40/${c.code.toLowerCase()}.png" srcset="https://flagcdn.com/w80/${c.code.toLowerCase()}.png 2x" width="20" height="14" alt="${c.code}" loading="lazy" style="border-radius: 2px; object-fit: cover; box-shadow: 0 0 1px rgba(0,0,0,0.5); flex-shrink: 0;" />
                          <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.name}</span>
                          <span style="font-size: 0.7rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono);">${c.code}</span>
                        </div>
                      `).join('')}
                      <div id="reg-country-no-results" style="display: none; padding: 16px; text-align: center; color: ${tokens.textMuted}; font-size: 0.8rem;">No matching countries found</div>
                    </div>
                  </div>

                  <!-- Hidden native select for form serialization and test contracts -->
                  <select id="reg-country" name="country" style="display: none;" aria-hidden="true">
                    ${WORLD_COUNTRIES.map(c => `<option value="${c.code}" ${c.code === 'GB' ? 'selected' : ''}>${c.name}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; gap: 10px;">
                <button type="button" onclick="window.stokrovaCustomerApp.prevSignupStep(2)" style="min-height: 44px; padding: 10px 18px; border-radius: 6px; border: 1px solid ${tokens.border}; background: transparent; color: ${tokens.textPrimary}; font-size: 0.875rem; cursor: pointer;">
                  ← Back
                </button>
                <button id="btn-signup-step2" class="stk-industrial-btn-primary" type="button" onclick="window.stokrovaCustomerApp.nextSignupStep(2)" style="min-height: 44px; padding: 10px 24px; border-radius: 6px; border: none; background: ${tokens.primary}; color: #0E1116; font-weight: 700; font-size: 0.875rem; cursor: pointer; box-shadow: 0 4px 14px rgba(189,150,82,0.35); font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); letter-spacing: 0.02em;">
                  Confirm & Continue →
                </button>
              </div>
            </div>

            <!-- STEP 3: Business Owner & Executive Access -->
            <div id="reg-step-3" class="signup-step-pane" style="display: none;">
              <div class="modal-grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label for="reg-owner-name" class="form-label stk-industrial-label" style="display: block; font-size: 0.72rem; font-weight: 700; color: ${tokens.textSecondary}; margin-bottom: 6px; letter-spacing: 0.08em; text-transform: uppercase;">OWNER FULL NAME *</label>
                  <input id="reg-owner-name" class="form-input" type="text" required placeholder="Owner Full Name" style="width: 100%; min-height: 44px; padding: 10px 14px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 16px;" />
                </div>
                <div>
                  <label for="reg-owner-email" class="form-label stk-industrial-label" style="display: block; font-size: 0.72rem; font-weight: 700; color: ${tokens.textSecondary}; margin-bottom: 6px; letter-spacing: 0.08em; text-transform: uppercase;">OWNER WORK EMAIL *</label>
                  <input id="reg-owner-email" class="form-input" type="email" required placeholder="owner@company.com" style="width: 100%; min-height: 44px; padding: 10px 14px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 16px;" />
                </div>
              </div>

              <div class="modal-grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label for="reg-password" class="form-label stk-industrial-label" style="display: block; font-size: 0.72rem; font-weight: 700; color: ${tokens.textSecondary}; margin-bottom: 6px; letter-spacing: 0.08em; text-transform: uppercase;">PASSWORD *</label>
                  <div style="position: relative; width: 100%;">
                    <input id="reg-password" class="form-input" type="password" required placeholder="••••••••••••" style="width: 100%; min-height: 44px; padding: 10px 44px 10px 14px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 16px;" />
                    <button type="button" id="btn-toggle-reg-password" onclick="window.stokrovaCustomerApp?.togglePasswordVisibility('reg-password', this)" aria-label="Toggle password visibility" style="position: absolute; right: 0; top: 0; bottom: 0; width: 44px; display: inline-flex; align-items: center; justify-content: center; background: transparent; border: none; color: ${tokens.textMuted}; cursor: pointer; padding: 0; transition: color 0.15s ease;">
                      <svg class="stk-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </div>
                </div>
                <div>
                  <label for="reg-owner-phone" class="form-label stk-industrial-label" style="display: block; font-size: 0.72rem; font-weight: 700; color: ${tokens.textSecondary}; margin-bottom: 6px; letter-spacing: 0.08em; text-transform: uppercase;">EMERGENCY AUDIT PHONE (OPTIONAL)</label>
                  <input id="reg-owner-phone" class="form-input" type="tel" placeholder="+44 20 7000 0000" style="width: 100%; min-height: 44px; padding: 10px 14px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 16px; font-family: var(--stokrova-font-mono);" />
                </div>
              </div>

              <div style="background: #14181B; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px 14px; margin-bottom: 22px; font-size: 0.75rem; color: ${tokens.textMuted}; line-height: 1.45; display: flex; align-items: center; gap: 10px;">
                <span style="color: ${tokens.primary}; font-size: 1.1rem;">🛡️</span>
                <span>Master owner receives root tenant administrative privileges across all branches, till sessions, and general ledger accounts.</span>
              </div>

              <div style="display: flex; justify-content: space-between; gap: 10px;">
                <button type="button" onclick="window.stokrovaCustomerApp.prevSignupStep(3)" style="min-height: 44px; padding: 10px 18px; border-radius: 6px; border: 1px solid ${tokens.border}; background: transparent; color: ${tokens.textPrimary}; font-size: 0.875rem; cursor: pointer;">
                  ← Back
                </button>
                <button id="btn-signup-step3" class="stk-industrial-btn-primary" type="button" onclick="window.stokrovaCustomerApp.nextSignupStep(3)" style="min-height: 44px; padding: 10px 24px; border-radius: 6px; border: none; background: ${tokens.primary}; color: #0E1116; font-weight: 700; font-size: 0.875rem; cursor: pointer; box-shadow: 0 4px 14px rgba(189,150,82,0.35); font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); letter-spacing: 0.02em;">
                  Confirm & Continue →
                </button>
              </div>
            </div>

            <!-- STEP 4: Operational Scale & Subscription Plan Selection -->
            <div id="reg-step-4" class="signup-step-pane" style="display: none;">
              <div style="margin-bottom: 16px;">
                
                <!-- Plan Header with Compact Currency Dropdown (Not oversized) -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: rgba(22,27,30,0.85); border: 1px solid ${tokens.border}; border-radius: 8px; padding: 8px 14px;">
                  <div>
                    <label for="reg-tier" class="form-label stk-industrial-label" style="margin: 0; font-size: 0.72rem; font-weight: 700; color: ${tokens.textSecondary}; letter-spacing: 0.06em; text-transform: uppercase;">PLAN TIER & CAPACITY</label>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.7rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono); text-transform: uppercase;">CURRENCY:</span>
                    <select id="reg-plan-currency" onchange="window.stokrovaCustomerApp.onPlanCurrencyChange(this.value)" class="stk-currency-select" style="min-height: 32px; height: 32px; padding: 4px 8px; font-size: 0.75rem; font-weight: 600; font-family: var(--stokrova-font-mono); background: #161B1E; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; border-radius: 6px; cursor: pointer;">
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="NGN">NGN (₦)</option>
                      <option value="KES">KES (KSh)</option>
                      <option value="ZAR">ZAR (R)</option>
                    </select>
                  </div>
                </div>
                
                <!-- High Industrial Plan Card Options -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px;">
                  
                  <div class="signup-plan-card" onclick="window.stokrovaCustomerApp.selectSignupPlan('starter')" id="plan-card-starter" style="background: #14181B; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px 10px; cursor: pointer; text-align: center; transition: all 0.2s ease;">
                    <div style="font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-weight: 700; font-size: 0.95rem; color: ${tokens.textPrimary}; letter-spacing: 0.02em; text-transform: uppercase;">Starter</div>
                    <div id="plan-price-starter" style="font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-size: 1.35rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 6px 0; letter-spacing: -0.01em;">$49</div>
                    <div style="font-size: 0.6875rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono);">1 Store • Touch POS</div>
                  </div>

                  <div class="signup-plan-card" onclick="window.stokrovaCustomerApp.selectSignupPlan('growth')" id="plan-card-growth" style="background: #14181B; border: 2px solid ${tokens.primary}; border-radius: 10px; padding: 16px 10px; cursor: pointer; text-align: center; position: relative; transition: all 0.2s ease; box-shadow: 0 0 20px rgba(189,150,82,0.25);">
                    <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: ${tokens.primary}; color: #0E1116; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-size: 0.625rem; font-weight: 800; padding: 2px 10px; border-radius: 9999px; letter-spacing: 0.06em;">POPULAR</span>
                    <div style="font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-weight: 700; font-size: 0.95rem; color: ${tokens.textPrimary}; letter-spacing: 0.02em; text-transform: uppercase;">Growth</div>
                    <div id="plan-price-growth" style="font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-size: 1.35rem; font-weight: 800; color: ${tokens.primary}; margin: 6px 0; letter-spacing: -0.01em;">$149</div>
                    <div style="font-size: 0.6875rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono);">5 Stores • In-Transit & FEFO</div>
                  </div>

                  <div class="signup-plan-card" onclick="window.stokrovaCustomerApp.selectSignupPlan('enterprise')" id="plan-card-enterprise" style="background: #14181B; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px 10px; cursor: pointer; text-align: center; transition: all 0.2s ease;">
                    <div style="font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-weight: 700; font-size: 0.95rem; color: ${tokens.textPrimary}; letter-spacing: 0.02em; text-transform: uppercase;">Enterprise</div>
                    <div id="plan-price-enterprise" style="font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-size: 1.35rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 6px 0; letter-spacing: -0.01em;">$399</div>
                    <div style="font-size: 0.6875rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono);">Warehouses • Multi-Branch</div>
                  </div>

                </div>

                <!-- Hidden / Synced Select for Complete Contract & Test Compatibility -->
                <select id="reg-tier" class="form-input stk-currency-select" style="width: 100%; min-height: 40px; height: 40px; padding: 8px 12px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.8125rem; font-weight: 600; font-family: var(--stokrova-font-mono);">
                  <option value="starter">Starter — $49/mo</option>
                  <option value="growth" selected>Growth — $149/mo (Recommended)</option>
                  <option value="enterprise">Enterprise — $399/mo</option>
                </select>
              </div>

              <div style="background: #14291F; border: 1px solid #1E4620; border-radius: 8px; padding: 12px 14px; margin-bottom: 22px; font-size: 0.75rem; color: #4ADE80; line-height: 1.5; font-family: var(--stokrova-font-mono);">
                ✓ 30-Day Free Trial — no credit card required • Automatic Double-Entry Ledger • Cancel or scale branches anytime.
              </div>

              <div style="display: flex; justify-content: space-between; gap: 10px;">
                <button type="button" onclick="window.stokrovaCustomerApp.prevSignupStep(4)" style="min-height: 44px; padding: 10px 18px; border-radius: 6px; border: 1px solid ${tokens.border}; background: transparent; color: ${tokens.textPrimary}; font-size: 0.875rem; cursor: pointer;">
                  ← Back
                </button>
                <button id="btn-submit-registration" class="stk-industrial-btn-primary" type="submit" style="min-height: 46px; padding: 12px 28px; border-radius: 6px; border: none; background: ${tokens.primary}; color: #0E1116; font-weight: 700; font-size: 0.95rem; cursor: pointer; box-shadow: 0 4px 18px rgba(189,150,82,0.45); font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); letter-spacing: 0.03em; text-transform: uppercase;">
                  Confirm & Register Business →
                </button>
              </div>
            </div>

            <!-- STEP 5: High-Class Cosmic Motions & Dedicated Welcoming / Platform Promise Screen -->
            <div id="reg-step-5" class="signup-step-pane" style="display: none; text-align: center; padding: 6px 0;">
              
              <!-- Grand Welcoming & Congratulations Banner -->
              <div style="background: linear-gradient(135deg, rgba(189,150,82,0.18), rgba(22,27,30,0.92)); border: 1px solid ${tokens.primary}; border-radius: 12px; padding: 22px 20px; margin-bottom: 18px; text-align: center; box-shadow: 0 0 25px rgba(189,150,82,0.2);">
                <div style="display: inline-flex; align-items: center; gap: 6px; background: ${tokens.primary}; color: #0E1116; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-size: 0.7rem; font-weight: 700; padding: 3px 12px; border-radius: 9999px; letter-spacing: 0.08em; margin-bottom: 10px;">
                  ✦ CONGRATULATIONS • WORKSPACE DEPLOYED ✦
                </div>
                <h2 id="prov-headline" style="margin: 0 0 6px 0; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-size: 1.25rem; font-weight: 700; color: ${tokens.textPrimary}; letter-spacing: -0.01em;">
                  Welcome to STOKROVA, <span id="prov-dyn-welcome">Owner</span>!
                </h2>
                <p style="margin: 0; font-size: 0.8125rem; color: ${tokens.textSecondary}; line-height: 1.5;">
                  Your sovereign business workspace for <strong id="prov-dyn-company" style="color: ${tokens.textPrimary}; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);">Your Organization</strong> is live and securely activated at <span id="prov-dyn-slug" style="color: ${tokens.primary}; font-family: var(--stokrova-font-mono); font-weight: 700;">workspace.stokrova.com</span>.
                </p>
              </div>

              <!-- The STOKROVA Operational Promise Banner (Simulated detailed promise when trusting the platform) -->
              <div id="stokrova-promise-banner" style="background: #14181B; border: 1px solid ${tokens.borderStrong}; border-radius: 10px; padding: 18px 20px; margin-bottom: 18px; text-align: left;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; border-bottom: 1px solid ${tokens.border}; padding-bottom: 8px;">
                  <span style="font-size: 1.1rem; color: ${tokens.primary};">⚖️</span>
                  <span style="font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-weight: 700; font-size: 0.875rem; color: ${tokens.textPrimary}; text-transform: uppercase; letter-spacing: 0.06em;">The STOKROVA Operational Promise</span>
                </div>
                <p style="margin: 0 0 12px 0; font-size: 0.75rem; color: ${tokens.textSecondary}; line-height: 1.45;">
                  When you entrust your physical stores, warehouses, and books to STOKROVA, our core architecture provides these unwavering guarantees:
                </p>

                <div style="display: flex; flex-direction: column; gap: 10px;">
                  <div style="display: flex; gap: 10px; align-items: flex-start;">
                    <span style="color: #4ADE80; font-weight: 800; font-size: 0.95rem; line-height: 1.2;">✓</span>
                    <div>
                      <strong style="color: ${tokens.textPrimary}; font-size: 0.8125rem;">100% Offline Transaction Resilience</strong>
                      <div style="font-size: 0.725rem; color: ${tokens.textSecondary}; line-height: 1.4;">
                        Your counters never freeze. Sub-50ms barcode scans and split payments persist to encrypted local SQLite/IndexedDB outbox queues, syncing with deterministic UUID idempotency when connection restores.
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; gap: 10px; align-items: flex-start;">
                    <span style="color: #4ADE80; font-weight: 800; font-size: 0.95rem; line-height: 1.2;">✓</span>
                    <div>
                      <strong style="color: ${tokens.textPrimary}; font-size: 0.8125rem;">Enterprise Organization Privacy & Data Security</strong>
                      <div style="font-size: 0.725rem; color: ${tokens.textSecondary}; line-height: 1.4;">
                        Your financial ledger and inventory belong exclusively to you. Dedicated organizational privacy prevents cross-account data leakage, shared caches, or unauthorized visibility.
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; gap: 10px; align-items: flex-start;">
                    <span style="color: #4ADE80; font-weight: 800; font-size: 0.95rem; line-height: 1.2;">✓</span>
                    <div>
                      <strong style="color: ${tokens.textPrimary}; font-size: 0.8125rem;">Pure Integer Double-Entry Ledger Truth</strong>
                      <div style="font-size: 0.725rem; color: ${tokens.textSecondary}; line-height: 1.4;">
                        Every till sale, return, and inventory intake automatically posts balanced double-entry journals (Debits = Credits) in exact minor units. Blind cash drawer audits enforce $0.00 till variance.
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; gap: 10px; align-items: flex-start;">
                    <span style="color: #4ADE80; font-weight: 800; font-size: 0.95rem; line-height: 1.2;">✓</span>
                    <div>
                      <strong style="color: ${tokens.textPrimary}; font-size: 0.8125rem;">Unified Multi-Branch Command Telemetry</strong>
                      <div style="font-size: 0.725rem; color: ${tokens.textSecondary}; line-height: 1.4;">
                        Control high-street shops, flagship boutiques, and regional warehouses from a single pane of glass with live margins, FEFO batch tracking, and in-transit custody.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Progress Percentage & Bar -->
              <div style="max-width: 480px; margin: 0 auto 18px auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-family: var(--stokrova-font-mono); font-size: 0.8125rem;">
                  <span id="prov-stage-label" style="color: ${tokens.textSecondary};">Configuring dedicated organization environment...</span>
                  <span id="prov-percent" style="font-weight: 900; color: ${tokens.primary};">0%</span>
                </div>
                <div style="height: 6px; background: #121619; border-radius: 3px; overflow: hidden; border: 1px solid ${tokens.border};">
                  <div id="prov-progress-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #BD9652, #4ADE80); box-shadow: 0 0 12px rgba(189,150,82,0.8); transition: width 0.25s ease-out;"></div>
                </div>
              </div>

              <!-- Dynamic Real-Time Milestone Checklist -->
              <div id="prov-milestones" style="max-width: 480px; margin: 0 auto 20px auto; background: #14181B; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px 16px; text-align: left; font-size: 0.75rem; font-family: var(--stokrova-font-mono); display: flex; flex-direction: column; gap: 7px;">
                <div id="m-step-1" style="color: ${tokens.textMuted}; transition: all 0.2s ease;">
                  <span class="m-icon">⬡</span> <span>Enterprise Privacy Protection Active</span>
                </div>
                <div id="m-step-2" style="color: ${tokens.textMuted}; transition: all 0.2s ease;">
                  <span class="m-icon">⬡</span> <span>Configuring legal entity '<strong id="prov-dyn-company" style="color: ${tokens.textPrimary}; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);">...</strong>'</span>
                </div>
                <div id="m-step-3" style="color: ${tokens.textMuted}; transition: all 0.2s ease;">
                  <span class="m-icon">⬡</span> <span>Setting up flagship branch '<strong id="prov-dyn-branch" style="color: ${tokens.textPrimary}; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);">...</strong>'</span>
                </div>
                <div id="m-step-4" style="color: ${tokens.textMuted}; transition: all 0.2s ease;">
                  <span class="m-icon">⬡</span> <span>Generating automated double-entry ledger & chart of accounts</span>
                </div>
                <div id="m-step-5" style="color: ${tokens.textMuted}; transition: all 0.2s ease;">
                  <span class="m-icon">⬡</span> <span>Provisioning root credentials for <strong id="prov-dyn-owner" style="color: ${tokens.textPrimary}; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);">...</strong></span>
                </div>
                <div id="m-step-6" style="color: ${tokens.textMuted}; transition: all 0.2s ease;">
                  <span class="m-icon">⬡</span> <span>Deploying workspace to <strong id="prov-dyn-slug" style="color: ${tokens.primary};">...</strong>.stokrova.com</span>
                </div>
              </div>

              <!-- Celebratory Completion Actions (Shown at 100%) -->
              <div id="prov-completion-actions" style="display: none; animation: fadeIn 0.3s ease-out; margin-top: 24px; text-align: center;">
                <div style="background: rgba(74, 222, 128, 0.1); border: 1px solid #1E4620; border-radius: 8px; padding: 12px 18px; max-width: 480px; margin: 0 auto 16px auto; color: #4ADE80; font-size: 0.875rem; font-weight: 700; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);">
                  ✦ Workspace Live: Setup Complete
                </div>
                <div id="prov-countdown-banner" style="font-size: 0.9375rem; font-weight: 600; color: ${tokens.textSecondary}; display: flex; align-items: center; justify-content: center; gap: 8px;">
                  <span style="display: inline-block; animation: pulseDot 1.2s infinite; color: ${tokens.primary};">⚡</span>
                  <span>Launching dashboard in <strong id="prov-countdown-sec" style="color: ${tokens.primary}; font-family: var(--stokrova-font-mono); font-size: 1.15rem;">3</strong>s...</span>
                </div>
              </div>

            </div>

            <!-- STEP EMAIL CONFIRMATION: Real Verification Notice -->
            <div id="reg-step-confirm-email" class="signup-step-pane" style="display: none; text-align: center; padding: 12px 4px;">
              <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(189,150,82,0.12); border: 1px solid ${tokens.primary}; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: ${tokens.primary};">
                ✉️
              </div>
              <h3 style="margin: 0 0 8px 0; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-size: 1.15rem; font-weight: 700; color: ${tokens.textPrimary}; letter-spacing: -0.01em;">
                Confirm Your Email Address
              </h3>
              <p style="margin: 0 0 16px 0; font-size: 0.875rem; color: ${tokens.textSecondary}; line-height: 1.5; max-width: 480px; margin-left: auto; margin-right: auto;">
                A secure verification link has been sent to <strong id="confirm-email-target" style="color: ${tokens.textPrimary}; font-family: var(--stokrova-font-mono);">...</strong>.
              </p>
              <div style="background: #14181B; border: 1px solid ${tokens.borderStrong}; border-radius: 10px; padding: 14px 16px; margin: 0 auto 20px auto; max-width: 480px; text-align: left; font-size: 0.775rem; color: ${tokens.textSecondary}; line-height: 1.5;">
                <div style="color: #4ADE80; font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                  <span>✓</span> <span>Enterprise Account Security</span>
                </div>
                <div>Please click the confirmation link in your email to verify your ownership. Your workspace at <strong id="confirm-slug-target" style="color: ${tokens.primary}; font-family: var(--stokrova-font-mono);">...</strong>.stokrova.com will be activated as soon as your identity is verified.</div>
              </div>

              <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                <button id="btn-resend-confirm-email" type="button" onclick="window.stokrovaCustomerApp.resendConfirmationEmail()" style="min-height: 44px; padding: 10px 20px; border-radius: 6px; border: 1px solid ${tokens.primary}; background: transparent; color: ${tokens.primary}; font-weight: 700; font-size: 0.875rem; cursor: pointer; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); letter-spacing: 0.02em;">
                  Resend Confirmation Email
                </button>
                <button id="btn-check-confirmed" class="stk-industrial-btn-primary" type="button" onclick="window.stokrovaCustomerApp.checkSessionAfterEmailConfirmation()" style="min-height: 44px; padding: 10px 24px; border-radius: 6px; border: none; background: ${tokens.primary}; color: #0E1116; font-weight: 700; font-size: 0.875rem; cursor: pointer; box-shadow: 0 2px 10px rgba(189,150,82,0.35); font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); letter-spacing: 0.02em;">
                  I Have Confirmed My Email →
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    `;
  }

  /**
   * World-Class Interactive Guided Tour Overlay
   * Seamless step-by-step walkthrough simulating world-best onboarding with dismissal, cancellation, and live interactive feature exploration.
   */
  public renderTourOverlayHtml(): string {
    const tokens = themeTokens[this.theme];
    return `
      <div id="stokrova-tour-overlay" style="display: none; position: fixed; inset: 0; z-index: 100000; pointer-events: none;">
        
        <!-- Dark Translucent Spotlight Backdrop -->
        <div id="stokrova-tour-backdrop" style="position: absolute; inset: 0; background: rgba(14, 17, 22, 0.78); backdrop-filter: blur(4px); pointer-events: auto;" onclick="window.stokrovaCustomerApp.endTour()"></div>

        <!-- Spotlight Focus Halo with Golden Glow -->
        <div id="stokrova-tour-spotlight" style="position: absolute; pointer-events: none; border: 2px solid ${tokens.primary}; border-radius: 10px; box-shadow: 0 0 40px rgba(189,150,82,0.5), inset 0 0 20px rgba(189,150,82,0.15); transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1); opacity: 0; z-index: 100001;" aria-hidden="true"></div>

        <!-- Floating Tour Popover Card -->
        <div id="stokrova-tour-card" style="position: fixed; bottom: 32px; right: 32px; background: ${tokens.surface}; border: 1px solid ${tokens.primary}; border-radius: 14px; padding: 22px 24px; width: 440px; max-width: calc(100vw - 32px); box-shadow: 0 25px 60px rgba(0,0,0,0.85), 0 0 25px rgba(189,150,82,0.25); z-index: 100002; pointer-events: auto; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
          
          <!-- Responsive Mobile Styling for Tour Card -->
          <style>
            @media (max-width: 640px) {
              #stokrova-tour-card {
                bottom: 14px !important;
                right: 12px !important;
                left: 12px !important;
                width: auto !important;
                max-width: calc(100vw - 24px) !important;
                padding: 16px 18px !important;
              }
            }
          </style>

          <!-- Card Header with Globe Icon -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 1.3rem; animation: pulseDot 1.5s infinite;">🌍</span>
              <span style="font-size: 0.75rem; font-weight: 800; color: ${tokens.primary}; text-transform: uppercase; letter-spacing: 0.08em;">STOKROVA TOUR</span>
              <span id="tour-role-badge" style="font-size: 0.6875rem; background: rgba(189,150,82,0.18); color: ${tokens.primary}; padding: 1px 6px; border-radius: 4px; font-weight: 600;">Business Owner</span>
              <span style="font-size: 0.75rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono);">• Step <span id="tour-step-num">1</span> of <span id="tour-step-total">5</span></span>
            </div>
            <button onclick="window.stokrovaCustomerApp.endTour()" aria-label="Dismiss tour" style="background: none; border: none; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.4rem; color: ${tokens.textMuted}; cursor: pointer;">&times;</button>
          </div>

          <!-- Tour Step Content -->
          <h3 id="tour-card-title" style="margin: 0 0 6px 0; font-size: 1.2rem; font-weight: 800; color: ${tokens.textPrimary};">
            Universal Operations Command Bar
          </h3>
          <p id="tour-card-desc" style="margin: 0 0 16px 0; font-size: 0.875rem; line-height: 1.55; color: ${tokens.textSecondary};">
            Control every high-street branch, pop-up store, and regional distribution warehouse from a single pane of glass. Your business operates with dedicated enterprise security and zero cross-account data leakage.
          </p>

          <!-- Interactive Action Snippet Box -->
          <div id="tour-card-action-box" style="margin-bottom: 18px; background: #161B1E; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 10px 14px; font-size: 0.8125rem;">
            <span style="color: #4ADE80; font-weight: 700;">✓ Live Status:</span> <span id="tour-action-snippet" style="color: ${tokens.textSecondary};">Multi-Branch Telemetry Synchronized</span>
          </div>

          <!-- Tour Footer Navigation -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid ${tokens.border}; padding-top: 14px;">
            <button onclick="window.stokrovaCustomerApp.endTour()" style="background: transparent; border: none; color: ${tokens.textMuted}; font-size: 0.8125rem; font-weight: 600; cursor: pointer; padding: 8px 0;">
              Dismiss (Esc)
            </button>
            <div style="display: flex; gap: 8px;">
              <button id="tour-btn-prev" onclick="window.stokrovaCustomerApp.prevTourStep()" style="min-height: 40px; background: #161B1E; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; padding: 8px 16px; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; cursor: pointer;">
                ← Back
              </button>
              <button id="tour-btn-next" onclick="window.stokrovaCustomerApp.nextTourStep()" style="min-height: 40px; background: ${tokens.primary}; border: none; color: #0E1116; padding: 8px 18px; border-radius: 6px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(189,150,82,0.4);">
                Next
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  public renderLoginModalHtml(): string {
    const tokens = themeTokens[this.theme];
    return `
      <div id="modal-login" role="dialog" aria-modal="true" aria-labelledby="login-modal-title" style="display: none; position: fixed; inset: 0; background: rgba(14, 17, 22, 0.88); backdrop-filter: blur(8px); z-index: 20000; align-items: center; justify-content: center; padding: 16px;">
        <div class="modal-dialog-inner login-stepper-card" style="position: relative; z-index: 1; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; border-radius: 14px; width: 100%; max-width: 490px; box-shadow: 0 25px 60px rgba(0,0,0,0.75), 0 0 25px rgba(189,150,82,0.12); padding: 26px 24px;">
          
          <!-- Centered Modal Header -->
          <div style="position: relative; text-align: center; margin-bottom: 20px; border-bottom: 1px solid rgba(65, 79, 90, 0.35); padding-bottom: 14px;">
            <!-- Top Center: Small Crystal Icon + STOKROVA -->
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 7px; margin-bottom: 6px;">
              <span style="color: ${tokens.primary}; font-size: 1rem; line-height: 1;">◆</span>
              <span style="font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-weight: 800; font-size: 0.95rem; letter-spacing: 0.12em; color: ${tokens.textPrimary};">STOKROVA</span>
            </div>
            <!-- Centered Header in clean normal font on full one line -->
            <h2 id="login-modal-title" style="margin: 0; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); font-size: 1.15rem; font-weight: 700; color: ${tokens.textPrimary}; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap;">Staff Sign In</h2>
            <div style="margin: 4px 0 0 0; font-size: 0.72rem; color: ${tokens.textSecondary}; letter-spacing: 0.04em;">
              Smart Workspace Auto-Discovery • Enterprise Single Sign-On
            </div>

            <!-- Top-Right Close Button -->
            <button onclick="window.stokrovaCustomerApp.closeLoginModal()" aria-label="Close dialog" style="position: absolute; top: -2px; right: 0; background: rgba(255,255,255,0.04); border: 1px solid ${tokens.border}; width: 34px; height: 34px; min-width: 34px; min-height: 34px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.25rem; color: ${tokens.textMuted}; cursor: pointer; transition: all 0.15s ease;">&times;</button>
          </div>

          <!-- STEP 1: Enter Staff Email & Password -->
          <div id="login-step-credentials" style="display: block;">
            <form id="form-login-customer" novalidate onsubmit="window.stokrovaCustomerApp.handleLoginSubmit(event)">
              
              <div style="margin-bottom: 16px;">
                <label for="login-email" class="form-label stk-industrial-label" style="display: block; font-size: 0.72rem; font-weight: 700; color: ${tokens.textSecondary}; margin-bottom: 6px; letter-spacing: 0.08em; text-transform: uppercase;">STAFF WORK EMAIL *</label>
                <input id="login-email" class="form-input" type="email" required placeholder="name@company.com" style="width: 100%; min-height: 44px; padding: 10px 14px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 16px;" />
              </div>

              <div style="margin-bottom: 22px;">
                <label for="login-password" class="form-label stk-industrial-label" style="display: block; font-size: 0.72rem; font-weight: 700; color: ${tokens.textSecondary}; margin-bottom: 6px; letter-spacing: 0.08em; text-transform: uppercase;">PASSWORD / PIN *</label>
                <div style="position: relative; width: 100%;">
                  <input id="login-password" class="form-input" type="password" required placeholder="••••••••••••" style="width: 100%; min-height: 44px; padding: 10px 44px 10px 14px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 16px;" />
                  <button type="button" id="btn-toggle-login-password" onclick="window.stokrovaCustomerApp?.togglePasswordVisibility('login-password', this)" aria-label="Toggle password visibility" style="position: absolute; right: 0; top: 0; bottom: 0; width: 44px; display: inline-flex; align-items: center; justify-content: center; background: transparent; border: none; color: ${tokens.textMuted}; cursor: pointer; padding: 0; transition: color 0.15s ease;">
                    <svg class="stk-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                </div>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;">
                <button type="button" onclick="window.stokrovaCustomerApp.closeLoginModal()" style="min-height: 44px; padding: 10px 18px; border-radius: 6px; border: 1px solid ${tokens.border}; background: transparent; color: ${tokens.textPrimary}; font-size: 0.875rem; cursor: pointer;">
                  Cancel
                </button>
                <button id="btn-submit-login" type="submit" style="min-height: 44px; padding: 10px 24px; border-radius: 6px; border: none; background: ${tokens.primary}; color: #0E1116; font-weight: 800; font-size: 0.875rem; cursor: pointer; box-shadow: 0 2px 10px rgba(189,150,82,0.35); font-family: var(--font-heading-industrial, 'Syne', sans-serif); letter-spacing: 0.02em;">
                  Confirm & Sign In →
                </button>
              </div>
            </form>
          </div>

          <!-- STEP 2: Searching & Verifying Workspace Screen -->
          <div id="login-step-verification" style="display: none; text-align: center; padding: 6px 0;">
            
            <!-- Searching State Spinner / Pulse -->
            <div id="login-searching-state" style="display: block; padding: 14px 0;">
              <div style="position: relative; width: 68px; height: 68px; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
                <div class="command-center-glow" style="position: absolute; inset: -6px; border-radius: 50%; background: radial-gradient(circle, rgba(189,150,82,0.35), transparent 70%);"></div>
                <div style="width: 58px; height: 58px; border-radius: 50%; background: #161B1E; border: 2px solid ${tokens.primary}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(189,150,82,0.45);">
                  <span style="font-size: 1.5rem; color: ${tokens.primary}; animation: pulseDot 1s infinite alternate;">🔍</span>
                </div>
              </div>
              <h3 id="login-verify-headline" style="margin: 0 0 6px 0; font-size: 1.15rem; font-weight: 800; color: ${tokens.textPrimary};">
                Verifying Your Workspace...
              </h3>
              <p style="margin: 0 0 16px 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">
                Searching registered organizations, verified staff permissions & active security profiles.
              </p>

              <!-- Scanning Progress Bar -->
              <div style="height: 5px; background: #161B1E; border-radius: 3px; overflow: hidden; border: 1px solid ${tokens.border}; margin: 0 auto; max-width: 320px;">
                <div id="login-verify-progress-fill" style="width: 25%; height: 100%; background: linear-gradient(90deg, #BD9652, #4ADE80); box-shadow: 0 0 10px rgba(189,150,82,0.6); transition: width 0.35s ease;"></div>
              </div>
            </div>

            <!-- Verified Staff Record Card (Revealed upon search completion with all green checkmarks) -->
            <div id="login-verified-state" style="display: none; animation: fadeIn 0.3s ease-out;">
              <div style="background: rgba(74, 222, 128, 0.08); border: 1px solid #1E4620; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; color: #4ADE80; font-size: 0.8125rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span>✓</span> <span>Workspace Verified Successfully</span>
              </div>

              <div style="background: #161B1E; border: 1px solid ${tokens.borderStrong}; border-radius: 10px; padding: 16px 18px; text-align: left; margin-bottom: 20px; font-size: 0.8125rem; display: flex; flex-direction: column; gap: 10px;">
                
                <!-- Item 1: Company / Workspace -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222830; padding-bottom: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #4ADE80; font-weight: 800; font-size: 0.95rem;">✓</span>
                    <span style="color: ${tokens.textSecondary};">Company Workspace:</span>
                  </div>
                  <div style="text-align: right;">
                    <strong id="login-dyn-company" style="color: ${tokens.textPrimary};">Verified Organization</strong>
                    <div id="login-dyn-slug" style="font-size: 0.7rem; color: ${tokens.primary}; font-family: var(--stokrova-font-mono);">workspace.stokrova.com</div>
                  </div>
                </div>

                <!-- Item 2: Staff Member & Role -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222830; padding-bottom: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #4ADE80; font-weight: 800; font-size: 0.95rem;">✓</span>
                    <span style="color: ${tokens.textSecondary};">Staff Member:</span>
                  </div>
                  <strong id="login-dyn-name" style="color: ${tokens.textPrimary};">Staff Member</strong>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222830; padding-bottom: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #4ADE80; font-weight: 800; font-size: 0.95rem;">✓</span>
                    <span style="color: ${tokens.textSecondary};">Assigned Role:</span>
                  </div>
                  <span id="login-dyn-role" style="background: rgba(189,150,82,0.18); color: ${tokens.primary}; font-weight: 700; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px;">Verified Staff</span>
                </div>

                <!-- Item 3: Last Active Time/Day -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222830; padding-bottom: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #4ADE80; font-weight: 800; font-size: 0.95rem;">✓</span>
                    <span style="color: ${tokens.textSecondary};">Last Active:</span>
                  </div>
                  <span id="login-dyn-last-active" style="color: #4ADE80; font-family: var(--stokrova-font-mono); font-size: 0.75rem; font-weight: 600;">Today at 09:42 AM</span>
                </div>

                <!-- Item 4: Data Privacy & Security Status -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #4ADE80; font-weight: 800; font-size: 0.95rem;">✓</span>
                    <span style="color: ${tokens.textSecondary};">Data Isolation:</span>
                  </div>
                  <span style="color: #4ADE80; font-family: var(--stokrova-font-mono); font-size: 0.75rem; font-weight: 600;">Dedicated Privacy Active ✓</span>
                </div>

              </div>

              <!-- Confirmation Actions -->
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <button type="button" onclick="window.stokrovaCustomerApp.backToLoginCredentials()" style="min-height: 44px; padding: 10px 16px; border-radius: 6px; border: 1px solid ${tokens.border}; background: transparent; color: ${tokens.textPrimary}; font-size: 0.8125rem; cursor: pointer;">
                  ← Switch Account
                </button>
                <button id="btn-confirm-login" type="button" onclick="window.stokrovaCustomerApp.confirmLoginLaunch()" style="min-height: 44px; padding: 10px 24px; border-radius: 6px; border: none; background: ${tokens.primary}; color: #0E1116; font-weight: 800; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 14px rgba(189,150,82,0.4);">
                  Confirm & Enter Dashboard →
                </button>
              </div>

            </div>

            <!-- Unregistered / Not Found State -->
            <div id="login-not-found-state" style="display: none; animation: fadeIn 0.3s ease-out;">
              <div style="background: rgba(248, 113, 113, 0.1); border: 1px solid #5C1D24; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; color: #F87171; font-size: 0.8125rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span>⚠️</span> <span>Workspace Not Found</span>
              </div>
              <div style="background: #161B1E; border: 1px solid ${tokens.borderStrong}; border-radius: 10px; padding: 16px 18px; text-align: left; margin-bottom: 20px; font-size: 0.8125rem; color: ${tokens.textSecondary}; line-height: 1.6;">
                No registered business workspace was found for <strong id="login-not-found-email" style="color: ${tokens.textPrimary}; font-family: var(--stokrova-font-mono);">...</strong>.<br><br>
                Please ask your organization administrator to invite you to their workspace, or register a new company.
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                <button type="button" onclick="window.stokrovaCustomerApp.backToLoginCredentials()" style="min-height: 44px; padding: 10px 16px; border-radius: 6px; border: 1px solid ${tokens.border}; background: transparent; color: ${tokens.textPrimary}; font-size: 0.8125rem; cursor: pointer;">
                  ← Try Another Email
                </button>
                <button type="button" onclick="window.stokrovaCustomerApp.closeLoginModal(); window.stokrovaCustomerApp.openRegisterModal();" style="min-height: 44px; padding: 10px 20px; border-radius: 6px; border: none; background: ${tokens.primary}; color: #0E1116; font-weight: 800; font-size: 0.85rem; cursor: pointer;">
                  Register Your Business →
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    `;
  }

  /**
   * Section 8: Interactive Demo Confirmation Warning Dialog.
   */
  public renderDemoConfirmModalHtml(): string {
    const tokens = themeTokens[this.theme];
    return `
      <div id="modal-demo-confirm" role="dialog" aria-modal="true" aria-labelledby="demo-confirm-title" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); z-index: 20000; align-items: center; justify-content: center; padding: 16px;">
        <div class="modal-dialog-inner" style="background: ${tokens.surface}; border: 1px solid ${tokens.primary}; border-radius: 12px; width: 100%; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,0.7); padding: 28px 22px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.4rem; color: ${tokens.primary};">◆</span>
              <h2 id="demo-confirm-title" style="margin: 0; font-size: 1.2rem; color: ${tokens.textPrimary}; font-weight: 800;">Open Live Interactive Demo</h2>
            </div>
            <button onclick="window.stokrovaCustomerApp.closeDemoConfirmModal()" aria-label="Close dialog" style="background: none; border: none; width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.5rem; color: ${tokens.textMuted}; cursor: pointer;">&times;</button>
          </div>

          <p style="font-size: 0.875rem; line-height: 1.55; color: ${tokens.textSecondary}; margin: 0 0 16px 0;">
            You are about to launch a live interactive preview workspace with full operational access.
          </p>

          <div style="background: #161B1E; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px 14px; font-size: 0.8125rem; color: ${tokens.textSecondary}; margin-bottom: 20px; display: flex; flex-direction: column; gap: 7px;">
            <div>✓ Ring items on the offline-first touch POS register</div>
            <div>✓ Inspect automated double-entry ledger postings</div>
            <div>✓ Explore multi-branch transfers & in-transit tracking</div>
            <div>✓ Full access across all 28 business workspace views</div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;">
            <button type="button" onclick="window.stokrovaCustomerApp.closeDemoConfirmModal()" style="min-height: 44px; padding: 10px 18px; border-radius: 6px; border: 1px solid ${tokens.border}; background: transparent; color: ${tokens.textPrimary}; font-size: 0.875rem; cursor: pointer;">
              Cancel
            </button>
            <button type="button" onclick="window.stokrovaCustomerApp.proceedToDemo()" style="min-height: 44px; padding: 10px 22px; border-radius: 6px; border: none; background: ${tokens.primary}; color: #0E1116; font-weight: 700; font-size: 0.875rem; cursor: pointer;">
              Open demo →
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Section 9: Legal & Compliance Informative Dialogs for Privacy and Terms.
   */
  public renderLegalModalHtml(): string {
    const tokens = themeTokens[this.theme];
    return `
      <div id="modal-legal" role="dialog" aria-modal="true" aria-labelledby="legal-modal-title" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); z-index: 20000; align-items: center; justify-content: center; padding: 16px;">
        <div class="modal-dialog-inner" style="background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; width: 100%; max-width: 580px; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.7); padding: 28px 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 id="legal-modal-title" style="margin: 0; font-size: 1.2rem; color: ${tokens.textPrimary}; font-weight: 800;">Legal & Security Compliance</h2>
            <button onclick="window.stokrovaCustomerApp.closeLegalModal()" aria-label="Close dialog" style="background: none; border: none; width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.5rem; color: ${tokens.textMuted}; cursor: pointer;">&times;</button>
          </div>

          <div id="legal-modal-body" style="font-size: 0.875rem; line-height: 1.6; color: ${tokens.textSecondary};">
            <h4 style="color: ${tokens.textPrimary}; margin: 14px 0 4px 0;">Enterprise Multi-Tenant Data Isolation</h4>
            <p>Every business subscriber's catalog, financial records, orders, and customer information are kept strictly isolated in dedicated, protected environments. Cross-organization data sharing is strictly prevented.</p>

            <h4 style="color: ${tokens.textPrimary}; margin: 14px 0 4px 0;">Offline Outbox & Financial Ledger Immutability</h4>
            <p>All sales and inventory adjustments post append-only journal entries. Financial transactions are never overwritten or silently deleted; corrections require explicit compensating debit/credit reversals.</p>

            <h4 style="color: ${tokens.textPrimary}; margin: 14px 0 4px 0;">Privacy & Data Sovereignty</h4>
            <p>Customer contact information is strictly used for workspace provisioning, order invoicing, and receipts. We do not sell or monetize tenant transaction telemetry.</p>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
            <button type="button" onclick="window.stokrovaCustomerApp.closeLegalModal()" style="min-height: 44px; padding: 10px 20px; border-radius: 6px; border: 1px solid ${tokens.border}; background: transparent; color: ${tokens.textPrimary}; font-size: 0.875rem; cursor: pointer;">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
  }

  public renderFooterHtml(): string {
    const tokens = themeTokens[this.theme];
    return `
      <footer style="background: ${tokens.surface}; border-top: 1px solid ${tokens.border}; padding: 44px 32px 28px 32px; color: ${tokens.textMuted}; font-size: 0.8125rem;">
        <div style="max-width: 1120px; margin: 0 auto; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 28px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <img src="./assets/stokrova-symbol.png" alt="" width="22" height="22" style="display: block; object-fit: contain;" onerror="this.style.display='none'; document.getElementById('ftr-fallback-sym').style.display='inline-block';" />
              <span id="ftr-fallback-sym" style="display: none; color: ${tokens.primary}; font-weight: 800;">◆</span>
              <span style="color: ${tokens.textPrimary}; font-weight: 800; font-size: 1.1rem; letter-spacing: 0.05em;">STOKROVA</span>
            </div>
            <p style="margin: 0 0 10px 0; max-width: 320px; line-height: 1.5; color: ${tokens.textSecondary};">
              Enterprise multi-branch inventory, retail POS, and financial orchestration operating platform.
            </p>
            <div style="font-family: var(--stokrova-font-mono); font-size: 0.75rem; color: ${tokens.primary};">
              Enterprise Multi-Tenant Security • Precision Currency Engine
            </div>
          </div>

          <div style="display: flex; gap: 40px; flex-wrap: wrap;">
            <div>
              <div style="font-weight: 700; color: ${tokens.textPrimary}; margin-bottom: 10px; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.08em;">Platform</div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <a href="#features" style="color: ${tokens.textSecondary}; text-decoration: none; min-height: 32px; display: inline-flex; align-items: center;">Features</a>
                <a href="#money-flow" style="color: ${tokens.textSecondary}; text-decoration: none; min-height: 32px; display: inline-flex; align-items: center;">Money Flow</a>
                <a href="#pricing" style="color: ${tokens.textSecondary}; text-decoration: none; min-height: 32px; display: inline-flex; align-items: center;">Pricing</a>
                <a href="https://admin.stokrova.com" target="_blank" style="color: ${tokens.primary}; text-decoration: none; font-weight: 600; min-height: 32px; display: inline-flex; align-items: center;">👑 Platform admin (staff only)</a>
              </div>
            </div>
            <div>
              <div style="font-weight: 700; color: ${tokens.textPrimary}; margin-bottom: 10px; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.08em;">Legal & Compliance</div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <a href="#" onclick="window.stokrovaCustomerApp.openLegalModal('isolation'); return false;" style="color: ${tokens.textSecondary}; text-decoration: none; min-height: 32px; display: inline-flex; align-items: center;">Tenant Isolation Guarantee</a>
                <a href="#" onclick="window.stokrovaCustomerApp.openLegalModal('ledger'); return false;" style="color: ${tokens.textSecondary}; text-decoration: none; min-height: 32px; display: inline-flex; align-items: center;">Immutable Financial History</a>
                <a href="#" onclick="window.stokrovaCustomerApp.openLegalModal('privacy'); return false;" style="color: ${tokens.textSecondary}; text-decoration: none; min-height: 32px; display: inline-flex; align-items: center;">Privacy Policy</a>
                <a href="#" onclick="window.stokrovaCustomerApp.openLegalModal('terms'); return false;" style="color: ${tokens.textSecondary}; text-decoration: none; min-height: 32px; display: inline-flex; align-items: center;">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>

        <div style="max-width: 1120px; margin: 32px auto 0 auto; padding-top: 20px; border-top: 1px solid ${tokens.border}; text-align: center; font-size: 0.75rem; color: ${tokens.textMuted};">
          © ${new Date().getFullYear()} STOKROVA. All rights reserved.
        </div>
      </footer>
    `;
  }
}
