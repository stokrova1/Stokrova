import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import {
  IntercompanyRelationship,
  IntercompanyTransaction,
  IntercompanyMatch,
  RecordIntercompanyTransactionRequest,
} from '@stokrova/contracts';
import { calculateIntercompanyDiscrepancy } from '@stokrova/domain';

@Injectable()
export class IntercompanyService {
  private relationships: Map<string, IntercompanyRelationship> = new Map();
  private transactions: Map<string, IntercompanyTransaction> = new Map();
  private matches: Map<string, IntercompanyMatch> = new Map();

  async createRelationship(
    tenantId: string,
    primaryCompanyId: string,
    counterpartyCompanyId: string,
    relationshipType: 'PARENT' | 'SUBSIDIARY' | 'SISTER' | 'AFFILIATE' = 'SUBSIDIARY',
    settlementCurrency: string = 'USD',
  ): Promise<IntercompanyRelationship> {
    const key = `${tenantId}:${primaryCompanyId}:${counterpartyCompanyId}`;
    if (this.relationships.has(key)) {
      throw new ConflictException('Intercompany relationship already exists');
    }

    const rel: IntercompanyRelationship = {
      id: `rel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      primary_company_id: primaryCompanyId,
      counterparty_company_id: counterpartyCompanyId,
      relationship_type: relationshipType,
      settlement_currency: settlementCurrency,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    this.relationships.set(key, rel);
    return rel;
  }

  async recordTransaction(
    tenantId: string,
    req: RecordIntercompanyTransactionRequest,
  ): Promise<IntercompanyTransaction> {
    const key = `${tenantId}:${req.transaction_reference}`;
    const existing = this.transactions.get(key);
    if (existing) {
      return existing; // Idempotent return
    }

    const tx: IntercompanyTransaction = {
      id: `ictx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      transaction_reference: req.transaction_reference,
      from_company_id: req.from_company_id,
      to_company_id: req.to_company_id,
      transaction_type: req.transaction_type,
      source_document_type: req.source_document_type,
      source_document_id: req.source_document_id,
      currency: req.currency || 'USD',
      amount_minor: req.amount_minor,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    this.transactions.set(key, tx);
    return tx;
  }

  async matchTransactions(
    tenantId: string,
    fromTxId: string,
    toTxId?: string,
    toleranceMinor: string = '0',
  ): Promise<IntercompanyMatch> {
    const fromTx = Array.from(this.transactions.values()).find(
      (t) => t.id === fromTxId && t.tenant_id === tenantId,
    );
    if (!fromTx) {
      throw new NotFoundException(`From-transaction ${fromTxId} not found`);
    }

    let toTx: IntercompanyTransaction | undefined;
    let toAmountMinor = '0';
    if (toTxId) {
      toTx = Array.from(this.transactions.values()).find(
        (t) => t.id === toTxId && t.tenant_id === tenantId,
      );
      if (!toTx) {
        throw new NotFoundException(`To-transaction ${toTxId} not found`);
      }
      toAmountMinor = toTx.amount_minor;
    }

    const { discrepancy_minor, match_status } = calculateIntercompanyDiscrepancy(
      fromTx.amount_minor,
      toAmountMinor,
      toleranceMinor,
    );

    const match: IntercompanyMatch = {
      id: `icmatch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      from_transaction_id: fromTxId,
      to_transaction_id: toTxId || null,
      match_status,
      matched_amount_minor: toTx ? toTx.amount_minor : '0',
      discrepancy_minor,
      matched_at: new Date().toISOString(),
    };

    this.matches.set(match.id, match);

    // Update transaction statuses
    if (match_status === 'MATCHED') {
      fromTx.status = 'MATCHED';
      if (toTx) toTx.status = 'MATCHED';
    } else {
      fromTx.status = 'UNMATCHED';
      if (toTx) toTx.status = 'UNMATCHED';
    }

    return match;
  }

  async getUnmatchedTransactions(
    tenantId: string,
  ): Promise<IntercompanyTransaction[]> {
    return Array.from(this.transactions.values()).filter(
      (t) => t.tenant_id === tenantId && (t.status === 'PENDING' || t.status === 'UNMATCHED'),
    );
  }

  async getTransaction(
    tenantId: string,
    transactionId: string,
  ): Promise<IntercompanyTransaction | null> {
    return (
      Array.from(this.transactions.values()).find(
        (t) => t.id === transactionId && t.tenant_id === tenantId,
      ) || null
    );
  }
}
