<script lang="ts">
	import * as Card from "$lib/components/ui/card";

	let { children }: { children?: import("svelte").Snippet } = $props();
</script>

<Card.Root class="mt-5 overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-sm backdrop-filter-(--bd-rail)">
	<Card.Content class="px-4 py-4 leading-6 wrap-break-word whitespace-pre-wrap select-text">
		{@render children?.()}
	</Card.Content>
</Card.Root>
