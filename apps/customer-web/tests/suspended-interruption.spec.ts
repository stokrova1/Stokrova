import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Customer Web — Branded Business Access Suspended Interruption Screen', () => {
  const distHtmlPath = path.resolve(__dirname, '../dist/index.html');

  it('generates the complete index.html containing the branded interruption screen container', () => {
    expect(fs.existsSync(distHtmlPath)).toBe(true);
    const html = fs.readFileSync(distHtmlPath, 'utf-8');

    // 1. Interruption Screen Container
    expect(html).toContain('id="stokrova-suspended-screen"');
    expect(html).toContain('STOKROVA');
    expect(html).toContain('Business Access Suspended');
    expect(html).toContain('Security & Access Enforcement');

    // 2. Verified Support Information
    expect(html).toContain('support@stokrova.com');
    expect(html).toContain('mailto:support@stokrova.com?subject=Business%20Suspension%20Resolution%20Inquiry');

    // 3. Organization Snapshot Elements
    expect(html).toContain('id="suspended-tenant-name-display"');
    expect(html).toContain('Locked by Platform Super-Admin');

    // 4. Operational Restrictions Explained
    expect(html).toContain('All active operations—including till transactions, POS checkout, warehouse dispatch');

    // 5. Verified Exit & Action Controls
    expect(html).toContain('window.stokrovaCustomerApp.signOutAndReturnHome()');
    expect(html).toContain('Sign Out / Return to Home');
    expect(html).toContain('Contact Platform Support');
  });

  it('contains client-side suspension enforcement logic and 403 fetch interceptor', () => {
    const html = fs.readFileSync(distHtmlPath, 'utf-8');

    // Interceptor check
    expect(html).toContain('showSuspendedScreen');
    expect(html).toContain('stokrova_tenant_suspended');
    expect(html).toContain('TENANT_SUSPENDED');
  });
});
