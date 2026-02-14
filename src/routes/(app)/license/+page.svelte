<script lang="ts">
	import { Section, SectionContent } from '@vesta-cx/ui/components/layout/section';
	import { pageTitle, SITE_NAME, ORG_NAME, LINKS } from '$lib/constants/identity';
</script>

<svelte:head>
	<title>{pageTitle('Content License')}</title>
</svelte:head>

<Section>
	<SectionContent>
		<h1 class="text-2xl font-bold tracking-tight">Content License</h1>
		<p class="text-muted-foreground mt-1 text-sm">
			Permission to use and host audio content on this site.
		</p>

		<div class="text-foreground mt-6 max-w-prose space-y-4 text-sm">
			<p>
				The audio content hosted and used on this site ({SITE_NAME} / {ORG_NAME}) has been made available
				under express personal permission granted to <strong>Mia Riezebos</strong> ({ORG_NAME}).
			</p>
			<p>
				Rights holders have given explicit permission to use, host, and process this content for the
				purposes of audio quality perception research. Content is not publicly redistributable unless
				otherwise agreed.
			</p>
			<p class="text-muted-foreground">
				For inquiries about content usage or licensing, contact{' '}
				<a href={`mailto:${LINKS.contactEmail}`} class="underline hover:no-underline">{LINKS.contactEmail}</a>.
			</p>
		</div>
	</SectionContent>
</Section>
