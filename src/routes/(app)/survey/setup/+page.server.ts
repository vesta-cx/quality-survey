import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { listeningDevices, DEVICE_TYPES, CONNECTION_TYPES, PRICE_TIERS } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, platform }) => {
	const deviceId = cookies.get('device_id');

	if (deviceId && platform) {
		const db = getDb(platform);
		const existing = await db
			.select()
			.from(listeningDevices)
			.where(eq(listeningDevices.id, deviceId))
			.get();

		if (existing) {
			redirect(302, '/survey/play');
		}
	}

	return {
		deviceTypes: DEVICE_TYPES,
		connectionTypes: CONNECTION_TYPES,
		priceTiers: PRICE_TIERS
	};
};

export const actions = {
	default: async ({ request, cookies, platform }) => {
		if (!platform) return fail(500, { error: 'Platform not available' });

		const data = await request.formData();
		const deviceType = data.get('device_type') as string;
		const connectionType = data.get('connection_type') as string;
		const brand = data.get('brand') as string;
		const model = data.get('model') as string;
		const priceTier = data.get('price_tier') as string;

		if (!deviceType || !connectionType || !brand || !model || !priceTier) {
			return fail(400, { error: 'All fields are required' });
		}

		if (!DEVICE_TYPES.includes(deviceType as (typeof DEVICE_TYPES)[number])) {
			return fail(400, { error: 'Invalid device type' });
		}
		if (!CONNECTION_TYPES.includes(connectionType as (typeof CONNECTION_TYPES)[number])) {
			return fail(400, { error: 'Invalid connection type' });
		}
		if (!PRICE_TIERS.includes(priceTier as (typeof PRICE_TIERS)[number])) {
			return fail(400, { error: 'Invalid price tier' });
		}

		const db = getDb(platform);
		const [device] = await db
			.insert(listeningDevices)
			.values({
				deviceType: deviceType as (typeof DEVICE_TYPES)[number],
				connectionType: connectionType as (typeof CONNECTION_TYPES)[number],
				brand,
				model,
				priceTier: priceTier as (typeof PRICE_TIERS)[number]
			})
			.returning();

		if (!device) {
			return fail(500, { error: 'Failed to create device' });
		}

		cookies.set('device_id', device.id, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365 // 1 year
		});

		redirect(302, '/survey/play');
	}
} satisfies Actions;
