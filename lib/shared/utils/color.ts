import { useTheme } from '@/theme/ThemeProvider';

type Shade = 'DEFAULT' | 'light' | 'dark';

/**
 * Hook that returns a function for looking up colors from the current theme
 */
export function useColor() {
  const { theme } = useTheme();

  function getColor(name: keyof typeof theme.colors, shade: Shade = 'DEFAULT'): string {
    const color = theme.colors[name];
    if (typeof color === 'string') {
      return color; // flat hex
    }
    return color?.[shade] || color?.DEFAULT || '';
  }

  return getColor;
}
