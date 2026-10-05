<script lang="ts">
	import { XIcon } from "phosphor-svelte";

	import FilterFields from "$lib/components/filters/FilterFields.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import { t } from "$lib/i18n";
	import type { MapScreenState } from "$lib/map/map-screen-state.svelte";

	let { screen }: { screen: MapScreenState } = $props();
</script>

<!-- Every change of a filter shows on the map at once, so there is nothing to
     apply: the fields edit the filters of the screen in place. -->
<section
	class="pointer-events-auto mx-auto flex max-h-[55dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl"
	aria-label={t("map.filters")}
>
	<div
		class="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3"
	>
		<div class="flex min-w-0 items-center gap-2">
			<h2 class="text-sm font-semibold">{t("map.filters")}</h2>
			{#if screen.filters.count > 0}
				<span
					class="rounded-full bg-primary/15 px-2 py-0.5 text-2xs font-semibold text-primary"
				>
					{t("map.filtersActive", { count: screen.filters.count })}
				</span>
			{/if}
		</div>
		<div class="flex shrink-0 items-center gap-1">
			<Button
				variant="ghost"
				size="sm"
				class="h-8 text-xs"
				disabled={screen.filters.count === 0}
				onclick={() => screen.filters.clear()}
			>
				{t("map.filtersReset")}
			</Button>
			<Button
				variant="ghost"
				size="icon"
				class="size-8 rounded-full text-foreground"
				aria-label={t("common.close")}
				onclick={() => screen.closePanel()}
			>
				<XIcon class="size-4" />
			</Button>
		</div>
	</div>

	<div
		class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-3 *:flex-col *:gap-4 **:break-inside-avoid"
	>
		<FilterFields
			bind:filters={screen.filters.value}
			photoKinds={["has-photos"]}
		/>
	</div>

	<p
		class="border-t border-border/60 px-4 py-2 text-xs text-muted-foreground"
	>
		{t("map.filtersHint")}
	</p>
</section>
