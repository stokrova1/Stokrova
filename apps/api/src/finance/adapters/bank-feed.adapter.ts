// ============================================================================
// STOKROVA — Bank Feed Adapter Interface & Sandbox Provider
// Benchmark: Plaid, Yapily, Open Banking UK, Tink
// Rule 9: No fabricated external integrations without clear adapter boundaries
// ============================================================================

export interface BankFeedTransactionPayload {
  external_transaction_id: string;
  transaction_date: string;
  amount_minor: string;
  currency: string;
  description: string;
  transaction_type?: 'DEPOSIT' | 'WITHDRAWAL' | 'FEE' | 'INTEREST' | 'TRANSFER' | 'OTHER';
}

export interface BankFeedSyncResult {
  provider_type: string;
  connection_id: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  transactions: BankFeedTransactionPayload[];
  cursor?: string;
}

export interface IBankFeedAdapter {
  syncFeed(connectionId: string, sinceCursor?: string): Promise<BankFeedSyncResult>;
}

export class MockBankFeedAdapter implements IBankFeedAdapter {
  private mockTransactions: BankFeedTransactionPayload[] = [];

  setMockTransactions(txs: BankFeedTransactionPayload[]): void {
    this.mockTransactions = [...txs];
  }

  async syncFeed(connectionId: string, _sinceCursor?: string): Promise<BankFeedSyncResult> {
    return {
      provider_type: 'SANDBOX',
      connection_id: connectionId,
      status: 'CONNECTED',
      transactions: this.mockTransactions,
      cursor: `cursor_${Date.now()}`,
    };
  }
}
