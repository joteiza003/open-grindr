<script lang="ts">
	import { StarIcon } from "phosphor-svelte";

	import { showErrorToast } from "$lib/api/error-toast";
	import {
		addFavoriteUser,
		removeFavoriteUser,
	} from "$lib/api/users/favorites";
	import { Button } from "$lib/components/ui/button";
	import { hapticsAvailable, playHaptic } from "$lib/haptics";

	let {
		profileId,
		isFavorite,
		onFavorite,
		compact = false,
	}: {
		profileId: number;
		isFavorite: boolean;
		onFavorite: (isFavorite: boolean) => void;
		compact?: boolean;
	} = $props();

	const BURST_ANGLES = [0, 60, 120, 180, 240, 300] as const;
	const BURST_MS = 650;

	let submitting = $state(false);
	let celebrating = $state(false);

	function celebrate() {
		celebrating = true;
		if (hapticsAvailable()) playHaptic("threshold");
		setTimeout(() => (celebrating = false), BURST_MS);
	}
</script>

<span class="relative inline-flex">
	<Button
		size="icon-lg"
		onclick={async () => {
			if (submitting) return;
			submitting = true;

			try {
				if (isFavorite) {
					await removeFavoriteUser({ profileId });
					onFavorite(false);
				} else {
					await addFavoriteUser({ profileId });
					onFavorite(true);
					celebrate();
				}
			} catch (error) {
				console.error(error);
				showErrorToast({
					label: isFavorite
						? "Failed to remove from favorites"
						: "Failed to add to favorites",
					error,
				});
			} finally {
				submitting = false;
			}
		}}
		variant="secondary"
		aria-checked={isFavorite}
		role="switch"
		aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
		class={{ "size-10": compact, "size-12": !compact }}
		disabled={submitting}
	>
		<StarIcon
			weight={isFavorite ? "fill" : "bold"}
			class={{
				"size-5": compact,
				"size-6": !compact,
				"og-star-pop text-yellow-500": celebrating,
			}}
		/>
	</Button>
	{#if celebrating}
		<span class="pointer-events-none absolute inset-0" aria-hidden="true">
			{#each BURST_ANGLES as angle (angle)}
				<i class="og-burst" style:--angle="{angle}deg"></i>
			{/each}
		</span>
	{/if}
</span>
