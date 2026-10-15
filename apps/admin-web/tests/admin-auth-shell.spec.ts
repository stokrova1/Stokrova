import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Phase 26 @stokrova/admin-web — Platform Founder Authentication & Governance Session Suite', () => {
  const distHtmlPath = path.resolve(__dirname, '../dist/index.html');
  const html = fs.readFileSync(distHtmlPath, 'utf-8');

  describe('1. Branded Platform Founder Sovereign Login Screen', () => {
    it('renders the dedicated sovereign login screen (#admin-login-screen) on the root console', () => {
      expect(html).toContain('id="admin-login-screen"');
      expect(html).toContain('👑');
      expect(html).toContain('STOKROVA');
      expect(html).toContain('Platform Founder Console');
      expect(html).toContain('Sovereign Root Access & Multi-Tenant Infrastructure Governance');
    });

    it('enforces high-security infrastructure restriction notice specifically citing stokrova1@gmail.com', () => {
      expect(html).toContain('RESTRICTED PLATFORM INFRASTRUCTURE');
      expect(html).toContain('stokrova1@gmail.com');
      expect(html).toContain('Reserved strictly for Platform Super-Administrators');
      expect(html).toContain('Business owners and staff must authenticate via the customer portal.');
    });

    it('includes required email and password fields with security toggle', () => {
      expect(html).toContain('id="founder-login-email"');
      expect(html).toContain('type="email"');
      expect(html).toContain('value="stokrova1@gmail.com"');
      expect(html).toContain('id="founder-login-password"');
      expect(html).toContain('type="password"');
      expect(html).toContain('id="btn-toggle-password"');
      expect(html).toContain('onclick="window.stokrovaFounder.togglePasswordVisibility()"');
    });

    it('provides an error alert container and unlock submit action', () => {
      expect(html).toContain('id="admin-login-error"');
      expect(html).toContain('id="btn-admin-login-submit"');
      expect(html).toContain('Authenticate & Unlock Terminal');
      expect(html).toContain('Enterprise Encrypted Session • Verified Audit Trail');
    });
  });

  describe('2. Authenticated Console Layout Separation & Lock Header Action', () => {
    it('wraps authenticated portal layout in #admin-authenticated-layout with initial display none', () => {
      expect(html).toContain('id="admin-authenticated-layout"');
      expect(html).toContain('style="display: none;');
      expect(html).toContain('class="founder-top-bar"');
      expect(html).toContain('class="app-layout"');
    });

    it('provides Lock Console & Sign Out action in the founder header', () => {
      expect(html).toContain('id="btn-open-signout"');
      expect(html).toContain('window.stokrovaFounder.openSignOutModal()');
      expect(html).toContain('Lock & Sign Out');
      expect(html).toContain('id="founder-user-badge-email"');
    });
  });

  describe('3. Platform Governance Sign Out Warning Modal', () => {
    it('renders modal dialog with critical governance warning and hazard indicator', () => {
      expect(html).toContain('id="admin-signout-modal"');
      expect(html).toContain('Platform Governance Warning');
      expect(html).toContain('Termination of Sovereign Root Session');
      expect(html).toContain('CRITICAL');
      expect(html).toContain('⚠️');
    });

    it('warns that root administrative capabilities and tenant killswitches will be locked', () => {
      expect(html).toContain('All root administrative capabilities will be locked immediately.');
      expect(html).toContain('Multi-tenant governance controls and tenant suspension killswitches will become inaccessible.');
      expect(html).toContain('Re-authentication with master founder credentials will be required to regain access.');
    });

    it('renders explicit Cancel and Terminate Session confirmation action buttons', () => {
      expect(html).toContain('id="btn-cancel-signout"');
      expect(html).toContain('onclick="window.stokrovaFounder.closeSignOutModal()"');
      expect(html).toContain('Cancel / Stay Signed In');

      expect(html).toContain('id="btn-confirm-signout"');
      expect(html).toContain('onclick="window.stokrovaFounder.confirmSignOut()"');
      expect(html).toContain('Terminate Session & Lock Console');
    });
  });

  describe('4. Interactive Founder Auth Controller Methods', () => {
    it('implements Supabase configuration and all required session lifecycle methods in window.stokrovaFounder', () => {
      expect(html).toContain('handleAdminLogin(e)');
      expect(html).toContain('togglePasswordVisibility()');
      expect(html).toContain('openSignOutModal()');
      expect(html).toContain('closeSignOutModal()');
      expect(html).toContain('confirmSignOut()');
      expect(html).toContain('checkExistingSession()');
      expect(html).toContain('SUPABASE_CONFIG');
      expect(html).toContain('stokrova_admin_authenticated');
    });
  });
});
