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
		/** Custom location of the user, to relate the circle to it. */
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
	class="pointer-events-auto mx-auto max-h-[70dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card/95 p-4 shadow-2xl"
	aria-label={t("map.circleAria")}
>
	<div class="flex items-start justify-between gap-3">
		<div>
			<h2 class="text-base font-semibold tracking-tight">
				{editing ? t("map.circleEdit") : t("map.circle")}
			</h2>
			<p class="mt-0.5 text-xs text-muted-foreground">
				{t("map.dragHint")}
			</p>
		</div>
		<div
			class="grid size-12 shrink-0 place-items-center"
			aria-hidden="true"
		>
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
				<circle cx="24" cy="24" r="2.5" fill={draft.color} />
			</svg>
		</div>
	</div>

	<dl
		class="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-2 text-center text-xs"
	>
		<div>
			<dt class="text-muted-foreground">{t("map.radius")}</dt>
			<dd class="font-medium">
				{formatDistanceKm(draft.radiusKm, locale)}
			</dd>
		</div>
		<div>
			<dt class="text-muted-foreground">{t("map.diameter")}</dt>
			<dd class="font-medium">
				{formatDistanceKm(draft.radiusKm * 2, locale)}
			</dd>
		</div>
		<div>
			<dt class="text-muted-foreground">{t("map.area")}</dt>
			<dd class="font-medium">
				{formatAreaKm2(circleAreaKm2(draft.radiusKm), locale)}
			</dd>
		</div>
	</dl>
	{#if relation}
		<p class="mt-2 text-xs text-muted-foreground">{relation}</p>
	{/if}

	<div class="mt-4 space-y-2">
		<Label for="circle-name">{t("map.nameOptional")}</Label>
		<Input
			id="circle-name"
			maxlength={MAX_TITLE_LENGTH}
			placeholder={t("map.circleNamePlaceholder")}
			value={draft.name}
			oninput={(event) =>
				onchange({
					name: (event.currentTarget as HTMLInputElement).value,
				})}
		/>
	</div>

	<div class="mt-4 space-y-3">
		<div class="flex items-center justify-between gap-3">
			<Label for="circle-radius">{t("map.radius")}</Label>
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
			min={0}
			max={RADIUS_SLIDER_STEPS}
			step={1}
			thumbLabels={[t("map.radiusAria")]}
			thumbValueTexts={[formatDistanceKm(draft.radiusKm, locale)]}
			bind:value={
				() => radiusToSlider(draft.radiusKm),
				(next: number) => onchange({ radiusKm: sliderToRadius(next) })
			}
		/>
		<div class="flex flex-wrap gap-1.5">
			{#each RADIUS_PRESETS_KM as preset (preset)}
				<Button
					type="button"
					size="sm"
					variant={draft.radiusKm === preset ? "default" : "outline"}
					class="h-7 rounded-full px-2.5 text-xs"
					onclick={() => onchange({ radiusKm: preset })}
				>
					{formatDistanceKm(preset, locale)}
				</Button>
			{/each}
		</div>
	</div>

	<div class="mt-4 grid grid-cols-2 gap-3">
		<div class="space-y-1.5">
			<Label for="circle-lat">{t("map.latitude")}</Label>
			<Input
				id="circle-lat"
				type="number"
				inputmode="decimal"
				step="any"
				min={-90}
				max={90}
				value={Number(draft.latitude.toFixed(6))}
				oninput={(event) => {
					const next = parseCoordinate(event);
					if (next !== null) onmove(next, draft.longitude);
				}}
			/>
		</div>
		<div class="space-y-1.5">
			<Label for="circle-lon">{t("map.longitude")}</Label>
			<Input
				id="circle-lon"
				type="number"
				inputmode="decimal"
				step="any"
				min={-180}
				max={180}
				value={Number(draft.longitude.toFixed(6))}
				oninput={(event) => {
					const next = parseCoordinate(event);
					if (next !== null) onmove(draft.latitude, next);
				}}
			/>
		</div>
	</div>

	<div class="mt-4 space-y-2">
		<Label>{t("map.color")}</Label>
		<div class="flex flex-wrap items-center gap-2">
			{#each CIRCLE_COLORS as color (color)}
				<button
					type="button"
					aria-label={t("map.colorAria", { color })}
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
					style:background-color={color}
					onclick={() => onchange({ color })}
				></button>
			{/each}
			<label
				class="relative size-7 overflow-hidden rounded-full border border-border"
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
		<p class="mt-3 text-sm text-destructive" role="alert">{error}</p>
	{/if}

	<div class="mt-4 flex items-center justify-end gap-2">
		{#if editing && ondelete}
			<Button variant="destructive" class="me-auto" onclick={ondelete}>
				{t("common.delete")}
			</Button>
		{/if}
		<Button variant="outline" onclick={oncancel}>
			{t("common.cancel")}
		</Button>
		<Button onclick={onsave}>
			{editing ? t("map.update") : t("common.save")}
		</Button>
	</div>
</section>
