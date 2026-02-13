<script lang="ts">
	import {
		Section,
		SectionBackground,
		SectionContent
	} from '@vesta-cx/ui/components/layout/section';
	import HeroCanvas from '$lib/components/hero-canvas.svelte';

	let { data } = $props();

	const snapshot = $derived(data.snapshot);
	const insights = $derived(snapshot?.insights as Record<string, unknown> | null);

	// Extract chart data from insights
	const codecWinRates = $derived(
		(insights?.codecWinRates as Record<string, number> | undefined) ?? {}
	);
	const btScores = $derived(
		(insights?.bradleyTerryScores as Record<string, number> | undefined) ?? {}
	);
	const deviceBreakdown = $derived(
		(insights?.deviceBreakdown as Record<string, number> | undefined) ?? {}
	);
	const heatmapData = $derived(
		(insights?.heatmap as Array<{ row: string; col: string; value: number }> | undefined) ?? []
	);

	const codecs = ['FLAC', 'Opus', 'MP3', 'AAC'];
	const codecDescriptions: Record<string, string> = {
		FLAC: 'Lossless compression — bit-perfect reproduction of the original audio',
		Opus: 'Modern lossy codec — excellent quality at low bitrates, open standard',
		MP3: 'Legacy lossy codec — universal compatibility, less efficient than modern codecs',
		AAC: 'Lossy codec — default for Apple devices, better than MP3 at equivalent bitrates'
	};
</script>

<svelte:head>
	<title>Quality Survey — Which audio codec sounds best?</title>
	<meta
		name="description"
		content="Help us determine which audio codecs and bitrates sound best through blind A/B comparisons."
	/>
</svelte:head>

<!-- Hero Section -->
<Section data-section="hero" class="min-h-[max(calc(100svh-20rem),40rem)] justify-center items-center">
	<SectionBackground>
		<div
			class="from-primary/5 via-background to-primary/5 absolute inset-0 bg-linear-to-br"
		></div>
		<HeroCanvas waves={4} particles={96} />
		<div class="from-background absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t"></div>
	</SectionBackground>
	<SectionContent class="flex flex-col items-center text-center">
		<div class="mx-auto max-w-3xl">
			<h1 class="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
				Which audio codec
				<span class="text-primary">sounds best?</span>
			</h1>
			<p class="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg">
				Help us answer the age-old audiophile question through science. Listen to blind A/B
				comparisons and pick the one that sounds better to you. Your ears, your verdict.
			</p>
			<div class="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
				<a
					href="/survey/setup"
					class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-lg px-6 py-3 text-sm font-medium shadow-sm transition-colors"
				>
					Take the Survey
				</a>
				<a
					href="#results"
					class="text-muted-foreground hover:text-foreground inline-flex items-center rounded-lg px-6 py-3 text-sm font-medium transition-colors"
				>
					View Results ↓
				</a>
			</div>
		</div>
	</SectionContent>
</Section>

