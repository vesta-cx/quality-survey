<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Setup Your Device | Quality Survey</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-12">
	<div class="w-full space-y-6">
		<div class="text-center">
			<h1 class="text-3xl font-bold tracking-tight">Set Up Your Device</h1>
			<p class="text-muted-foreground mt-2">
				Tell us about your listening setup so we can group results accurately.
			</p>
		</div>

		{#if form?.error}
			<div class="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
				{form.error}
			</div>
		{/if}

		<form method="POST" use:enhance class="space-y-4">
			<div class="space-y-2">
				<label for="device_type" class="text-sm font-medium">Device Type</label>
				<select
					id="device_type"
					name="device_type"
					required
					class="border-input bg-background ring-offset-background focus:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2"
				>
					<option value="">Select...</option>
					{#each data.deviceTypes as type}
						<option value={type}>{type === 'speaker' ? 'Speaker(s)' : 'Headphones'}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-2">
				<label for="connection_type" class="text-sm font-medium">Connection Type</label>
				<select
					id="connection_type"
					name="connection_type"
					required
					class="border-input bg-background ring-offset-background focus:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2"
				>
					<option value="">Select...</option>
					{#each data.connectionTypes as type}
						<option value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-2">
				<label for="brand" class="text-sm font-medium">Brand</label>
				<input
					id="brand"
					name="brand"
					type="text"
					required
					placeholder="e.g. Sony, Sennheiser, Apple"
					class="border-input bg-background ring-offset-background focus:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2"
				/>
			</div>

			<div class="space-y-2">
				<label for="model" class="text-sm font-medium">Model</label>
				<input
					id="model"
					name="model"
					type="text"
					required
					placeholder="e.g. WH-1000XM5, HD 600"
					class="border-input bg-background ring-offset-background focus:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2"
				/>
			</div>

			<div class="space-y-2">
				<label for="price_tier" class="text-sm font-medium">Price Tier</label>
				<select
					id="price_tier"
					name="price_tier"
					required
					class="border-input bg-background ring-offset-background focus:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2"
				>
					<option value="">Select...</option>
					{#each data.priceTiers as tier}
						<option value={tier}>{tier.charAt(0).toUpperCase() + tier.slice(1)}</option>
					{/each}
				</select>
			</div>

			<button
				type="submit"
				class="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg px-4 py-3 text-sm font-medium shadow-sm transition-colors"
			>
				Start the Survey
			</button>
		</form>
	</div>
</div>
