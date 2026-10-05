<script lang="ts">
	import SelectionCheck from "./SelectionCheck.svelte";

	let {
		class: className,
		order = null,
	}: {
		class?: import("svelte/elements").ClassValue;
		/** Si se indica, se muestra este número en vez de la marca (orden de envío). */
		order?: number | null;
	} = $props();
</script>

<div
	class={[
		"absolute inset-0 flex items-center justify-center rounded-[inherit] bg-primary/50 outline-2 -outline-offset-2 outline-primary",
		className,
	]}
>
	{#if order !== null}
		<span
			data-slot="selection-order"
			aria-hidden="true"
			class="grid size-7 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums"
		>
			{order}
		</span>
	{:else}
		<SelectionCheck />
	{/if}
</div>
