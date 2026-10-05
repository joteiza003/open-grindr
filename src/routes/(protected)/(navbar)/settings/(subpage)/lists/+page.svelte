<script lang="ts">
	import { PencilSimpleIcon, PlusIcon, TrashIcon } from "phosphor-svelte";

	import { showErrorToast } from "$lib/api/error-toast";
	import { getProfiles } from "$lib/api/users/profiles";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import {
		listProblemKey,
		MAX_FAVORITE_LISTS,
		MAX_LIST_NAME,
		type ListProblem,
	} from "$lib/favorites/lists";
	import {
		addList,
		favoriteLists,
		removeFavoriteList,
		renameFavoriteList,
		setListMember,
	} from "$lib/favorites/lists-state.svelte";
	import { t } from "$lib/i18n";

	const lists = $derived(favoriteLists());

	let newName = $state("");
	let newProblem = $state<ListProblem | null>(null);
	let editingId = $state<string | null>(null);
	let editName = $state("");
	let editProblem = $state<ListProblem | null>(null);
	let expandedId = $state<string | null>(null);
	let names = $state<Record<number, string | null>>({});
	let deleting = $state<string | null>(null);
	let deleteOpen = $state(false);

	async function create() {
		try {
			const result = await addList(newName);
			if (result.ok) {
				newName = "";
				newProblem = null;
			} else {
				newProblem = result.problem;
			}
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("lists.failed"), error });
		}
	}

	function startEdit(id: string, name: string) {
		editingId = id;
		editName = name;
		editProblem = null;
	}

	async function saveEdit() {
		if (editingId === null) return;
		try {
			const result = await renameFavoriteList(editingId, editName);
			if (result.ok) {
				editingId = null;
				editProblem = null;
			} else {
				editProblem = result.problem;
			}
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("lists.failed"), error });
		}
	}

	async function toggleExpand(id: string, profileIds: readonly number[]) {
		expandedId = expandedId === id ? null : id;
		if (expandedId === null) return;
		const missing = profileIds.filter((pid) => !(pid in names));
		if (missing.length === 0) return;
		try {
			const profiles = await getProfiles([...missing]);
			for (const profile of profiles)
				names[profile.profileId] = profile.displayName ?? null;
		} catch (error) {
			console.error(error);
		}
	}

	async function confirmDelete() {
		const id = deleting;
		deleteOpen = false;
		if (id === null) return;
		try {
			await removeFavoriteList(id);
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("lists.failed"), error });
		}
	}
</script>

<div class="flex w-full p-4 pb-nav-clear">
	<div
		class="m-auto flex w-full max-w-120 flex-col gap-4"
		data-slot="favorite-lists"
	>
		<p class="text-xs text-muted-foreground">{t("lists.localNote")}</p>

		<form
			class="flex flex-col gap-2"
			onsubmit={(event) => {
				event.preventDefault();
				void create();
			}}
		>
			<div class="flex gap-2">
				<Input
					bind:value={newName}
					maxlength={MAX_LIST_NAME}
					placeholder={t("lists.newPlaceholder")}
					aria-label={t("lists.newPlaceholder")}
					disabled={lists.length >= MAX_FAVORITE_LISTS}
				/>
				<Button
					type="submit"
					size="icon"
					aria-label={t("lists.create")}
					disabled={newName.trim() === "" ||
						lists.length >= MAX_FAVORITE_LISTS}
				>
					<PlusIcon />
				</Button>
			</div>
			{#if newProblem}
				<p class="text-sm text-destructive" role="alert">
					{t(listProblemKey(newProblem), { max: MAX_FAVORITE_LISTS })}
				</p>
			{/if}
		</form>

		{#if lists.length === 0}
			<p class="text-sm text-muted-foreground">{t("lists.none")}</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each lists as list (list.id)}
					<li
						class="flex flex-col gap-2 rounded-xl border border-border p-3"
						data-list={list.id}
					>
						{#if editingId === list.id}
							<form
								class="flex flex-col gap-2"
								onsubmit={(event) => {
									event.preventDefault();
									void saveEdit();
								}}
							>
								<div class="flex gap-2">
									<Input
										bind:value={editName}
										maxlength={MAX_LIST_NAME}
										aria-label={t("lists.rename")}
									/>
									<Button type="submit" size="sm"
										>{t("lists.save")}</Button
									>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => (editingId = null)}
									>
										{t("common.cancel")}
									</Button>
								</div>
								{#if editProblem}
									<p
										class="text-sm text-destructive"
										role="alert"
									>
										{t(listProblemKey(editProblem), {
											max: MAX_FAVORITE_LISTS,
										})}
									</p>
								{/if}
							</form>
						{:else}
							<div
								class="flex items-center justify-between gap-2"
							>
								<button
									type="button"
									class="flex min-w-0 flex-1 flex-col items-start text-start"
									aria-expanded={expandedId === list.id}
									onclick={() =>
										void toggleExpand(
											list.id,
											list.profileIds,
										)}
								>
									<span
										class="max-w-full truncate font-medium"
										>{list.name}</span
									>
									<span class="text-xs text-muted-foreground">
										{t("lists.members", {
											n: list.profileIds.length,
										})}
									</span>
								</button>
								<Button
									variant="ghost"
									size="icon"
									aria-label={t("lists.renameNamed", {
										name: list.name,
									})}
									onclick={() =>
										startEdit(list.id, list.name)}
								>
									<PencilSimpleIcon />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="text-destructive"
									aria-label={t("lists.deleteNamed", {
										name: list.name,
									})}
									onclick={() => {
										deleting = list.id;
										deleteOpen = true;
									}}
								>
									<TrashIcon />
								</Button>
							</div>
						{/if}
						{#if expandedId === list.id}
							{#if list.profileIds.length === 0}
								<p class="text-sm text-muted-foreground">
									{t("lists.empty")}
								</p>
							{:else}
								<ul class="flex flex-col">
									{#each list.profileIds as pid (pid)}
										<li
											class="flex items-center justify-between gap-2 py-1"
										>
											<a
												href="/profile/{pid}"
												class="truncate text-sm"
											>
												{names[pid] ??
													t("silence.person", {
														id: pid,
													})}
											</a>
											<Button
												variant="ghost"
												size="sm"
												onclick={() =>
													void setListMember({
														listId: list.id,
														profileId: pid,
														member: false,
													})}
											>
												{t("lists.remove")}
											</Button>
										</li>
									{/each}
								</ul>
							{/if}
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<AlertDialog.Root bind:open={deleteOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{t("lists.deleteTitle")}</AlertDialog.Title>
			<AlertDialog.Description
				>{t("lists.deleteBody")}</AlertDialog.Description
			>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel size="lg"
				>{t("common.cancel")}</AlertDialog.Cancel
			>
			<AlertDialog.Action
				variant="destructive"
				size="lg"
				onclick={() => void confirmDelete()}
			>
				{t("common.delete")}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
