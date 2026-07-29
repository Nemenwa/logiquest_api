/**
 * Supported locales for puzzle content i18n.
 * "en" is the canonical/source locale — it maps to the base Puzzle record's
 * own title/description/hints fields.  All other locales require a
 * PuzzleTranslation row.
 *
 * Add more BCP-47 language tags here as translations are provided.
 */
export const SUPPORTED_LOCALES: readonly string[] = ['en', 'es', 'fr', 'de', 'pt'];

export const DEFAULT_LOCALE = 'en';
