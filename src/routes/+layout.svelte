<script lang="ts">
	// import "@vesta-cx/ui/styles/index.scss"
	import favicon from '$lib/assets/favicon.svg';
	import { Header } from '@vesta-cx/ui/components/layout/header/index';
	import { ViewTransition } from '@vesta-cx/ui/components/utils/view-transition/index';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}

<ViewTransition />

<Header>
	<span>vesta</span>
	<nav class="contents">
		<ul class="flex gap-6">
			<li>Home</li>
			<li>About</li>
			<li>Contact</li>
		</ul>
	</nav>
</Header>
