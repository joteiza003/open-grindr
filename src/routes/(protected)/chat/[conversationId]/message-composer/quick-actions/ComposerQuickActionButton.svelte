<script lang="ts">
	import { Button } from "$lib/components/ui/button";

	let {
		label,
		disabled = false,
		pressed = false,
		onclick,
		icon,
	}: {
		label: string;
		disabled?: boolean;
		pressed?: boolean;
		onclick: () => void;
		icon: import("svelte").Snippet<
			[import("phosphor-svelte").IconComponentProps]
		>;
	} = $props();
</script>

<Button
	type="button"
	variant="ghost"
	size="icon"
	aria-label={label}
	title={label}
	aria-pressed={pressed}
	class="size-9 shrink-0 rounded-full"
	{disabled}
	{onclick}
>
	{@render icon({ class: "size-4.5", color: "var(--muted-foreground)" })}
</Button>
