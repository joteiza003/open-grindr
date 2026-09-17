<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Slider } from "$lib/components/ui/slider";
	import { CIRCLE_FILL_OPACITY } from "$lib/map/geographic";
	import {
		CIRCLE_COLORS,
		type CircleDraft,
		MAX_RADIUS_KM,
		MAX_TITLE_LENGTH,
		MIN_RADIUS_KM,
	} from "$lib/model/map-elements";

	let {
		draft,
		error = null,
		onchange,
		oncancel,
		onsave,
		ondelete,
	}: {
		draft: CircleDraft;
		error?: string | null;
		onchange: (patch: Partial<CircleDraft>) => void;
		oncancel: () => void;
		onsave: () => void;
		ondelete?: () => void;
	} = $props();

	const editing = $derived(Boolean(draft.id));
</script>

<section
	class="pointer-events-auto mx-auto w-full max-w-xl rounded-2xl border border-border bg-card/95 p-4 shadow-2xl"
	aria-label="Configure circumference"
>
	<div class="flex items-start justify-between gap-3">
		<div>
			<h2 class="text-base font-semibold tracking-tight">
				{editing ? "Edit circumference" : "Circumference"}
			</h2>
			<p class="mt-0.5 text-xs text-muted-foreground">
				{draft.latitude.toFixed(4)}, {draft.longitude.toFixed(4)}
			</p>
		</div>
		<div class="grid size-12 place-items-center" aria-hidden="true">
			<svg viewBox="0 0 48 48" class="size-12">
				<circle
					cx="24"
					cy="24"
					r="16"
					fill={draft.color}
					fill-opacity={CIRCLE_FILL_OPACITY}
					stroke={draft.color}
					stroke-width="3"
				/>
			</svg>
		</div>
	</div>

	<div class="mt-4 space-y-2">
		<Label for="circle-name">Name (optional)</Label>
		<Input
			id="circle-name"
			maxlength={MAX_TITLE_LENGTH}
			placeholder="North area"
			value={draft.name}
			oninput={(event) =>
				onchange({
					name: (event.currentTarget as HTMLInputElement).value,
				})}
		/>
	</div>

	<div class="mt-4 space-y-3">
		<div class="flex items-center justify-between gap-3">
			<Label for="circle-radius">Radius</Label>
			<div class="flex items-center gap-2">
				<Input
					id="circle-radius"
					type="number"
					inputmode="decimal"
					min={MIN_RADIUS_KM}
					max={MAX_RADIUS_KM}
					step={0.1}
					value={draft.radiusKm}
					class="h-8 w-20 text-right"
					oninput={(event) => {
						const next = Number.parseFloat(
							(event.currentTarget as HTMLInputElement).value,
						);
						if (Number.isFinite(next)) onchange({ radiusKm: next });
					}}
				/>
				<span class="text-sm text-muted-foreground">km</span>
			</div>
		</div>
		<Slider
			type="single"
			min={MIN_RADIUS_KM}
			max={MAX_RADIUS_KM}
			step={0.1}
			thumbLabels={["Radius in kilometres"]}
			thumbValueTexts={[`${draft.radiusKm} km`]}
			bind:value={
				() => draft.radiusKm,
				(next: number) => onchange({ radiusKm: next })
			}
		/>
	</div>

	<div class="mt-4 space-y-2">
		<Label>Color</Label>
		<div class="flex flex-wrap items-center gap-2">
			{#each CIRCLE_COLORS as color (color)}
				<button
					type="button"
					aria-label={`Color ${color}`}
					aria-pressed={draft.color.toLowerCase() === color}
					class={[
						"size-7 rounded-full border-2 transition-transform",
						{
							"scale-110 border-foreground":
								draft.color.toLowerCase() === color,
							"border-transparent":
								draft.color.toLowerCase() !== color,
						},
					]}
					style:background-color="{color}"
					onclick={() => onchange({ color })}
				></button>
			{/each}
			<label
				class="relative size-7 overflow-hidden rounded-full border border-border"
			>
				<span class="sr-only">Custom color</span>
				<input
					type="color"
					value={draft.color}
					class="absolute inset-0 cursor-pointer opacity-0"
					oninput={(event) =>
						onchange({
							color: (event.currentTarget)
								.value,
						})}
				/>
				<span
					class="block size-full"
					style:background-color="{draft.color}"
				></span>
			</label>
		</div>
	</div>

	{#if error}
		<p class="mt-3 text-sm text-destructive" role="alert">{error}</p>
	{/if}

	<div class="mt-4 flex items-center justify-end gap-2">
		{#if editing && ondelete}
			<Button variant="destructive" class="me-auto" onclick={ondelete}>
				Delete
			</Button>
		{/if}
		<Button variant="outline" onclick={oncancel}>Cancel</Button>
		<Button onclick={onsave}>{editing ? "Update" : "Save"}</Button>
	</div>
</section>
