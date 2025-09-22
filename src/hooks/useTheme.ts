import { ThemeContext, ThemeContextType } from '@/components/ThemeProvider';
import { useContext } from 'react';

/**
 * Safe hook to access theme context.
 * Returns the context value even if the consumer is outside a provider
 * (because ThemeProvider exported a default context).
 */
export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  return ctx;
}
