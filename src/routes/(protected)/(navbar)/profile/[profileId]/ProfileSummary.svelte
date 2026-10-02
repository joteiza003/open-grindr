<script lang="ts">
	import { EyesIcon } from "phosphor-svelte";

	import { t } from "$lib/i18n";
	import { lookingForSummary } from "$lib/model/users/profile-summary";
	import { lookingFor as lookingForLabels } from "$lib/model/users/profiles";
	import Distance from "./Distance.svelte";
	import SexualPosition from "./SexualPosition.svelte";

	let {
		age,
		showAge,
		distance,
		sexualPosition,
		lookingFor,
	}: {
		age: number | null;
		showAge: boolean;
		distance: number | null;
		sexualPosition: number | null | undefined;
		lookingFor: readonly number[] | null | undefined;
	} = $props();

	const looking = $derived(
		lookingForSummary({ ids: lookingFor, labels: lookingForLabels }),
	);
	const visibleAge = $derived(showAge && age !== null ? age : null);
	const hasPosition = $derived(
		sexualPosition !== null && sexualPosition !== undefined,
	);
	const hasAnything = $derived(
		visibleAge !== null ||
			distance !== null ||
			hasPosition ||
			looking.shown.length > 0,
	);
</script>

{#if hasAnything}
	<section
		data-slot="profile-summary"
		aria-label={t("profile.summary")}
		class="mb-4 flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-xs"
	>
		<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
			{#if visibleAge !== null}
				<span class="font-semibold"
					>{t("profile.summaryAge", { n: visibleAge })}</span
				>
			{/if}
			<Distance {distance} />
			{#if hasPosition}
				<SexualPosition sexualPosition={sexualPosition as number} />
			{/if}
		</div>
		{#if looking.shown.length > 0}
			<div class="flex flex-wrap items-center gap-1.5 text-sm">
				<EyesIcon
					weight="fill"
					class="size-4 shrink-0 text-muted-foreground"
				/>
				<span class="sr-only">{t("profile.summaryLooking")}</span>
				{#each looking.shown as label (label)}
					<span class="rounded-full bg-muted px-2.5 py-0.5 text-xs"
						>{label}</span
					>
				{/each}
				{#if looking.more > 0}
					<span class="text-xs text-muted-foreground"
						>+{looking.more}</span
					>
				{/if}
			</div>
		{/if}
	</section>
{/if}
