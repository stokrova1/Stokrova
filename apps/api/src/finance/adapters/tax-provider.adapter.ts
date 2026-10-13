// ============================================================================
// STOKROVA — Tax Provider Adapter Interface & Sandbox Provider
// Benchmark: Avalara AvaTax, Vertex, HMRC MTD, SARS eFiling
// Rule 8, 9: Truthful provider states, timeouts do not imply duplicate submissions
// ============================================================================

export interface TaxSubmissionPayload {
  filing_period: string;
  tax_id_number: string;
  total_taxable_sales_minor: string;
  total_output_tax_minor: string;
  total_taxable_purchases_minor: string;
  total_recoverable_input_tax_minor: string;
  net_tax_due_minor: string;
}

export interface TaxSubmissionResult {
  submission_reference: string;
  provider_status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'TIMEOUT_PENDING';
  acknowledgement_token?: string;
  error_message?: string;
}

export interface ITaxProviderAdapter {
  submitReturn(payload: TaxSubmissionPayload): Promise<TaxSubmissionResult>;
  getSubmissionStatus(submissionReference: string): Promise<TaxSubmissionResult>;
}

export class MockTaxProviderAdapter implements ITaxProviderAdapter {
  private simulateTimeout = false;
  private submissions = new Map<string, TaxSubmissionResult>();

  setSimulateTimeout(simulate: boolean): void {
    this.simulateTimeout = simulate;
  }

  async submitReturn(_payload: TaxSubmissionPayload): Promise<TaxSubmissionResult> {
    const ref = `TAX-ACK-${Date.now()}`;
    if (this.simulateTimeout) {
      const result: TaxSubmissionResult = {
        submission_reference: ref,
        provider_status: 'TIMEOUT_PENDING',
        error_message: 'Gateway timeout awaiting tax authority acknowledgement',
      };
      this.submissions.set(ref, {
        submission_reference: ref,
        provider_status: 'ACCEPTED',
        acknowledgement_token: `TOKEN-${Date.now()}`,
      });
      return result;
    }

    const result: TaxSubmissionResult = {
      submission_reference: ref,
      provider_status: 'ACCEPTED',
      acknowledgement_token: `TOKEN-${Date.now()}`,
    };
    this.submissions.set(ref, result);
    return result;
  }

  async getSubmissionStatus(submissionReference: string): Promise<TaxSubmissionResult> {
    const existing = this.submissions.get(submissionReference);
    if (existing) {
      return existing;
    }
    return {
      submission_reference: submissionReference,
      provider_status: 'REJECTED',
      error_message: 'Submission reference not found on authority portal',
    };
  }
}
