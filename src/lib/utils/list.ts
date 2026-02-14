/**
 * Utilities for comma-separated list storage (e.g. artists, genres).
 * Stored as "Artist A, Artist B" in DB; parsed to arrays for processing.
 */

/** Split by comma, trim each, filter empty. Handles null/undefined. */
export const parseList = (s: string | null | undefined): string[] => {
	if (s == null || typeof s !== 'string') return [];
	return s
		.split(',')
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
};

/** Join with ", " for storage. Normalizes spacing. */
export const formatList = (arr: string[]): string => {
	if (!Array.isArray(arr) || arr.length === 0) return '';
	return arr.map((s) => String(s).trim()).filter(Boolean).join(', ');
};
