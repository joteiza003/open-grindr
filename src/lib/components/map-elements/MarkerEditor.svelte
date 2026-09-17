<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import {
		type MarkerDraft,
		MAX_TITLE_LENGTH,
	} from "$lib/model/map-elements";

	let {
		draft,
		error = null,
		onchange,
		oncancel,
		onsave,
	}: {
		draft: MarkerDraft;
		error?: string | null;
		onchange: (patch: Partial<MarkerDraft>) => void;
		oncancel: () => void;
		onsave: () => void;
	} = $props();
</script>

<section
	class="pointer-events-auto mx-auto w-full max-w-xl rounded-2xl border border-border bg-card/95 p-4 shadow-2xl"
	aria-label="Configure marker"
>
	<h2 class="text-base font-semibold tracking-tight">Marker</h2>
	<p class="mt-0.5 text-xs text-muted-foreground">
		{draft.latitude.toFixed(4)}, {draft.longitude.toFixed(4)}
	</p>
	<div class="mt-4 space-y-2">
		<Label for="marker-title">Title</Label>
		<Input
			id="marker-title"
			maxlength={MAX_TITLE_LENGTH}
			placeholder="Meeting place"
			value={draft.title}
			oninput={(event) =>
				onchange({
					title: (event.currentTarget as HTMLInputElement).value,
				})}
			onkeydown={(event) => {
				if (event.key === "Enter") onsave();
			}}
		/>
	</div>
	{#if error}
		<p class="mt-3 text-sm text-destructive" role="alert">{error}</p>
	{/if}
	<div class="mt-4 flex justify-end gap-2">
		<Button variant="outline" onclick={oncancel}>Cancel</Button>
		<Button onclick={onsave} disabled={draft.title.trim().length === 0}>
			Save
		</Button>
	</div>
</section>
