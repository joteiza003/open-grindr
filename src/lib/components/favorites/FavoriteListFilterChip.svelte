<script lang="ts">
	import { ListHeartIcon } from "phosphor-svelte";

	import { Button } from "$lib/components/ui/button";
	import * as ResponsiveDialog from "$lib/components/ui/responsive-dialog";
	import { favoriteLists, filter } from "$lib/favorites/lists-state.svelte";
	import { t } from "$lib/i18n";

	let { variant = "secondary" }: { variant?: "secondary" | "ghost" } =
		$props();

	let open = $state(false);

	const lists = $derived(favoriteLists());
	const active = $derived(lists.find((list) => list.id === filter.activeId));

	function choose(id: string | null) {
		filter.activeId = id;
		open = false;
	}
</script>

{#if lists.length > 0 || filter.activeId !== null}
	<Button
		{variant}
		class="h-9 max-w-40"
		data-slot="favorite-list-filter"
		aria-pressed={filter.activeId !== null}
		aria-label={t("lists.filter")}
		onclick={() => (open = true)}
	>
		<ListHeartIcon weight={active ? "fill" : "regular"} />
		{#if active}
			<span class="truncate">{active.name}</span>
		{/if}
	</Button>

	<ResponsiveDialog.Root bind:open>
		<ResponsiveDialog.Content
			class="flex flex-col"
			dialogClass="sm:max-w-sm"
			dialogProps={{ showCloseButton: true }}
		>
			<ResponsiveDialog.Header class="pb-2">
				<ResponsiveDialog.Title
					>{t("lists.filter")}</ResponsiveDialog.Title
				>
				<ResponsiveDialog.Description>
					{t("lists.filterHint")}
				</ResponsiveDialog.Description>
			</ResponsiveDialog.Header>
			<ResponsiveDialog.Body
				class="flex flex-col gap-1.5"
				drawerClass="px-4 pb-4"
			>
				<div
					role="radiogroup"
					aria-label={t("lists.filter")}
					class="flex flex-col gap-1.5"
				>
					<button
						type="button"
						role="radio"
						aria-checked={filter.activeId === null}
						class="rounded-xl border border-border px-3 py-2 text-start text-sm aria-checked:border-transparent aria-checked:bg-primary aria-checked:text-primary-foreground"
						onclick={() => choose(null)}
					>
						{t("lists.all")}
					</button>
					{#each lists as list (list.id)}
						<button
							type="button"
							role="radio"
							aria-checked={filter.activeId === list.id}
							class="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-start text-sm aria-checked:border-transparent aria-checked:bg-primary aria-checked:text-primary-foreground"
							onclick={() => choose(list.id)}
						>
							<span class="truncate">{list.name}</span>
							<span class="text-xs opacity-80"
								>{list.profileIds.length}</span
							>
						</button>
					{/each}
				</div>
			</ResponsiveDialog.Body>
		</ResponsiveDialog.Content>
	</ResponsiveDialog.Root>
{/if}
