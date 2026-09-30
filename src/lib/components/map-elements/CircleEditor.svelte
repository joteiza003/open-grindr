<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Slider } from "$lib/components/ui/slider";
	import { t } from "$lib/i18n";
	import { currentLocale } from "$lib/i18n/t";
	import {
		CIRCLE_FILL_OPACITY,
		circleAreaKm2,
		distanceMeters,
		formatAreaKm2,
		formatDistanceKm,
		isPointInCircle,
		RADIUS_SLIDER_STEPS,
		radiusToSlider,
		sliderToRadius,
	} from "$lib/map/geographic";
	import {
		CIRCLE_COLORS,
		type CircleDraft,
		MAX_RADIUS_KM,
		MAX_TITLE_LENGTH,
		MIN_RADIUS_KM,
	} from "$lib/model/map-elements";

	const RADIUS_PRESETS_KM = [0.5, 1, 2, 5, 10, 25, 50] as const;

	let {
		draft,
		error = null,
		userLocation = null,
		onchange,
		onmove,
		oncancel,
		onsave,
		ondelete,
	}: {
		draft: CircleDraft;
		error?: string | null;
		userLocation?: { latitude: number; longitude: number } | null;
		onchange: (patch: Partial<CircleDraft>) => void;
		onmove: (latitude: number, longitude: number) => void;
		oncancel: () => void;
		onsave: () => void;
		ondelete?: () => void;
	} = $props();

	const editing = $derived(Boolean(draft.id));
	const locale = $derived(currentLocale());

	const relation = $derived.by(() => {
		if (!userLocation) return null;
		if (isPointInCircle(userLocation, draft)) return t("map.containsYou");
		const edgeKm = Math.max(
			0,
			distanceMeters(draft, userLocation) / 1000 - draft.radiusKm,
		);
		return t("map.outsideYou", {
			distance: formatDistanceKm(edgeKm, locale),
		});
	});

	function parseCoordinate(event: Event): number | null {
		const value = Number.parseFloat(
			(event.currentTarget as HTMLInputElement).value,
		);
		return Number.isFinite(value) ? value : null;
	}
</script>

<section
	class="pointer-events-auto mx-auto max-h-[72dvh] w-full max-w-xl overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl"
	aria-label={t("map.circleAria")}
