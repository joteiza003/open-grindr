<script lang="ts">
	import {
		GridFourIcon,
		HeartIcon,
		ListBulletsIcon,
		RowsIcon,
		SquaresFourIcon,
	} from "phosphor-svelte";

	import {
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import { Button } from "$lib/components/ui/button";
	import { t } from "$lib/i18n";

	type ViewMode = "grid" | "compact" | "detailed" | "list" | "tinder";

	const modes: Array<{
		value: ViewMode;
		label: string;
		Icon: typeof GridFourIcon;
	}> = [
		{ value: "grid", label: "Grid", Icon: GridFourIcon },
		{ value: "compact", label: "Compact", Icon: SquaresFourIcon },
		{ value: "detailed", label: "Detailed", Icon: RowsIcon },
		{ value: "list", label: t("browse.viewList"), Icon: ListBulletsIcon },
		{ value: "tinder", label: t("browse.viewTinder"), Icon: HeartIcon },
	];

	const value = $derived(preferencesSnapshot().browse.viewMode);

	async function selectMode(mode: ViewMode): Promise<void> {
		if (mode === value) return;
		await setPreferences({
			browse: { ...preferencesSnapshot().browse, viewMode: mode },
		});
	}
</script>

<div
	class="flex shrink-0 items-center gap-0.5 rounded-full border border-border/70 bg-background/70 p-0.5 backdrop-filter-(--bd-chip)"
	role="group"
	aria-label={t("browse.viewLabel")}
>
	{#each modes as mode (mode.value)}
		{@const Icon = mode.Icon}
		<Button
			variant="ghost"
			size="icon-xs"
			aria-label={mode.label}
			aria-pressed={value === mode.value}
			title={mode.label}
			class="rounded-full aria-pressed:bg-foreground/10 aria-pressed:text-foreground"
			onclick={() => void selectMode(mode.value)}
		>
			<Icon weight={value === mode.value ? "fill" : "regular"} />
		</Button>
	{/each}
</div>
