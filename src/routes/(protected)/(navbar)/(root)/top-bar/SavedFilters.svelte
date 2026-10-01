<script lang="ts">
	import { BookmarkSimpleIcon, TrashIcon } from "phosphor-svelte";
	import { toast } from "svelte-sonner";

	import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import * as ResponsiveDialog from "$lib/components/ui/responsive-dialog";
	import { gridState } from "$lib/grid/grid-state.svelte";
	import { savedFilters } from "$lib/grid/saved-filters-state.svelte";
	import { t } from "$lib/i18n";
	import {
		MAX_SAVED_FILTER_NAME,
		MAX_SAVED_FILTERS,
		type SavedFilter,
		type SaveFilterProblem,
	} from "$lib/model/browse/grid/saved-filters";

	let {
		open = $bindable(false),
		activeCount,
	}: { open: boolean; activeCount: number } = $props();

	let name = $state("");
	let problem = $state<SaveFilterProblem | null>(null);
	let saving = $state(false);

	const geohash = $derived(preferencesSnapshot().geohash);
	const items = $derived(savedFilters.items);
	const full = $derived(items.length >= MAX_SAVED_FILTERS);

	const problemText: Record<SaveFilterProblem, () => string> = {
		"empty-name": () => t("savedFilters.problem.emptyName"),
		"too-many": () =>
			t("savedFilters.problem.tooMany", { max: MAX_SAVED_FILTERS }),
		"duplicate-name": () => t("savedFilters.problem.duplicate"),
	};

	async function saveCurrent() {
		if (saving) return;
		saving = true;
		try {
			const result = await savedFilters.save({
				name,
				filters: gridState.filters.snapshot(),
			});
			if (result.ok) {
				name = "";
				problem = null;
				// Pone al día el contador del filtro recién creado.
				if (geohash) void savedFilters.check({ geohash, force: true });
			} else {
				problem = result.problem;
			}
		} catch (error) {
			console.error(error);
			toast.error(t("savedFilters.failed"));
		} finally {
			saving = false;
		}
	}

	async function apply(saved: SavedFilter) {
		gridState.filters.set(structuredClone(saved.filters));
		open = false;
		try {
			await savedFilters.markViewed(saved.id);
		} catch (error) {
			console.error(error);
		}
	}

	async function remove(saved: SavedFilter) {
		try {
			await savedFilters.remove(saved.id);
		} catch (error) {
			console.error(error);
			toast.error(t("savedFilters.failed"));
		}
	}
</script>

<ResponsiveDialog.Root bind:open>
	<ResponsiveDialog.Content
		class="flex flex-col"
		dialogClass="max-h-[calc(var(--screen-safe)-4rem)] sm:max-w-md"
		drawerClass="max-h-screen-safe"
		dialogProps={{ showCloseButton: true }}
	>
		<ResponsiveDialog.Header class="pb-2">
			<ResponsiveDialog.Title class="flex items-center gap-2">
				<BookmarkSimpleIcon weight="fill" class="size-5" />
				{t("savedFilters.title")}
			</ResponsiveDialog.Title>
			<ResponsiveDialog.Description>
				{t("savedFilters.description")}
			</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>
		<ResponsiveDialog.Body
			data-slot="saved-filters"
			class="flex flex-col gap-4"
			dialogClass="-mx-1 px-1"
			drawerClass="px-4 pb-4"
		>
			{#if items.length === 0}
				<p class="text-sm text-muted-foreground">
					{t("savedFilters.empty")}
				</p>
			{:else}
				<ul class="flex flex-col gap-2">
					{#each items as saved (saved.id)}
						{@const fresh = savedFilters.newCounts[saved.id] ?? 0}
						<li
							class="flex items-center gap-2 rounded-xl border border-border p-2"
						>
							<button
								type="button"
								class="flex min-w-0 flex-1 flex-col items-start text-start"
								onclick={() => void apply(saved)}
							>
								<span class="max-w-full truncate font-medium">
									{saved.name}
								</span>
								<span class="text-xs text-muted-foreground">
									{#if !saved.baselineSet}
										{t("savedFilters.pending")}
									{:else if fresh > 0}
										{t("savedFilters.new", { n: fresh })}
									{:else}
										{t("savedFilters.none")}
									{/if}
								</span>
							</button>
							{#if fresh > 0}
								<span
									class="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-3xs font-semibold text-primary-foreground"
								>
									{fresh}
								</span>
							{/if}
							<Button
								variant="ghost"
								size="icon"
								aria-label={t("savedFilters.delete", {
									name: saved.name,
								})}
								onclick={() => void remove(saved)}
							>
								<TrashIcon class="size-4" />
							</Button>
						</li>
					{/each}
				</ul>
				<p class="text-xs text-muted-foreground">
					{t("savedFilters.checkNote")}
				</p>
			{/if}

			<form
				class="flex flex-col gap-2"
				onsubmit={(event) => {
					event.preventDefault();
					void saveCurrent();
				}}
			>
				<Input
					bind:value={name}
					maxlength={MAX_SAVED_FILTER_NAME}
					placeholder={t("savedFilters.namePlaceholder")}
					aria-label={t("savedFilters.namePlaceholder")}
					disabled={full || activeCount === 0}
				/>
				{#if problem}
					<p class="text-sm text-destructive" role="alert">
						{problemText[problem]()}
					</p>
				{:else if activeCount === 0}
					<p class="text-xs text-muted-foreground">
						{t("savedFilters.noActive")}
					</p>
				{:else if full}
					<p class="text-xs text-muted-foreground">
						{t("savedFilters.problem.tooMany", {
							max: MAX_SAVED_FILTERS,
						})}
					</p>
				{/if}
				<Button
					type="submit"
					disabled={saving ||
						full ||
						activeCount === 0 ||
						name.trim() === ""}
				>
					{t("savedFilters.saveCurrent")}
				</Button>
			</form>
		</ResponsiveDialog.Body>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
