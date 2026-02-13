import { getDb } from '$lib/server/db';
import { generateRound } from '$lib/server/game';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, platform }) => {
	const deviceId = cookies.get('device_id');
	if (!deviceId) redirect(302, '/survey/setup');
	if (!platform) return { round: null, deviceId, error: 'Platform not available' };

	const db = getDb(platform);
	const round = await generateRound(db);

	if (!round) {
		return {
			round: null,
			deviceId,
			error: 'No audio comparisons available yet. Check back soon!'
		};
	}

	return {
		round: {
			tokenA: round.tokenA,
			tokenB: round.tokenB,
			transitionMode: round.transitionMode,
			startTime: round.startTime,
			duration: round.duration
		},
		deviceId,
		error: null
	};
};
