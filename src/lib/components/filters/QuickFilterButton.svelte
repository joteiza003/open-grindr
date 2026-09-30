<script lang="ts">
	import { Button } from "$lib/components/ui/button";

	let {
		active,
		onclick,
		children,
	}: {
		active: boolean;
		onclick: () => void;
		children: import("svelte").Snippet;
	} = $props();
</script>

<Button
	variant="secondary"
	{onclick}
	class={{
		"border-(--accent-border) bg-(--accent-soft) text-(--text-primary) hover:bg-(--accent-soft)":
			active,
	}}
>
	{@render children()}
</Button>