>
	<!-- Sticky header -->
	<div
		class="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border/60 bg-card/90 px-4 py-3.5 backdrop-blur-md"
	>
		<div class="min-w-0 flex-1">
			<h2 class="text-base font-semibold tracking-tight">
				{editing ? t("map.circleEdit") : t("map.circle")}
			</h2>
			<p class="mt-0.5 text-xs leading-snug text-muted-foreground">
				{t("map.dragHint")}
			</p>
		</div>
		<div
			class="grid size-12 shrink-0 place-items-center rounded-2xl bg-muted/60"
			aria-hidden="true"
		>
			<svg viewBox="0 0 48 48" class="size-10">
				<circle
					cx="24"
					cy="24"
					r="16"
					fill={draft.color}
					fill-opacity={CIRCLE_FILL_OPACITY}
					stroke={draft.color}
					stroke-width="2.5"
				/>
				<circle cx="24" cy="24" r="2.5" fill={draft.color} />
			</svg>
		</div>
	</div>

	<div
		class="max-h-[calc(72dvh-8.5rem)] overflow-y-auto overscroll-contain px-4 py-4"
	>
		<!-- Stats -->
		<div
			class="grid grid-cols-3 gap-2 rounded-2xl bg-muted/50 p-2.5 text-center"
		>
			<div class="rounded-xl px-1 py-1.5">
				<p
					class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
				>
					{t("map.radius")}
				</p>
				<p class="mt-0.5 text-sm font-semibold tabular-nums">
					{formatDistanceKm(draft.radiusKm, locale)}
				</p>
			</div>
			<div class="rounded-xl px-1 py-1.5">
				<p
					class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
				>
					{t("map.diameter")}
				</p>
				<p class="mt-0.5 text-sm font-semibold tabular-nums">
					{formatDistanceKm(draft.radiusKm * 2, locale)}
				</p>
			</div>
			<div class="rounded-xl px-1 py-1.5">
				<p
					class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
				>
					{t("map.area")}
				</p>
				<p class="mt-0.5 text-sm font-semibold tabular-nums">
					{formatAreaKm2(circleAreaKm2(draft.radiusKm), locale)}
				</p>
			</div>
		</div>

		{#if relation}
			<p
				class="mt-2.5 rounded-xl bg-primary/10 px-3 py-2 text-xs leading-snug text-primary"
			>
				{relation}
			</p>
		{/if}

		<!-- Name -->
		<div class="mt-5 space-y-2">
			<Label for="circle-name" class="text-sm font-medium">
				{t("map.nameOptional")}
			</Label>
			<Input
				id="circle-name"
				maxlength={MAX_TITLE_LENGTH}
				placeholder={t("map.circleNamePlaceholder")}
				value={draft.name}
				class="h-11 rounded-xl"
				oninput={(event) =>
					onchange({
						name: (event.currentTarget as HTMLInputElement).value,
					})}
			/>
		</div>

		<!-- Radius -->
		<div class="mt-5 space-y-3">
			<div class="flex items-center justify-between gap-3">
				<Label for="circle-radius" class="text-sm font-medium">
					{t("map.radius")}
				</Label>
				<div class="flex items-center gap-1.5">
					<Input
						id="circle-radius"
						type="number"
						inputmode="decimal"
						min={MIN_RADIUS_KM}
						max={MAX_RADIUS_KM}
						step={0.1}
						value={draft.radiusKm}
						class="h-9 w-[4.5rem] rounded-lg text-right tabular-nums"
						oninput={(event) => {
							const next = Number.parseFloat(
								(event.currentTarget as HTMLInputElement).value,
							);
							if (Number.isFinite(next))
								onchange({ radiusKm: next });
						}}
					/>
					<span class="text-sm text-muted-foreground">km</span>
				</div>
			</div>

			<Slider
				type="single"
				min={0}
				max={RADIUS_SLIDER_STEPS}
				step={1}
				thumbLabels={[t("map.radiusAria")]}
				thumbValueTexts={[formatDistanceKm(draft.radiusKm, locale)]}
				bind:value={
					() => radiusToSlider(draft.radiusKm),
					(next: number) =>
						onchange({ radiusKm: sliderToRadius(next) })
				}
			/>

			<div class="flex flex-wrap gap-1.5">
				{#each RADIUS_PRESETS_KM as preset (preset)}
					<Button
						type="button"
						size="sm"
						variant={draft.radiusKm === preset
							? "default"
							: "outline"}
						class="h-8 rounded-full px-3 text-xs font-medium"
						onclick={() => onchange({ radiusKm: preset })}
					>
						{formatDistanceKm(preset, locale)}
					</Button>
				{/each}
			</div>
		</div>

		<!-- Coordinates -->
		<div class="mt-5 grid grid-cols-2 gap-3">
			<div class="space-y-1.5">
				<Label for="circle-lat" class="text-sm font-medium">
					{t("map.latitude")}
				</Label>
				<Input
					id="circle-lat"
					type="number"
					inputmode="decimal"
					step="any"
					min={-90}
					max={90}
					value={Number(draft.latitude.toFixed(6))}
					class="h-10 rounded-xl tabular-nums"
					oninput={(event) => {
						const next = parseCoordinate(event);
						if (next !== null) onmove(next, draft.longitude);
					}}
				/>
			</div>
			<div class="space-y-1.5">
				<Label for="circle-lon" class="text-sm font-medium">
					{t("map.longitude")}
				</Label>
				<Input
					id="circle-lon"
					type="number"
					inputmode="decimal"
					step="any"
					min={-180}
					max={180}
					value={Number(draft.longitude.toFixed(6))}
					class="h-10 rounded-xl tabular-nums"
					oninput={(event) => {
						const next = parseCoordinate(event);
						if (next !== null) onmove(draft.latitude, next);
					}}
				/>
			</div>
		</div>

		<!-- Color -->
		<div class="mt-5 space-y-2.5">
			<Label class="text-sm font-medium">{t("map.color")}</Label>
			<div class="flex flex-wrap items-center gap-2.5">
				{#each CIRCLE_COLORS as color (color)}
					<button
						type="button"
						aria-label={t("map.colorAria", { color })}
						aria-pressed={draft.color.toLowerCase() === color}
						class={[
							"size-8 rounded-full border-2 transition-all duration-150",
							{
								"scale-110 border-foreground shadow-md ring-2 ring-foreground/20":
									draft.color.toLowerCase() === color,
								"border-transparent opacity-90 hover:scale-105 hover:opacity-100":
									draft.color.toLowerCase() !== color,
							},
						]}
						style:background-color={color}
						onclick={() => onchange({ color })}
					></button>
				{/each}
				<label
					class="relative size-8 overflow-hidden rounded-full border-2 border-border shadow-sm transition-transform hover:scale-105"
					title={t("map.customColor")}
				>
					<span class="sr-only">{t("map.customColor")}</span>
					<input
						type="color"
						value={draft.color}
						class="absolute inset-0 cursor-pointer opacity-0"
						oninput={(event) =>
							onchange({ color: event.currentTarget.value })}
					/>
					<span
						class="block size-full"
						style:background-color={draft.color}
					></span>
				</label>
			</div>
		</div>

		{#if error}
			<p
				class="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
				role="alert"
			>
				{error}
			</p>
		{/if}
	</div>

	<!-- Sticky actions -->
	<div
		class="sticky bottom-0 flex items-center gap-2 border-t border-border/60 bg-card/90 px-4 py-3 backdrop-blur-md"
	>
		{#if editing && ondelete}
			<Button
				variant="destructive"
				class="me-auto rounded-xl"
				onclick={ondelete}
			>
				{t("common.delete")}
			</Button>
		{/if}
		<Button variant="ghost" class="rounded-xl" onclick={oncancel}>
			{t("common.cancel")}
		</Button>
		<Button class="min-w-24 rounded-xl" onclick={onsave}>
			{editing ? t("map.update") : t("common.save")}
		</Button>
	</div>
</section>
