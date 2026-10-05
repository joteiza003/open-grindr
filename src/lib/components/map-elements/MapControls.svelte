<script lang="ts">
	import {
		ArrowsOutIcon,
		CrosshairIcon,
		GlobeHemisphereWestIcon,
	} from "phosphor-svelte";

	import Button from "$lib/components/ui/button/button.svelte";
	import { t } from "$lib/i18n";
	import type { BaseLayerKind } from "$lib/map/base-layers";

	let {
		canFit,
		canLocate,
		layer,
		status,
		tilesWorking,
		empty,
		onFit,
		onLocate,
		onToggleLayer,
	}: {
		canFit: boolean;
		canLocate: boolean;
		/** What the map shows underneath the pins. */
		layer: BaseLayerKind;
		/** Progress text while pin positions are being refreshed. */
		status: string | null;
		tilesWorking: boolean;
		empty: boolean;
		onFit: () => void;
		onLocate: () => void;
		onToggleLayer: () => void;
	} = $props();

	const chip =
		"rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium shadow-lg";
</script>

<!-- Framing a view that is already framed changes nothing on screen, so the
     dead-tap watchdog must not count these two buttons (`data-no-dom-change`). -->
<div class="pointer-events-none absolute end-3 top-3 z-10 flex flex-col gap-2">
	<Button
		variant="secondary"
		size="icon"
		class="pointer-events-auto size-11 rounded-2xl border border-border/60 bg-card shadow-lg can-hover:hover:bg-card"
		aria-label={t("map.fitAll")}
		title={t("map.fitAll")}
		disabled={!canFit}
		data-no-dom-change
		onclick={onFit}
	>
		<ArrowsOutIcon class="size-5" />
	</Button>
	<Button
		variant="secondary"
		size="icon"
		class="pointer-events-auto size-11 rounded-2xl border border-border/60 bg-card shadow-lg disabled:opacity-40 can-hover:hover:bg-card"
		aria-label={t("map.locate")}
		title={canLocate ? t("map.locate") : t("map.noLocation")}
		disabled={!canLocate}
		data-no-dom-change
		onclick={onLocate}
	>
		<CrosshairIcon class="size-5" />
	</Button>
	<Button
		variant="secondary"
		size="icon"
		class={[
			"pointer-events-auto size-11 rounded-2xl border border-border/60 shadow-lg",
			{
				"bg-card can-hover:hover:bg-card": layer !== "satellite",
				"bg-primary text-primary-foreground can-hover:hover:bg-primary":
					layer === "satellite",
			},
		]}
		aria-label={t("map.satellite")}
		title={t("map.satellite")}
		aria-pressed={layer === "satellite"}
		onclick={onToggleLayer}
	>
		<GlobeHemisphereWestIcon
			class="size-5"
			weight={layer === "satellite" ? "fill" : "regular"}
		/>
	</Button>
</div>

{#if status || !tilesWorking}
	<div
		class="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-col items-center gap-2 px-16"
		role="status"
	>
		{#if status}
			<p class={chip}>{status}</p>
		{/if}
		{#if !tilesWorking}
			<p class={[chip, "text-center text-muted-foreground"]}>
				{t("map.tilesFailing")}
			</p>
		{/if}
	</div>
{/if}

{#if empty}
	<div
		class="pointer-events-none absolute inset-x-0 bottom-10 z-10 flex justify-center px-4"
	>
		<p
			class="max-w-md rounded-2xl border border-border/80 bg-card px-4 py-3 text-center text-sm leading-relaxed text-muted-foreground shadow-xl"
		>
			{t("map.empty")}
		</p>
	</div>
{/if}
