<script lang="ts">
	import { onMount } from "svelte";

	import Button from "$lib/components/ui/button/button.svelte";
	import { t } from "$lib/i18n";

	let {
		title,
		body,
		onCancel,
		onConfirm,
	}: {
		title: string;
		body: string;
		onCancel: () => void;
		onConfirm: () => void;
	} = $props();

	let cancelButton: HTMLElement | null = $state(null);

	// The safe choice gets the focus, so a stray Enter never deletes.
	onMount(() => cancelButton?.focus());
</script>

<!-- A plain panel inside the map screen, not a portal: nothing outside the
     screen gets locked, so no tap can end up dead behind it. -->
<div
	class="pointer-events-auto mx-auto flex w-full max-w-xl flex-col gap-4 rounded-3xl border border-border/80 bg-card p-4 shadow-2xl"
	role="alertdialog"
	aria-labelledby="map-confirm-title"
	aria-describedby="map-confirm-body"
>
	<div class="flex flex-col gap-1.5">
		<h2 id="map-confirm-title" class="text-base font-semibold">{title}</h2>
		<p id="map-confirm-body" class="text-sm text-muted-foreground">
			{body}
		</p>
	</div>
	<div class="grid grid-cols-2 gap-2">
		<Button
			bind:ref={cancelButton}
			variant="secondary"
			size="lg"
			onclick={onCancel}
		>
			{t("common.cancel")}
		</Button>
		<Button variant="destructive" size="lg" onclick={onConfirm}>
			{t("common.delete")}
		</Button>
	</div>
</div>
