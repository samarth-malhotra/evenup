import { useContext } from 'react';

import type { ThemeContextType } from '@/components/ThemeProvider';
import { ThemeContext } from '@/components/ThemeProvider';

/**
 * Safe hook to access theme context.
 * Returns the context value even if the consumer is outside a provider
 * (because ThemeProvider exported a default context).
 */
export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  return ctx;
}
