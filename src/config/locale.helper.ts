import { BadRequestException } from '@nestjs/common';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './locale.config';

/**
 * Validates that `locale` is in the supported list.
 * Returns the locale unchanged if valid, throws BadRequestException if not.
 */
export function validateLocale(locale: string): string {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    throw new BadRequestException(
      `Unsupported locale "${locale}". Supported locales: ${SUPPORTED_LOCALES.join(', ')}`,
    );
  }
  return locale;
}

/**
 * Parses an Accept-Language header and returns the best-matching supported
 * locale, falling back to DEFAULT_LOCALE if nothing matches or the header
 * is absent / malformed.
 *
 * Handles the standard q-weight syntax, e.g.:
 *   "es;q=0.9, fr;q=0.8, en;q=0.5"
 *   "fr-CA, fr;q=0.9, en;q=0.5"
 *
 * @param header  - The raw Accept-Language header string (may be undefined/null/empty).
 * @param supported - The list of supported locale strings to match against.
 */
export function resolveLocale(
  header: string | undefined | null,
  supported: readonly string[] = SUPPORTED_LOCALES,
): string {
  if (!header || typeof header !== 'string' || header.trim() === '') {
    return DEFAULT_LOCALE;
  }

  let entries: { locale: string; q: number }[];

  try {
    entries = header
      .split(',')
      .map((part) => {
        const trimmed = part.trim();
        const qMatch = trimmed.match(/;q=([\d.]+)/);
        const q = qMatch ? parseFloat(qMatch[1]) : 1.0;
        const locale = trimmed.split(';')[0].trim().toLowerCase();
        return { locale, q: isFinite(q) ? q : 0 };
      })
      .filter((e) => e.locale.length > 0)
      .sort((a, b) => b.q - a.q);
  } catch {
    return DEFAULT_LOCALE;
  }

  for (const { locale } of entries) {
    // Exact match (case-insensitive)
    const exact = supported.find((s) => s.toLowerCase() === locale);
    if (exact) return exact;

    // Language-only match: "fr-CA" → try "fr"
    const lang = locale.split('-')[0];
    if (lang !== locale) {
      const langMatch = supported.find((s) => s.toLowerCase() === lang);
      if (langMatch) return langMatch;
    }
  }

  return DEFAULT_LOCALE;
}
