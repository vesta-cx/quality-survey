<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let submitting = $state(false);
	let responseStartTime = $state(0);

	$effect(() => {
		if (data.round) {
			responseStartTime = Date.now();
		}
	});

	const handleConfirm = async (selected: 'a' | 'b' | 'neither') => {
		if (submitting || !data.round) return;
		submitting = true;

		const responseTime = Date.now() - responseStartTime;

		try {
			const res = await fetch('/api/answers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tokenA: data.round.tokenA,
					tokenB: data.round.tokenB,
					selected,
					transitionMode: data.round.transitionMode,
					startTime: data.round.startTime,
					segmentDuration: data.round.duration,
					responseTime,
					deviceId: data.deviceId
				})
			});

			if (!res.ok) {
				console.error('Failed to submit answer');
			}
		} catch (e) {
			console.error('Error submitting answer:', e);
		}

		// Load next round
		await invalidateAll();
		submitting = false;
	};
</script>

<svelte:head>
	<title>Play | Quality Survey</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center px-4 py-8">
	{#if data.error}
		<div class="text-center">
			<h1 class="text-2xl font-bold">No comparisons available</h1>
			<p class="text-muted-foreground mt-2">{data.error}</p>
			<a
				href="/"
				class="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-block rounded-lg px-4 py-2 text-sm font-medium"
			>
				Back to Home
			</a>
		</div>
	{:else if data.round}
		<div class="w-full max-w-2xl space-y-6">
			<div class="text-center">
				<h1 class="text-2xl font-bold tracking-tight">Which sounds better?</h1>
				<p class="text-muted-foreground mt-1 text-sm">
					Listen to both options and pick the one you prefer.
				</p>
			</div>

			<!-- Dynamic import of AudioPlayer to avoid SSR issues with Web Audio API -->
			{#await import('$lib/components/audio-player')}
				<div class="flex h-48 items-center justify-center">
					<p class="text-muted-foreground">Loading player...</p>
				</div>
			{:then { AudioPlayer }}
				<AudioPlayer
					srcA="/api/stream/{data.round.tokenA}"
					srcB="/api/stream/{data.round.tokenB}"
					transitionMode={data.round.transitionMode}
					startTime={data.round.startTime}
					duration={data.round.duration}
					onConfirm={handleConfirm}
				/>
			{/await}

			{#if submitting}
				<div class="text-muted-foreground text-center text-sm">Loading next round...</div>
			{/if}
		</div>
	{/if}
</div>
