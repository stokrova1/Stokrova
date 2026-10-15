/**
 * STOKROVA — Master Action Dispatcher & Execution Controller
 * Implements Truthful Interaction Standard STD-QA-042.
 * Prevents premature success, enforces double-submission debouncing,
 * manages in-flight states, and guarantees deterministic feedback.
 */

export const ActionOutcome = {
  SUCCEEDED: 'SUCCEEDED',
  ACCEPTED_PENDING: 'ACCEPTED_PENDING',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  FORBIDDEN: 'FORBIDDEN',
  EMPTY: 'EMPTY',
  NOT_STARTED: 'NOT_STARTED',
  FAILED: 'FAILED',
} as const;

export type ActionOutcome = (typeof ActionOutcome)[keyof typeof ActionOutcome];

export interface ActionFeedback<T = unknown> {
  outcome: ActionOutcome;
  message: string;
  data?: T;
  errorDetails?: string;
  timestampIso: string;
  timestamp: Date;
  statusCode: number;
  isSuccess: boolean;
  referenceId?: string;
  queueDepth?: number;
  requiredPermission?: string;
  prerequisite?: string;
}

export interface DispatchActionOptions<T = unknown> {
  actionId?: string;
  triggerElement?: HTMLElement | null;
  button?: HTMLElement | null;
  loadingLabel?: string;
  loadingText?: string;
  execute?: () => Promise<ActionFeedback<T>>;
  action?: () => Promise<ActionFeedback<T>>;
  onOutcome?: (feedback: ActionFeedback<T>) => void;
  showToastFeedback?: boolean;
  toastContainerId?: string;
}

export class ActionFeedbackFactory {
  public static succeeded<T>(
    message: string,
    data?: T,
    referenceId?: string,
  ): ActionFeedback<T> {
    const now = new Date();
    return {
      outcome: ActionOutcome.SUCCEEDED,
      statusCode: 200,
      isSuccess: true,
      message,
      data,
      referenceId,
      timestamp: now,
      timestampIso: now.toISOString(),
    };
  }

  public static success<T>(
    message: string,
    data?: T,
    referenceId?: string,
  ): ActionFeedback<T> {
    return ActionFeedbackFactory.succeeded(message, data, referenceId);
  }

  public static acceptedPending<T>(
    message: string,
    queueOrRef: string | number = 1,
    data?: T,
  ): ActionFeedback<T> {
    const now = new Date();
    const queueDepth = typeof queueOrRef === 'number' ? queueOrRef : 1;
    const referenceId = typeof queueOrRef === 'string' ? queueOrRef : undefined;
    return {
      outcome: ActionOutcome.ACCEPTED_PENDING,
      statusCode: 202,
      isSuccess: true,
      message,
      data,
      queueDepth,
      referenceId,
      timestamp: now,
      timestampIso: now.toISOString(),
    };
  }

  public static validationFailed<T>(
    message: string,
    errorDetailsOrData?: any,
  ): ActionFeedback<T> {
    const now = new Date();
    const errorDetails = typeof errorDetailsOrData === 'string' ? errorDetailsOrData : undefined;
    const data = typeof errorDetailsOrData === 'object' ? errorDetailsOrData : undefined;
    return {
      outcome: ActionOutcome.VALIDATION_FAILED,
      statusCode: 400,
      isSuccess: false,
      message,
      data,
      errorDetails,
      timestamp: now,
      timestampIso: now.toISOString(),
    };
  }

  public static forbidden<T>(
    message: string,
    requiredPermissionOrData?: any,
  ): ActionFeedback<T> {
    const now = new Date();
    const requiredPermission = typeof requiredPermissionOrData === 'string' ? requiredPermissionOrData : undefined;
    const data = typeof requiredPermissionOrData === 'object' ? requiredPermissionOrData : undefined;
    return {
      outcome: ActionOutcome.FORBIDDEN,
      statusCode: 403,
      isSuccess: false,
      message,
      data,
      requiredPermission,
      timestamp: now,
      timestampIso: now.toISOString(),
    };
  }

  public static empty<T>(message: string, data?: T): ActionFeedback<T> {
    const now = new Date();
    return {
      outcome: ActionOutcome.EMPTY,
      statusCode: 204,
      isSuccess: true,
      message,
      data,
      timestamp: now,
      timestampIso: now.toISOString(),
    };
  }

  public static notStarted<T>(
    message: string,
    prerequisite?: string,
  ): ActionFeedback<T> {
    const now = new Date();
    return {
      outcome: ActionOutcome.NOT_STARTED,
      statusCode: 412,
      isSuccess: false,
      message,
      prerequisite,
      timestamp: now,
      timestampIso: now.toISOString(),
    };
  }

  public static failed<T>(
    message: string,
    error?: unknown,
    referenceId?: string,
  ): ActionFeedback<T> {
    const now = new Date();
    const errorDetails = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;
    return {
      outcome: ActionOutcome.FAILED,
      statusCode: 500,
      isSuccess: false,
      message,
      errorDetails,
      referenceId,
      timestamp: now,
      timestampIso: now.toISOString(),
    };
  }
}

export class ActionDispatcher {
  private inFlightActions = new Set<string>();

  /**
   * Alias for dispatch to support flexible test and client invocations.
   */
  public execute<T>(options: DispatchActionOptions<T>): Promise<ActionFeedback<T>> {
    return this.dispatch(options);
  }

