<script lang="ts">
	import { Input } from "$lib/components/ui/input";
	import { t } from "$lib/i18n";
	import { applyBound, parseTyped } from "./range-bounds";

	let {
		value = $bindable(),
		floor,
		ceiling,
		unit = "",
		toDisplay = (bound: number) => bound,
		fromDisplay = (typed: number) => typed,
		minLabel,
		maxLabel,
		onedit,
	}: {
		value: number[];
		floor: number;
		ceiling: number;
		/** Sufijo junto a los campos (años, cm, kg…). */
		unit?: string;
		/** Del valor guardado al que se escribe (p. ej. cm → pulgadas). */
		toDisplay?: (bound: number) => number;
		fromDisplay?: (typed: number) => number;
		minLabel: string;
		maxLabel: string;
		/** Se llama al confirmar un valor escrito (para activar el filtro). */
		onedit?: () => void;
	} = $props();

	const limits = $derived({ floor, ceiling });
	const fields = $derived([
		{
			which: "min" as const,
			label: minLabel,
			placeholder: t("filters.noMin"),
		},
		{
			which: "max" as const,
			label: maxLabel,
			placeholder: t("filters.noMax"),
		},
	]);
	let drafts = $state<{ min: string | null; max: string | null }>({
		min: null,
		max: null,
	});

	function shown(which: "min" | "max"): string {
		const draft = drafts[which];
		if (draft !== null) return draft;
		const bound =
			which === "min" ? (value[0] ?? floor) : (value[1] ?? ceiling);
		const open = which === "min" ? bound === floor : bound === ceiling;
		return open ? "" : String(Math.round(toDisplay(bound)));
	}

	function commit(which: "min" | "max"): void {
		const draft = drafts[which];
		if (draft === null) return;
		drafts[which] = null;
		const parsed = parseTyped(draft);
		value = applyBound({
			range: value,
			limits,
			which,
			typed: parsed === null ? null : fromDisplay(parsed),
		});
		onedit?.();
	}
</script>

<div class="flex items-center gap-2">
	{#each fields as field (field.which)}
		<div class="flex min-w-0 flex-1 items-center gap-1.5">
			<Input
				type="text"
				inputmode="numeric"
				aria-label={field.label}
				placeholder={field.placeholder}
				value={shown(field.which)}
				class="h-9 min-w-0 text-center tabular-nums"
				oninput={(event) =>
					(drafts[field.which] = (
						event.currentTarget as HTMLInputElement
					).value)}
				onblur={() => commit(field.which)}
				onkeydown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						commit(field.which);
					}
				}}
			/>
			{#if unit}
				<span class="shrink-0 text-xs text-muted-foreground"
					>{unit}</span
				>
			{/if}
		</div>
	{/each}
</div>
