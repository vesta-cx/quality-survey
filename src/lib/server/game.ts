import { eq, and, sql, ne } from 'drizzle-orm';
import type { Database } from './db';
import {
	sourceFiles,
	candidateFiles,
	ephemeralStreamUrls,
	qualityOptions,
	type PairingType,
	type TransitionMode,
	PAIRING_TYPES,
	TRANSITION_MODES
} from './db/schema';

/** Default segment duration in ms */
export const SEGMENT_DURATION_MS = 12_000;

/** Pairing type weights: ~70% same_song, ~20% different_song, ~10% placebo */
const PAIRING_WEIGHTS: Record<PairingType, number> = {
	same_song: 0.7,
	different_song: 0.2,
	placebo: 0.1
};

const weightedRandom = <T extends string>(weights: Record<T, number>): T => {
	const rand = Math.random();
	let cumulative = 0;
	for (const [key, weight] of Object.entries(weights) as [T, number][]) {
		cumulative += weight;
		if (rand <= cumulative) return key;
	}
	// Fallback
	return Object.keys(weights)[0] as T;
};

const randomElement = <T>(arr: T[]): T | undefined => arr[Math.floor(Math.random() * arr.length)];

export interface ComparisonRound {
	tokenA: string;
	tokenB: string;
	transitionMode: TransitionMode;
	startTime: number;
	duration: number;
}

export const generateRound = async (db: Database): Promise<ComparisonRound | null> => {
	// Get all approved source files
	const approvedSources = await db
		.select()
		.from(sourceFiles)
		.where(sql`${sourceFiles.approvedAt} IS NOT NULL`)
		.all();

	if (approvedSources.length === 0) return null;

	// Get enabled quality options
	const enabledOptions = await db
		.select()
		.from(qualityOptions)
		.where(eq(qualityOptions.enabled, true))
		.all();

	if (enabledOptions.length === 0) return null;

	const pairingType = weightedRandom(PAIRING_WEIGHTS);
	const transitionMode = randomElement([...TRANSITION_MODES]) ?? 'gapless';

	let candidateA: { id: string; sourceFileId: string } | undefined;
	let candidateB: { id: string; sourceFileId: string } | undefined;
	let sourceDuration: number;

	if (pairingType === 'same_song') {
		const source = randomElement(approvedSources);
		if (!source) return null;
		sourceDuration = source.duration;

		const candidates = await db
			.select({ id: candidateFiles.id, sourceFileId: candidateFiles.sourceFileId })
			.from(candidateFiles)
			.where(eq(candidateFiles.sourceFileId, source.id))
			.all();

		if (candidates.length < 2) return null;

		// Pick two different candidates
		candidateA = randomElement(candidates);
		candidateB = randomElement(candidates.filter((c) => c.id !== candidateA?.id));
	} else if (pairingType === 'different_song') {
		if (approvedSources.length < 2) return null;

		const sourceA = randomElement(approvedSources);
		const sourceB = randomElement(approvedSources.filter((s) => s.id !== sourceA?.id));
		if (!sourceA || !sourceB) return null;

		sourceDuration = Math.min(sourceA.duration, sourceB.duration);

		const candidatesA = await db
			.select({ id: candidateFiles.id, sourceFileId: candidateFiles.sourceFileId })
			.from(candidateFiles)
			.where(eq(candidateFiles.sourceFileId, sourceA.id))
			.all();

		const candidatesB = await db
			.select({ id: candidateFiles.id, sourceFileId: candidateFiles.sourceFileId })
			.from(candidateFiles)
			.where(eq(candidateFiles.sourceFileId, sourceB.id))
			.all();

		candidateA = randomElement(candidatesA);
		candidateB = randomElement(candidatesB);
	} else {
		// placebo
		const source = randomElement(approvedSources);
		if (!source) return null;
		sourceDuration = source.duration;

		const candidates = await db
			.select({ id: candidateFiles.id, sourceFileId: candidateFiles.sourceFileId })
			.from(candidateFiles)
			.where(eq(candidateFiles.sourceFileId, source.id))
			.all();

		const picked = randomElement(candidates);
		candidateA = picked;
		candidateB = picked; // Same candidate for placebo
	}

	if (!candidateA || !candidateB) return null;

	// Generate start time clamped to valid range
	const maxStart = Math.max(0, sourceDuration - SEGMENT_DURATION_MS);
	const startTime = Math.floor(Math.random() * maxStart);

	// Create ephemeral stream URLs (10-min expiry)
	const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

	const [tokenARow] = await db
		.insert(ephemeralStreamUrls)
		.values({ candidateFileId: candidateA.id, expiresAt })
		.returning();

	const [tokenBRow] = await db
		.insert(ephemeralStreamUrls)
		.values({ candidateFileId: candidateB.id, expiresAt })
		.returning();

	if (!tokenARow || !tokenBRow) return null;

	return {
		tokenA: tokenARow.token,
		tokenB: tokenBRow.token,
		transitionMode,
		startTime,
		duration: SEGMENT_DURATION_MS
	};
};