<!-- Stats Dashboard -->
<Section id="results">
	<SectionContent class="py-16">
		{#if snapshot}
			<div class="mb-12 text-center">
				<h2 class="text-3xl font-bold tracking-tight">Results So Far</h2>
				<p class="text-muted-foreground mt-2">
					Based on {snapshot.totalResponses.toLocaleString()} blind comparisons
				</p>
			</div>

			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<!-- Total Responses -->
				<div class="bg-card rounded-xl border p-6">
					<h3 class="text-muted-foreground text-sm font-medium">Total Responses</h3>
					<p class="mt-2 text-4xl font-bold tracking-tight">
						{snapshot.totalResponses.toLocaleString()}
					</p>
				</div>

				<!-- Codec Win Rates -->
				{#if Object.keys(codecWinRates).length > 0}
					<div class="bg-card rounded-xl border p-6 md:col-span-2">
						<h3 class="text-muted-foreground text-sm font-medium">Codec Preference</h3>
						<div class="mt-4 space-y-3">
							{#each Object.entries(codecWinRates).sort(([, a], [, b]) => b - a) as [codec, rate]}
								<div class="flex items-center gap-3">
									<span class="w-12 text-sm font-medium">{codec.toUpperCase()}</span>
									<div class="bg-muted h-4 flex-1 overflow-hidden rounded-full">
										<div
											class="bg-primary h-full rounded-full transition-all"
											style="width: {Math.round(rate * 100)}%"
										></div>
									</div>
									<span class="text-muted-foreground w-12 text-right text-sm">
										{Math.round(rate * 100)}%
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Bradley-Terry Rankings -->
				{#if Object.keys(btScores).length > 0}
					<div class="bg-card rounded-xl border p-6">
						<h3 class="text-muted-foreground text-sm font-medium">Quality Rankings</h3>
						<p class="text-muted-foreground mt-1 text-xs">Bradley-Terry model scores</p>
						<div class="mt-4 space-y-2">
							{#each Object.entries(btScores).sort(([, a], [, b]) => b - a) as [key, score], i}
								<div class="flex items-center justify-between text-sm">
									<div class="flex items-center gap-2">
										<span class="text-muted-foreground w-5 text-xs">#{i + 1}</span>
										<span class="font-medium">{key}</span>
									</div>
									<span class="text-muted-foreground">{score.toFixed(2)}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Heatmap -->
				{#if heatmapData.length > 0}
					{#await import('@vesta-cx/ui/components/ui/heatmap') then { Heatmap }}
						<div class="bg-card rounded-xl border p-6 md:col-span-2 lg:col-span-3">
							<h3 class="text-muted-foreground text-sm font-medium">
								Codec × Bitrate Win Rates
							</h3>
							<div class="mt-4">
								<Heatmap
									data={heatmapData}
									rows={[...new Set(heatmapData.map((d) => d.row))]}
									cols={[...new Set(heatmapData.map((d) => d.col))]}
									rowLabel="Codec"
									colLabel="Bitrate (kbps)"
								/>
							</div>
						</div>
					{/await}
				{/if}

				<!-- Device Breakdown -->
				{#if Object.keys(deviceBreakdown).length > 0}
					<div class="bg-card rounded-xl border p-6">
						<h3 class="text-muted-foreground text-sm font-medium">Device Breakdown</h3>
						<div class="mt-4 space-y-2">
							{#each Object.entries(deviceBreakdown).sort(([, a], [, b]) => b - a) as [device, count]}
								<div class="flex items-center justify-between text-sm">
									<span>{device}</span>
									<span class="text-muted-foreground">{count}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Codec Descriptions -->
			<div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{#each codecs as codec}
					<div class="bg-card rounded-lg border p-4">
						<h4 class="font-medium">{codec}</h4>
						<p class="text-muted-foreground mt-1 text-xs">
							{codecDescriptions[codec]}
						</p>
					</div>
				{/each}
			</div>
		{:else}
			<div class="mx-auto max-w-md py-20 text-center">
				<div
					class="bg-muted mx-auto mb-6 flex size-16 items-center justify-center rounded-full"
				>
					<span class="text-2xl">🎧</span>
				</div>
				<h2 class="text-2xl font-bold">Not enough data yet</h2>
				<p class="text-muted-foreground mt-3 text-sm">
					We need more listening data before we can show meaningful visualizations. Every
					comparison you complete helps us build a clearer picture of how audio codecs are
					perceived.
				</p>
				<a
					href="/survey/setup"
					class="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex items-center rounded-lg px-6 py-3 text-sm font-medium shadow-sm transition-colors"
				>
					Be one of the first to contribute
				</a>
			</div>

			<!-- Still show codec descriptions even without data -->
			<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{#each codecs as codec}
					<div class="bg-card rounded-lg border p-4">
						<h4 class="font-medium">{codec}</h4>
						<p class="text-muted-foreground mt-1 text-xs">
							{codecDescriptions[codec]}
						</p>
					</div>
				{/each}
			</div>
		{/if}
	</SectionContent>
</Section>
