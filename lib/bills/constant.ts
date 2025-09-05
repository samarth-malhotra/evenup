import type { SplitMethod } from './types';

export const SPLIT_OPTIONS: Array<{ key: SplitMethod; label: string }> = [
  { key: 'equal', label: 'Equally' },
  { key: 'exact', label: 'Exact amounts' },
  { key: 'percent', label: 'Percentages' },
  { key: 'shares', label: 'Shares' },
];
