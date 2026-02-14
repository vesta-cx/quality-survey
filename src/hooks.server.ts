import type { Handle } from '@sveltejs/kit';
import { createAuthHandle } from '@vesta-cx/utils/auth';
import { paraglideMiddleware } from '$lib/paraglide/server';

const handleAuth = createAuthHandle({
	protectedPaths: ['/admin'],
	postLoginRedirect: '/admin'
});

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

// Manual composition instead of sequence() — avoids "Could not get the request store" in SvelteKit 2.51+
export const handle: Handle = async ({ event, resolve }) =>
	handleAuth({
		event,
		resolve: (e, opts) =>
			handleParaglide({
				event: e,
				resolve: (e2, opts2) => resolve(e2, opts2)
			})
	});
