import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  PunchoutSetupRequest,
  PunchoutOrderMessage,
} from '@stokrova/contracts';
import {
  parseCxmlPunchoutSetupRequest,
  generateCxmlPunchoutOrderMessage,
} from '@stokrova/domain';

export interface PunchoutSessionRecord {
  sessionId: string;
  tenantId: string;
  organizationId: string;
  buyerCookie: string;
  fromIdentity: string;
  toIdentity: string;
  browserFormPostUrl: string;
  createdAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'CHECKED_OUT' | 'EXPIRED';
}

@Injectable()
export class B2bPunchoutService {
  private readonly sessions = new DurableMap<PunchoutSessionRecord>('b2b_punchout_sessions');

  async handlePunchoutSetupXml(
    tenantId: string,
    organizationId: string,
    cxmlContent: string,
    expectedSecret?: string,
  ): Promise<{ sessionId: string; startUrl: string; buyerCookie: string }> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const setupReq: PunchoutSetupRequest = parseCxmlPunchoutSetupRequest(cxmlContent);
    if (expectedSecret && setupReq.shared_secret !== expectedSecret) {
      throw new BadRequestException('PunchOut shared secret mismatch');
    }

    const sessionId = `pnch_${randomUUID()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

    const session: PunchoutSessionRecord = {
      sessionId,
      tenantId,
      organizationId,
      buyerCookie: setupReq.buyer_cookie,
      fromIdentity: setupReq.from_identity,
      toIdentity: setupReq.to_identity,
      browserFormPostUrl: setupReq.browser_form_post_url,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'ACTIVE',
    };

    this.sessions.set(sessionId, session);

    return {
      sessionId,
      startUrl: `/b2b/portal/punchout-catalog?sessionId=${sessionId}`,
      buyerCookie: setupReq.buyer_cookie,
    };
  }

  async getSession(
    tenantId: string,
    sessionId: string,
  ): Promise<PunchoutSessionRecord> {
    const s = this.sessions.get(sessionId);
    if (!s || s.tenantId !== tenantId) {
      throw new NotFoundException(`PunchOut session '${sessionId}' not found`);
    }
    return s;
  }

  async checkoutPunchoutCart(
    tenantId: string,
    sessionId: string,
    orderMessage: PunchoutOrderMessage,
  ): Promise<{ cxmlMessage: string; browserFormPostUrl: string }> {
    const session = await this.getSession(tenantId, sessionId);
    if (session.status !== 'ACTIVE') {
      throw new BadRequestException(`PunchOut session is '${session.status}'`);
    }

    const cxmlMessage = generateCxmlPunchoutOrderMessage(orderMessage);

    // Mark session as checked out
    session.status = 'CHECKED_OUT';
    this.sessions.set(sessionId, session);

    return {
      cxmlMessage,
      browserFormPostUrl: session.browserFormPostUrl,
    };
  }
}
