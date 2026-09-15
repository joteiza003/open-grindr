<script lang="ts">
	let {
		title,
		children,
	}: { title: string; children?: import("svelte").Snippet } = $props();
</script>

<div class="mt-6 flex flex-col gap-2.5">
	<span class="px-1 text-[0.7rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{title}</span>
	{@render children?.()}
</div>
