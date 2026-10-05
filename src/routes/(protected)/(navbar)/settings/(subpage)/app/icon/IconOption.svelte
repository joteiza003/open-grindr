<script lang="ts">
	import {
		CalculatorIcon,
		CheckCircleIcon,
		ClockIcon,
		CloudSunIcon,
		NotePencilIcon,
	} from "phosphor-svelte";

	import faviconPng from "$lib/assets/favicon.png";
	import { t } from "$lib/i18n";
	import type { AppIconId } from "$lib/platform/app-icon";

	let {
		id,
		name,
		selected,
		disabled,
		onChoose,
	}: {
		id: AppIconId;
		name: string;
		selected: boolean;
		disabled: boolean;
		onChoose: () => void;
	} = $props();

	// Mirrors the colours of the launcher icons declared in the Android resources.
	const TILE: Record<Exclude<AppIconId, "default">, string> = {
		calculator: "#263238",
		notes: "#ffc107",
		weather: "#2196f3",
		clock: "#212121",
	};
</script>

<button
	type="button"
	role="radio"
	aria-checked={selected}
	{disabled}
	class="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors disabled:opacity-60 aria-checked:border-foreground aria-checked:bg-muted"
	onclick={onChoose}
>
	{#if id === "default"}
		<img
			src={faviconPng}
			alt=""
			class="size-12 shrink-0 rounded-2xl bg-white object-contain"
		/>
	{:else}
		<span
			class="grid size-12 shrink-0 place-items-center rounded-2xl text-white"
			style:background-color={TILE[id]}
			style:color={id === "notes" ? "#ffffff" : undefined}
			aria-hidden="true"
		>
			{#if id === "calculator"}
				<CalculatorIcon weight="fill" class="size-7" />
			{:else if id === "notes"}
				<NotePencilIcon weight="fill" class="size-7" />
			{:else if id === "weather"}
				<CloudSunIcon weight="fill" class="size-7" />
			{:else}
				<ClockIcon weight="fill" class="size-7" />
			{/if}
		</span>
	{/if}
	<span class="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
	{#if selected}
		<span
			class="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
		>
			<CheckCircleIcon weight="fill" class="size-4 text-primary" />
			{t("icon.inUse")}
		</span>
	{/if}
</button>
