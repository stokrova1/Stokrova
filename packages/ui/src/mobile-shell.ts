/**
 * STOKROVA Mobile Warehouse & Handheld Scanner Shell Descriptors
 * Ergonomic thumb-zone controls, audio/haptic telemetry, and barcode verification.
 */

export interface MobileScanFeedback {
  type: 'SUCCESS' | 'WARNING' | 'ERROR';
  toneFrequencyHz: number;
  toneDurationMs: number;
  hapticPatternMs: number[];
  visualBorderColor: string;
}

export interface MobileNavigationTab {
  id: 'scan' | 'pick' | 'receive' | 'audit';
  label: string;
  icon: string;
  badgeCount?: number;
}

export interface MobilePickTaskItem {
  lineId: string;
  sku: string;
  barcode: string;
  productName: string;
  binLocationCode: string;
  routeSequenceIndex: number;
  quantityRequired: number;
  quantityPicked: number;
  isComplete: boolean;
}

export const MOBILE_NAVIGATION_TABS: MobileNavigationTab[] = [
  { id: 'scan', label: 'Scan & Verify', icon: 'camera' },
  { id: 'pick', label: 'Wave Pick', icon: 'check-circle' },
  { id: 'receive', label: 'Inbound GRN', icon: 'arrow-down-circle' },
  { id: 'audit', label: 'Bin Audit', icon: 'search' },
];

/**
 * Returns audio-haptic-visual sensory feedback profile for barcode scans.
 */
export function getBarcodeScanFeedback(
  type: 'SUCCESS' | 'WARNING' | 'ERROR',
): MobileScanFeedback {
  switch (type) {
    case 'SUCCESS':
      return {
        type: 'SUCCESS',
        toneFrequencyHz: 1800,
        toneDurationMs: 80,
        hapticPatternMs: [40],
        visualBorderColor: '#16A34A',
      };
    case 'WARNING':
      return {
        type: 'WARNING',
        toneFrequencyHz: 880,
        toneDurationMs: 120,
        hapticPatternMs: [50, 60, 50],
        visualBorderColor: '#D97706',
      };
    case 'ERROR':
      return {
        type: 'ERROR',
        toneFrequencyHz: 260,
        toneDurationMs: 300,
        hapticPatternMs: [150, 80, 150],
        visualBorderColor: '#DC2626',
      };
  }
}

/**
 * Sorts warehouse picking tasks by serpentine bin travel route sequence.
 */
export function sortPickingTasksByRoute(tasks: MobilePickTaskItem[]): MobilePickTaskItem[] {
  return [...tasks].sort((a, b) => {
    if (a.isComplete !== b.isComplete) {
      return a.isComplete ? 1 : -1; // Incomplete tasks first
    }
    return a.routeSequenceIndex - b.routeSequenceIndex;
  });
}
