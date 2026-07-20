import { colors, radii, spacing, theme, typography } from '../theme';

describe('theme tokens', () => {
  it('uses the deep pitch-green background', () => {
    expect(colors.background).toBe('#0d1f16');
  });

  it('defines all color tokens as hex values', () => {
    Object.values(colors).forEach((value) => {
      expect(value).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('has an ascending spacing scale', () => {
    const values = [spacing.xs, spacing.sm, spacing.md, spacing.lg, spacing.xl, spacing.xxl];
    const sorted = [...values].sort((a, b) => a - b);
    expect(values).toEqual(sorted);
  });

  it('exposes tokens through the default export', () => {
    expect(theme).toEqual({ colors, spacing, radii, typography });
  });
});
