<script lang="ts">
	import { MapPinIcon } from "phosphor-svelte";

	import Button from "$lib/components/ui/button/button.svelte";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { t } from "$lib/i18n";
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

	const canSave = $derived(draft.title.trim().length > 0);
</script>

<section
	class="pointer-events-auto mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-2xl"
	aria-label={t("map.markerAria")}
>
	<!-- Header -->
	<div class="flex items-center gap-3 border-b border-border/60 px-4 py-3.5">
		<div
			class="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"
		>
			<MapPinIcon class="size-5" weight="fill" />
		</div>
		<div class="min-w-0 flex-1">
			<h2 class="text-base font-semibold tracking-tight">
				{t("map.marker")}
			</h2>
			<p class="truncate text-xs text-muted-foreground tabular-nums">
				{draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)}
			</p>
		</div>
	</div>

	<!-- Body -->
	<div class="space-y-4 px-4 py-4">
		<div class="space-y-2">
			<Label for="marker-title" class="text-sm font-medium">
				{t("map.markerTitle")}
			</Label>
			<Input
				id="marker-title"
				maxlength={MAX_TITLE_LENGTH}
				placeholder={t("map.markerPlaceholder")}
				value={draft.title}
				class="h-11 rounded-xl text-base"
				oninput={(event) =>
					onchange({
						title: (event.currentTarget as HTMLInputElement).value,
					})}
				onkeydown={(event) => {
					if (event.key === "Enter" && canSave) onsave();
				}}
			/>
		</div>

		{#if error}
			<p
				class="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
				role="alert"
			>
				{error}
			</p>
		{/if}
	</div>

	<!-- Actions -->
	<div
		class="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-4 py-3"
	>
		<Button variant="ghost" class="rounded-xl" onclick={oncancel}>
			{t("common.cancel")}
		</Button>
		<Button
			class="min-w-24 rounded-xl"
			onclick={onsave}
			disabled={!canSave}
		>
			{t("common.save")}
		</Button>
	</div>
</section>
