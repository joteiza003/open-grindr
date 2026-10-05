<script lang="ts">
	import { PlusIcon } from "phosphor-svelte";

	import { showErrorToast } from "$lib/api/error-toast";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import * as ResponsiveDialog from "$lib/components/ui/responsive-dialog";
	import {
		addList,
		favoriteLists,
		setListMember,
	} from "$lib/favorites/lists-state.svelte";
	import {
		listProblemKey,
		MAX_FAVORITE_LISTS,
		MAX_LIST_NAME,
		type ListProblem,
	} from "$lib/favorites/lists";
	import { t } from "$lib/i18n";

	let {
		open = $bindable(false),
		profileId,
	}: { open: boolean; profileId: number } = $props();

	let name = $state("");
	let problem = $state<ListProblem | null>(null);

	const lists = $derived(favoriteLists());

	async function toggle(listId: string, member: boolean) {
		try {
			await setListMember({ listId, profileId, member });
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("lists.failed"), error });
		}
	}

	async function create() {
		try {
			const result = await addList(name);
			if (!result.ok) {
				problem = result.problem;
				return;
			}
			problem = null;
			// La lista recién creada recibe a esta persona.
			const created = favoriteLists().find(
				(list) => list.name.toLowerCase() === name.trim().toLowerCase(),
			);
			if (created)
				await setListMember({
					listId: created.id,
					profileId,
					member: true,
				});
			name = "";
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("lists.failed"), error });
		}
	}
</script>

<ResponsiveDialog.Root bind:open>
	<ResponsiveDialog.Content
		class="flex flex-col"
		dialogClass="sm:max-w-sm"
		dialogProps={{ showCloseButton: true }}
	>
		<ResponsiveDialog.Header class="pb-2">
			<ResponsiveDialog.Title>{t("lists.addTo")}</ResponsiveDialog.Title>
			<ResponsiveDialog.Description
				>{t("lists.localNote")}</ResponsiveDialog.Description
			>
		</ResponsiveDialog.Header>
		<ResponsiveDialog.Body
			data-slot="favorite-lists-dialog"
			class="flex flex-col gap-3"
			drawerClass="px-4 pb-4"
		>
			{#if lists.length === 0}
				<p class="text-sm text-muted-foreground">{t("lists.none")}</p>
			{:else}
				<ul class="flex flex-col gap-1">
					{#each lists as list (list.id)}
						<li>
							<label
								class="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/70"
							>
								<input
									type="checkbox"
									class="size-4"
									checked={list.profileIds.includes(
										profileId,
									)}
									onchange={(event) =>
										void toggle(
											list.id,
											event.currentTarget.checked,
										)}
								/>
								<span class="min-w-0 flex-1 truncate text-sm"
									>{list.name}</span
								>
								<span class="text-xs text-muted-foreground">
									{list.profileIds.length}
								</span>
							</label>
						</li>
					{/each}
				</ul>
			{/if}

			<form
				class="flex flex-col gap-2"
				onsubmit={(event) => {
					event.preventDefault();
					void create();
				}}
			>
				<div class="flex gap-2">
					<Input
						bind:value={name}
						maxlength={MAX_LIST_NAME}
						placeholder={t("lists.newPlaceholder")}
						aria-label={t("lists.newPlaceholder")}
						disabled={lists.length >= MAX_FAVORITE_LISTS}
					/>
					<Button
						type="submit"
						size="icon"
						aria-label={t("lists.create")}
						disabled={name.trim() === "" ||
							lists.length >= MAX_FAVORITE_LISTS}
					>
						<PlusIcon />
					</Button>
				</div>
				{#if problem}
					<p class="text-sm text-destructive" role="alert">
						{t(listProblemKey(problem), {
							max: MAX_FAVORITE_LISTS,
						})}
					</p>
				{/if}
			</form>
		</ResponsiveDialog.Body>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
