import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ActionOutcome,
  ActionFeedbackFactory,
  ActionDispatcher,
  type ActionExecutionConfig,
} from '../src/index.js';

describe('ActionDispatcher & Truthful Feedback Standard (STD-QA-042)', () => {
  describe('1. Canonical ActionOutcome Enumeration & Status Mappings', () => {
    it('defines all 7 canonical outcomes without mock or fake success states', () => {
      expect(ActionOutcome.SUCCEEDED).toBe('SUCCEEDED');
      expect(ActionOutcome.ACCEPTED_PENDING).toBe('ACCEPTED_PENDING');
      expect(ActionOutcome.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(ActionOutcome.FORBIDDEN).toBe('FORBIDDEN');
      expect(ActionOutcome.EMPTY).toBe('EMPTY');
      expect(ActionOutcome.NOT_STARTED).toBe('NOT_STARTED');
      expect(ActionOutcome.FAILED).toBe('FAILED');
    });
  });

  describe('2. ActionFeedbackFactory Truthful Outcome Generation', () => {
    it('creates SUCCEEDED feedback with 200 status code and authoritative payload', () => {
      const feedback = ActionFeedbackFactory.success(
        '✓ General Ledger JRNL-1002 balanced and posted.',
        { journalId: 'JRNL-1002', balanced: true },
        'JRNL-1002',
      );

      expect(feedback.outcome).toBe(ActionOutcome.SUCCEEDED);
      expect(feedback.statusCode).toBe(200);
      expect(feedback.isSuccess).toBe(true);
      expect(feedback.referenceId).toBe('JRNL-1002');
      expect(feedback.data).toEqual({ journalId: 'JRNL-1002', balanced: true });
      expect(feedback.timestamp).toBeInstanceOf(Date);
    });

    it('creates ACCEPTED_PENDING feedback with 202 status code and tracking ticket', () => {
      const feedback = ActionFeedbackFactory.acceptedPending(
        '⏳ Mass inventory revaluation queued for background batch execution.',
        'job_batch_val_99182',
        { queuedItems: 540 },
      );

      expect(feedback.outcome).toBe(ActionOutcome.ACCEPTED_PENDING);
      expect(feedback.statusCode).toBe(202);
      expect(feedback.isSuccess).toBe(true);
      expect(feedback.referenceId).toBe('job_batch_val_99182');
      expect(feedback.message).toContain('queued');
    });

    it('creates VALIDATION_FAILED feedback with 400 status and rejected field metadata', () => {
      const feedback = ActionFeedbackFactory.validationFailed(
        'Validation Failed: Blind cash count delta exceeds permitted discrepancy threshold.',
        { field: 'cashFloatVariance', expected: 0.0, actual: 45.5 },
      );

      expect(feedback.outcome).toBe(ActionOutcome.VALIDATION_FAILED);
      expect(feedback.statusCode).toBe(400);
      expect(feedback.isSuccess).toBe(false);
      expect(feedback.message).toContain('Validation Failed');
    });

    it('creates FORBIDDEN feedback with 403 status code and security audit context', () => {
      const feedback = ActionFeedbackFactory.forbidden(
        'Access Denied: Cashier role is not authorized to execute general ledger manual voucher posting.',
        { role: 'CASHIER', requiredPermission: 'gl:post_manual_voucher' },
      );

      expect(feedback.outcome).toBe(ActionOutcome.FORBIDDEN);
      expect(feedback.statusCode).toBe(403);
      expect(feedback.isSuccess).toBe(false);
    });

    it('creates EMPTY feedback with 204 status code indicating zero matches without error', () => {
      const feedback = ActionFeedbackFactory.empty(
        'No matching open purchase orders found awaiting GRN receipt.',
        { filter: 'status:OPEN' },
      );

      expect(feedback.outcome).toBe(ActionOutcome.EMPTY);
      expect(feedback.statusCode).toBe(204);
      expect(feedback.isSuccess).toBe(true);
    });

    it('creates FAILED feedback with 500 status code and diagnostic error message', () => {
      const error = new Error('Database connection pool exhausted during transaction commit');
      const feedback = ActionFeedbackFactory.failed(
        'Operation Failed: Unable to persist order dispatch manifest due to storage timeout.',
        error,
        'ERR_TX_COMMIT_TIMEOUT',
      );

      expect(feedback.outcome).toBe(ActionOutcome.FAILED);
      expect(feedback.statusCode).toBe(500);
      expect(feedback.isSuccess).toBe(false);
      expect(feedback.referenceId).toBe('ERR_TX_COMMIT_TIMEOUT');
      expect(feedback.message).toContain('Operation Failed');
    });
  });

  describe('3. ActionDispatcher Execution Control & Debouncing', () => {
    let mockButton: any;

    beforeEach(() => {
      mockButton = {
        disabled: false,
        textContent: 'Post Journal',
        attributes: {} as Record<string, string>,
        setAttribute(k: string, v: string) {
          this.attributes[k] = v;
        },
        removeAttribute(k: string) {
          delete this.attributes[k];
        },
        getAttribute(k: string) {
          return this.attributes[k];
        },
      };
    });

    it('manages button disabled state and aria-busy attribute during asynchronous execution', async () => {
      const dispatcher = new ActionDispatcher();
      let stateWhileExecuting = { disabled: false, ariaBusy: '' };

      const actionFn = async () => {
        stateWhileExecuting = {
          disabled: mockButton.disabled,
          ariaBusy: mockButton.getAttribute('aria-busy'),
        };
        return ActionFeedbackFactory.success('Action finished');
      };

      const result = await dispatcher.execute({
        button: mockButton,
        action: actionFn,
        loadingText: 'Posting...',
      });

      expect(stateWhileExecuting.disabled).toBe(true);
      expect(stateWhileExecuting.ariaBusy).toBe('true');
      expect(mockButton.disabled).toBe(false);
      expect(mockButton.getAttribute('aria-busy')).toBeUndefined();
      expect(mockButton.textContent).toBe('Post Journal');
      expect(result.outcome).toBe(ActionOutcome.SUCCEEDED);
    });

    it('debounces rapid double-clicks and prevents duplicate backend mutation invocations', async () => {
      const dispatcher = new ActionDispatcher();
      let executionCount = 0;

      const slowAction = async () => {
        executionCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return ActionFeedbackFactory.success('Processed');
      };

      // Dispatch twice concurrently with the same button
      const p1 = dispatcher.execute({ button: mockButton, action: slowAction });
      const p2 = dispatcher.execute({ button: mockButton, action: slowAction });

      const [res1, res2] = await Promise.all([p1, p2]);

      expect(executionCount).toBe(1);
      expect(res1.outcome).toBe(ActionOutcome.SUCCEEDED);
      expect(res2.outcome).toBe(ActionOutcome.VALIDATION_FAILED);
      expect(res2.message).toContain('already in progress');
    });

    it('safely handles uncaught exceptions thrown during execution and restores button state', async () => {
      const dispatcher = new ActionDispatcher();
      const faultyAction = async () => {
        throw new Error('Hardware peripheral connection dropped abruptly');
      };

      const feedback = await dispatcher.execute({
        button: mockButton,
        action: faultyAction,
        loadingText: 'Communicating...',
      });

      expect(feedback.outcome).toBe(ActionOutcome.FAILED);
      expect(feedback.isSuccess).toBe(false);
      expect(feedback.message).toContain('Hardware peripheral connection dropped abruptly');
      expect(mockButton.disabled).toBe(false);
      expect(mockButton.textContent).toBe('Post Journal');
    });
  });
});
