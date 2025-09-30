import { COLOR_SHADE } from '@/constant';
import { useTheme } from '@/hooks/useTheme';
import type { ShadeType } from '@/types';

/**
 * Hook that returns a function for looking up colors from the current theme,
 * with optional opacity (0–1).
 */
export function useColor() {
  const { theme } = useTheme();

  function hexToRgba(hex: string, alpha: number = 1): string {
    let cleaned = hex.replace('#', '');
    if (cleaned.length === 3) {
      cleaned = cleaned
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const bigint = parseInt(cleaned, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function getColor(
    name: keyof typeof theme.colors,
    shade: ShadeType = COLOR_SHADE.DEFAULT,
    alpha?: number
  ): string {
    const color = theme.colors[name];
    let value: string | undefined;

    if (typeof color === 'string') {
      value = color;
    } else {
      value = color?.[shade] || color?.DEFAULT;
    }

    if (!value) return '';

    return typeof alpha === 'number' ? hexToRgba(value, alpha) : value;
  }

  return getColor;
}