  /**
   * Executes an action with automatic double-click debouncing,
   * button loading state rendering, and truthful outcome reporting.
   */
  public async dispatch<T>(options: DispatchActionOptions<T>): Promise<ActionFeedback<T>> {
    const triggerElement = options.triggerElement || options.button;
    const loadingLabel = options.loadingLabel || options.loadingText;
    const actionFn = options.execute || options.action;
    const actionId = options.actionId || (triggerElement ? `btn_${(triggerElement as any).id || (triggerElement as any).textContent || 'action'}` : 'anonymous_action');
    const { onOutcome, showToastFeedback = true } = options;

    if (!actionFn) {
      return ActionFeedbackFactory.failed('No executable action function was provided to ActionDispatcher.');
    }

    if (this.inFlightActions.has(actionId)) {
      const busyFeedback = ActionFeedbackFactory.validationFailed<T>(
        `Operation '${actionId}' is already in progress. Please wait for completion.`,
      );
      return busyFeedback;
    }

    this.inFlightActions.add(actionId);

    // Save previous button state
    let originalHtml: string | null = null;
    let originalText: string | null = null;
    let originalDisabled = false;

    if (triggerElement) {
      originalHtml = (triggerElement as any).innerHTML !== undefined ? triggerElement.innerHTML : null;
      originalText = triggerElement.textContent !== undefined ? triggerElement.textContent : null;
      originalDisabled = (triggerElement as HTMLButtonElement).disabled ?? false;
      (triggerElement as HTMLButtonElement).disabled = true;
      triggerElement.setAttribute('aria-busy', 'true');
      if (loadingLabel) {
        if ((triggerElement as any).innerHTML !== undefined) {
          triggerElement.innerHTML = `
            <span class="stokrova-spinner" style="display: inline-block; animation: spin 1s linear infinite; margin-right: 6px;">⟳</span>
            <span>${loadingLabel}</span>
          `.trim();
        } else {
          triggerElement.textContent = loadingLabel;
        }
      }
    }

    let feedback: ActionFeedback<T>;

    try {
      feedback = await actionFn();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      feedback = ActionFeedbackFactory.failed<T>(
        `Operation failed unexpectedly: ${errorMsg}`,
        errorMsg,
      );
    } finally {
      this.inFlightActions.delete(actionId);

      if (triggerElement) {
        triggerElement.removeAttribute('aria-busy');
        (triggerElement as HTMLButtonElement).disabled = originalDisabled;
        if (originalHtml !== null) {
          triggerElement.innerHTML = originalHtml;
        } else if (originalText !== null) {
          triggerElement.textContent = originalText;
        }
      }
    }

    if (showToastFeedback && typeof document !== 'undefined') {
      this.renderOutcomeToast(feedback, options.toastContainerId);
    }

    if (onOutcome) {
      try {
        onOutcome(feedback);
      } catch (_) {}
    }

    return feedback;
  }

  /**
   * Renders a truthful toast matching the ActionOutcome.
   */
  public renderOutcomeToast(feedback: ActionFeedback, containerId = 'toast-notification'): void {
    if (typeof document === 'undefined') return;

    const toast = document.getElementById(containerId);
    const toastMsg = document.getElementById('toast-message');

    if (!toast || !toastMsg) return;

    // Determine visual styling by outcome
    let prefix = '✓ ';
    let bgColor = '#14291F';
    let textColor = '#4ADE80';
    let borderColor = '#1E4620';

    switch (feedback.outcome) {
      case 'SUCCEEDED':
        prefix = '✓ ';
        bgColor = '#14291F';
        textColor = '#4ADE80';
        borderColor = '#1E4620';
        break;
      case 'ACCEPTED_PENDING':
        prefix = '⟳ [PENDING] ';
        bgColor = '#1E2428';
        textColor = '#60A5FA';
        borderColor = '#1E3A5F';
        break;
      case 'VALIDATION_FAILED':
        prefix = '⚠ [INVALID] ';
        bgColor = '#2C1518';
        textColor = '#F87171';
        borderColor = '#5C1D24';
        break;
      case 'FORBIDDEN':
        prefix = '🔒 [DENIED] ';
        bgColor = '#2C1518';
        textColor = '#F87171';
        borderColor = '#5C1D24';
        break;
      case 'EMPTY':
        prefix = 'ℹ [EMPTY] ';
        bgColor = '#1E2428';
        textColor = '#94A3B8';
        borderColor = '#334155';
        break;
      case 'NOT_STARTED':
        prefix = '⚡ [SETUP REQUIRED] ';
        bgColor = '#262013';
        textColor = '#FBBF24';
        borderColor = '#543F0F';
        break;
      case 'FAILED':
        prefix = '✕ [FAILED] ';
        bgColor = '#2C1518';
        textColor = '#F87171';
        borderColor = '#5C1D24';
        break;
    }

    toastMsg.textContent = `${prefix}${feedback.message}`;
    toast.style.display = 'flex';
    toast.style.background = bgColor;
    toast.style.color = textColor;
    toast.style.borderColor = borderColor;

    // Clear previous timeout if any
    const existingTimer = (toast as any)._dismissTimer;
    if (existingTimer) clearTimeout(existingTimer);

    (toast as any)._dismissTimer = setTimeout(() => {
      toast.style.display = 'none';
    }, feedback.outcome === 'FAILED' ? 7000 : 4500);
  }
}

export const globalActionDispatcher = new ActionDispatcher();
