import tokens from '@/theme/design-tokens';

type Shade = 'DEFAULT' | 'light' | 'dark';

export function getColor(name: keyof typeof tokens.colors, shade: Shade | undefined = 'DEFAULT') {
  const color = tokens.colors[name];
  if (typeof color === 'string') return color; // flat hex
  return color?.[shade] || color?.DEFAULT;
}
