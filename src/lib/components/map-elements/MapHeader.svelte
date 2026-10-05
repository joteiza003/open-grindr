<script lang="ts">
	import {
		ArrowsClockwiseIcon,
		CaretLeftIcon,
		FunnelIcon,
		ListIcon,
	} from "phosphor-svelte";

	import Button from "$lib/components/ui/button/button.svelte";
	import { t } from "$lib/i18n";
	import { longPress } from "$lib/map/long-press";

	let {
		listOpen,
		filtersOpen,
		filterCount,
		refreshDisabled,
		refreshing,
		onBack,
		onRefresh,
		onToggleList,
		onToggleFilters,
		onTitleLongPress,
	}: {
		listOpen: boolean;
		filtersOpen: boolean;
		/** How many filters are on. */
		filterCount: number;
		refreshDisabled: boolean;
		refreshing: boolean;
		onBack: () => void;
		onRefresh: () => void;
		onToggleList: () => void;
		onToggleFilters: () => void;
		/** Pressing and holding the title opens the hidden diagnostics. */
		onTitleLongPress: () => void;
	} = $props();
</script>

<header
	class="flex items-center gap-1.5 border-b border-border/40 bg-background px-3 py-2.5"
>
	<Button
		variant="ghost"
		size="icon"
		class="size-10 shrink-0 rounded-full text-foreground"
		aria-label={t("common.back")}
		title={t("common.back")}
		onclick={onBack}
	>
		<CaretLeftIcon class="size-5" weight="bold" />
	</Button>

	<h1
		class="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight select-none"
		use:longPress={onTitleLongPress}
	>
		{t("map.title")}
	</h1>

	<div class="flex items-center gap-1">
		<Button
			variant="ghost"
			size="icon"
			class="size-10 rounded-full text-foreground"
			aria-label={t("map.refreshAll")}
			title={t("map.refreshAllTitle")}
			disabled={refreshDisabled}
			onclick={onRefresh}
		>
			<ArrowsClockwiseIcon
				class={["size-5", { "animate-spin": refreshing }]}
				weight="bold"
			/>
		</Button>
		<Button
			variant={filtersOpen ? "default" : "ghost"}
			size="icon"
			class="relative size-10 rounded-full text-foreground"
			aria-label={t("map.filters")}
			title={t("map.filters")}
			aria-pressed={filtersOpen}
			onclick={onToggleFilters}
		>
			<FunnelIcon
				class="size-5"
				weight={filtersOpen || filterCount > 0 ? "fill" : "regular"}
			/>
			{#if filterCount > 0}
				<span
					class="absolute -end-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 font-bold text-primary-foreground"
				>
					{filterCount}
				</span>
			{/if}
		</Button>
		<Button
			variant={listOpen ? "default" : "ghost"}
			size="icon"
			class="size-10 rounded-full text-foreground"
			aria-label={t("map.list")}
			title={t("map.list")}
			aria-pressed={listOpen}
			onclick={onToggleList}
		>
			<ListIcon class="size-5" weight={listOpen ? "fill" : "regular"} />
		</Button>
	</div>
</header>
