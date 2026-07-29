import { BadRequestException } from '@nestjs/common';
import { resolveLocale, validateLocale } from './locale.helper';

const supported = ['en', 'es', 'fr', 'de', 'pt'] as const;

describe('resolveLocale', () => {
  it('returns an exact match', () => {
    expect(resolveLocale('fr', supported)).toBe('fr');
  });

  it('is case-insensitive', () => {
    expect(resolveLocale('FR', supported)).toBe('fr');
    expect(resolveLocale('Es', supported)).toBe('es');
  });

  it('respects q-weight ordering', () => {
    // es has q=0.9 > fr q=0.8 > en q=0.5
    expect(resolveLocale('en;q=0.5,es;q=0.9,fr;q=0.8', supported)).toBe('es');
  });

  it('picks the highest-q supported locale when first choice is unsupported', () => {
    // zh is not supported; fr is next highest
    expect(resolveLocale('zh;q=1.0,fr;q=0.7,en;q=0.3', supported)).toBe('fr');
  });

  it('falls back to "en" when no locale matches', () => {
    expect(resolveLocale('zh, ja, ko', supported)).toBe('en');
  });

  it('falls back to "en" when header is absent', () => {
    expect(resolveLocale(undefined, supported)).toBe('en');
    expect(resolveLocale(null, supported)).toBe('en');
  });

  it('falls back to "en" when header is empty string', () => {
    expect(resolveLocale('', supported)).toBe('en');
  });

  it('falls back to "en" when header is only whitespace', () => {
    expect(resolveLocale('   ', supported)).toBe('en');
  });

  it('does not crash on a malformed header', () => {
    expect(() => resolveLocale(';;;', supported)).not.toThrow();
    expect(resolveLocale(';;;', supported)).toBe('en');
  });

  it('handles language-region tags by stripping region (fr-CA → fr)', () => {
    expect(resolveLocale('fr-CA', supported)).toBe('fr');
  });

  it('handles language-region tags with q-weights', () => {
    // pt-BR → pt
    expect(resolveLocale('zh;q=0.9,pt-BR;q=0.8', supported)).toBe('pt');
  });

  it('uses default supported list when second argument is omitted', () => {
    // 'en' is always in SUPPORTED_LOCALES, so passing 'en' should return 'en'
    expect(resolveLocale('en')).toBe('en');
  });
});

describe('validateLocale', () => {
  it('returns the locale unchanged when valid', () => {
    expect(validateLocale('es')).toBe('es');
    expect(validateLocale('en')).toBe('en');
  });

  it('throws BadRequestException for unsupported locales', () => {
    expect(() => validateLocale('zh')).toThrow(BadRequestException);
    expect(() => validateLocale('ja')).toThrow(BadRequestException);
  });

  it('includes the offending locale in the error message', () => {
    try {
      validateLocale('xx');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).message).toContain('xx');
    }
  });
});
