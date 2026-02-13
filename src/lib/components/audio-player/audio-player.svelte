<script lang="ts" module>
	export type TransitionMode = 'gapless' | 'gap_continue' | 'gap_restart';
	export type Selection = 'a' | 'b' | 'neither' | null;

	export interface AudioPlayerProps {
		srcA: string;
		srcB: string;
		transitionMode: TransitionMode;
		startTime: number;
		duration: number;
		onConfirm: (selection: 'a' | 'b' | 'neither') => void;
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';

	const GAP_DURATION_MS = 300;
	const CROSSFADE_MS = 50;
	const VOLUME_STEP = 0.05;

	let {
		srcA,
		srcB,
		transitionMode,
		startTime,
		duration,
		onConfirm,
		class: className
	}: AudioPlayerProps = $props();

	let audioCtx: AudioContext | null = $state(null);
	let bufferA: AudioBuffer | null = $state(null);
	let bufferB: AudioBuffer | null = $state(null);
	let gainNodeA: GainNode | null = $state(null);
	let gainNodeB: GainNode | null = $state(null);
	let sourceNodeA: AudioBufferSourceNode | null = $state(null);
	let sourceNodeB: AudioBufferSourceNode | null = $state(null);
	let masterGain: GainNode | null = $state(null);

	let selection: Selection = $state(null);
	let isPlaying = $state(false);
	let isLoading = $state(true);
	let loadError: string | null = $state(null);
	let volume = $state(0.8);
	let confirmed = $state(false);
	let playbackStartedAt = $state(0);
	let playbackOffset = $state(0);

	const isDesktop = $derived(typeof window !== 'undefined' && window.innerWidth >= 768);

	const startTimeSeconds = $derived(startTime / 1000);
	const durationSeconds = $derived(duration / 1000);

	const initAudio = async () => {
		try {
			audioCtx = new AudioContext();
			masterGain = audioCtx.createGain();
			masterGain.gain.value = volume;
			masterGain.connect(audioCtx.destination);

			gainNodeA = audioCtx.createGain();
			gainNodeB = audioCtx.createGain();
			gainNodeA.connect(masterGain);
			gainNodeB.connect(masterGain);

			const [responseA, responseB] = await Promise.all([fetch(srcA), fetch(srcB)]);

			if (!responseA.ok || !responseB.ok) {
				loadError = 'Failed to load audio streams';
				return;
			}

			const [arrayA, arrayB] = await Promise.all([
				responseA.arrayBuffer(),
				responseB.arrayBuffer()
			]);

			[bufferA, bufferB] = await Promise.all([
				audioCtx.decodeAudioData(arrayA),
				audioCtx.decodeAudioData(arrayB)
			]);

			isLoading = false;
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Failed to load audio';
			isLoading = false;
		}
	};

	$effect(() => {
		initAudio();
		return () => {
			stopAll();
			audioCtx?.close();
		};
	});

	$effect(() => {
		if (masterGain) {
			masterGain.gain.value = volume;
		}
	});

	const stopAll = () => {
		try {
			sourceNodeA?.stop();
		} catch {
			/* already stopped */
		}
		try {
			sourceNodeB?.stop();
		} catch {
			/* already stopped */
		}
		sourceNodeA = null;
		sourceNodeB = null;
		isPlaying = false;
	};

	const playCandidate = (candidate: 'a' | 'b', offset = 0) => {
		if (!audioCtx || !bufferA || !bufferB || !gainNodeA || !gainNodeB) return;

		const buffer = candidate === 'a' ? bufferA : bufferB;
		const gainNode = candidate === 'a' ? gainNodeA : gainNodeB;
		const otherGain = candidate === 'a' ? gainNodeB : gainNodeA;

		// For gapless, crossfade
		if (transitionMode === 'gapless') {
			const now = audioCtx.currentTime;
			gainNode.gain.setValueAtTime(0, now);
			gainNode.gain.linearRampToValueAtTime(1, now + CROSSFADE_MS / 1000);
			otherGain.gain.linearRampToValueAtTime(0, now + CROSSFADE_MS / 1000);
		} else {
			gainNode.gain.value = 1;
			otherGain.gain.value = 0;
		}

		// Stop existing source for this candidate
		const existingSource = candidate === 'a' ? sourceNodeA : sourceNodeB;
		try {
			existingSource?.stop();
		} catch {
			/* already stopped */
		}

		const source = audioCtx.createBufferSource();
		source.buffer = buffer;
		source.connect(gainNode);

		const actualOffset = startTimeSeconds + offset;
		const remainingDuration = durationSeconds - offset;

		if (remainingDuration <= 0) return;

		source.start(0, actualOffset, remainingDuration);
		source.onended = () => {
			if (isPlaying) {
				isPlaying = false;
			}
		};

		if (candidate === 'a') {
			sourceNodeA = source;
		} else {
			sourceNodeB = source;
		}

		playbackStartedAt = audioCtx.currentTime;
		playbackOffset = offset;
		isPlaying = true;
	};

	const getCurrentOffset = (): number => {
		if (!audioCtx || !isPlaying) return playbackOffset;
		return playbackOffset + (audioCtx.currentTime - playbackStartedAt);
	};

	const handleSelect = (candidate: 'a' | 'b' | 'neither') => {
		if (confirmed) return;

		const prevSelection = selection;
		selection = candidate;

		if (candidate === 'neither') {
			if (transitionMode === 'gapless') {
				// continue playing
			} else {
				stopAll();
			}
			return;
		}

		const currentOffset = getCurrentOffset();

		if (prevSelection === candidate && isPlaying) {
			// Already playing this one, do nothing
			return;
		}

		if (transitionMode === 'gapless') {
			// Start both sources at same position, crossfade between them
			stopAll();
			if (bufferA && bufferB && audioCtx && gainNodeA && gainNodeB) {
				const srcA = audioCtx.createBufferSource();
				const srcB = audioCtx.createBufferSource();
				srcA.buffer = bufferA;
				srcB.buffer = bufferB;
				srcA.connect(gainNodeA);
				srcB.connect(gainNodeB);

				const offset =
					prevSelection === null || prevSelection === 'neither' ? 0 : currentOffset;
				const actualOffset = startTimeSeconds + offset;
				const remaining = durationSeconds - offset;

				if (remaining > 0) {
					gainNodeA.gain.value = candidate === 'a' ? 1 : 0;
					gainNodeB.gain.value = candidate === 'b' ? 1 : 0;

					srcA.start(0, actualOffset, remaining);
					srcB.start(0, actualOffset, remaining);

					const onEnd = () => {
						isPlaying = false;
					};
					srcA.onended = onEnd;
					srcB.onended = onEnd;

					sourceNodeA = srcA;
					sourceNodeB = srcB;
					playbackStartedAt = audioCtx.currentTime;
					playbackOffset = offset;
					isPlaying = true;
				}
			}
		} else if (transitionMode === 'gap_continue') {
			stopAll();
			const offset = prevSelection === null || prevSelection === 'neither' ? 0 : currentOffset;
			setTimeout(() => playCandidate(candidate, offset), GAP_DURATION_MS);
		} else {
			// gap_restart
			stopAll();
			setTimeout(() => playCandidate(candidate, 0), GAP_DURATION_MS);
		}
	};

	const handleConfirm = () => {
		if (!selection || confirmed) return;
		confirmed = true;
		stopAll();
		onConfirm(selection);
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (confirmed) return;

		switch (e.key) {
			case 'ArrowLeft':
				e.preventDefault();
				handleSelect('a');
				break;
			case 'ArrowRight':
				e.preventDefault();
				handleSelect('b');
				break;
			case 'ArrowUp':
				e.preventDefault();
				volume = Math.min(1, volume + VOLUME_STEP);
				break;
			case 'ArrowDown':
				e.preventDefault();
				volume = Math.max(0, volume - VOLUME_STEP);
				break;
			case 'n':
			case 'N':
				e.preventDefault();
				handleSelect('neither');
				break;
			case ' ':
				e.preventDefault();
				handleConfirm();
				break;
		}
	};
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
	class={cn(
		'relative flex w-full flex-col items-center gap-4',
		className
	)}
	role="group"
	aria-label="Audio comparison player"
>
	{#if isLoading}
		<div class="flex h-48 w-full items-center justify-center rounded-lg border border-dashed">
			<p class="text-muted-foreground text-sm">Loading audio...</p>
		</div>
	{:else if loadError}
		<div class="flex h-48 w-full items-center justify-center rounded-lg border border-destructive">
			<p class="text-destructive text-sm">{loadError}</p>
		</div>
	{:else}
		<!-- A/B Regions -->
		<div class="flex w-full flex-col gap-3 md:flex-row">
			<!-- Candidate A -->
			<button
				type="button"
				class={cn(
					'flex flex-1 flex-col items-center justify-center rounded-xl border-2 p-8 transition-all',
					'hover:border-primary/50 focus-visible:ring-ring/50 focus-visible:ring-2',
					selection === 'a'
						? 'border-primary bg-primary/5 shadow-lg'
						: 'border-border bg-card'
				)}
				onclick={() => handleSelect('a')}
				aria-label="Play candidate A"
				aria-pressed={selection === 'a'}
				disabled={confirmed}
			>
				<span class="text-4xl font-bold tracking-tight">A</span>
				<span class="text-muted-foreground mt-1 text-xs">
					{selection === 'a' && isPlaying ? 'Playing...' : 'Click to play'}
				</span>
			</button>

			<!-- Neither (center circle) -->
			<div class="flex items-center justify-center md:w-16">
				<button
					type="button"
					class={cn(
						'flex size-14 items-center justify-center rounded-full border-2 transition-all',
						'hover:border-muted-foreground/50 focus-visible:ring-ring/50 focus-visible:ring-2',
						selection === 'neither'
							? 'border-muted-foreground bg-muted shadow-md'
							: 'border-border bg-card'
					)}
					onclick={() => handleSelect('neither')}
					aria-label="Select neither candidate"
					aria-pressed={selection === 'neither'}
					disabled={confirmed}
				>
					<span class="text-muted-foreground text-xs font-medium">N</span>
				</button>
			</div>

			<!-- Candidate B -->
			<button
				type="button"
				class={cn(
					'flex flex-1 flex-col items-center justify-center rounded-xl border-2 p-8 transition-all',
					'hover:border-primary/50 focus-visible:ring-ring/50 focus-visible:ring-2',
					selection === 'b'
						? 'border-primary bg-primary/5 shadow-lg'
						: 'border-border bg-card'
				)}
				onclick={() => handleSelect('b')}
				aria-label="Play candidate B"
				aria-pressed={selection === 'b'}
				disabled={confirmed}
			>
				<span class="text-4xl font-bold tracking-tight">B</span>
				<span class="text-muted-foreground mt-1 text-xs">
					{selection === 'b' && isPlaying ? 'Playing...' : 'Click to play'}
				</span>
			</button>
		</div>

		<!-- Volume control (desktop only) -->
		{#if isDesktop}
			<div class="flex w-full max-w-xs items-center gap-3">
				<span class="text-muted-foreground text-xs">Vol</span>
				<input
					type="range"
					min="0"
					max="1"
					step="0.01"
					bind:value={volume}
					class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted"
					aria-label="Volume"
				/>
				<span class="text-muted-foreground w-8 text-right text-xs">
					{Math.round(volume * 100)}%
				</span>
			</div>
		{/if}

		<!-- Confirm button -->
		<button
			type="button"
			class={cn(
				'w-full max-w-xs rounded-lg px-6 py-3 text-sm font-medium transition-all',
				selection
					? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
					: 'bg-muted text-muted-foreground cursor-not-allowed'
			)}
			onclick={handleConfirm}
			disabled={!selection || confirmed}
			aria-label="Confirm selection"
		>
			{confirmed
				? 'Confirmed!'
				: selection
					? `Confirm: ${selection === 'neither' ? 'Neither' : selection.toUpperCase()}`
					: 'Select A, B, or Neither'}
		</button>

		<!-- Keyboard hints -->
		<p class="text-muted-foreground hidden text-xs md:block">
			← → switch · ↑ ↓ volume · N neither · Space confirm
		</p>
	{/if}
</div>
