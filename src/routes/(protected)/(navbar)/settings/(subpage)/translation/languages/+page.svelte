<script lang="ts">
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";

	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Input } from "$lib/components/ui/input";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { t } from "$lib/i18n";
	import { currentLocale } from "$lib/i18n/t";
	import { displayLanguageName } from "$lib/translate/languages";
	import {
		deviceModels,
		MODEL_SIZE_MB,
		REQUIRED_MODEL,
	} from "$lib/translate/models.svelte";
	import type { NativeErrorCode } from "$lib/translate/native";
	import LanguageRow from "./LanguageRow.svelte";

	const locale = $derived(currentLocale());
	let query = $state("");
	let pendingDelete = $state<string | null>(null);
	let deleteOpen = $state(false);

	onMount(() => {
		void deviceModels.refresh().catch((error: unknown) => {
			console.error(error);
			toast.error(t("translate.failed"));
		});
	});

	const rows = $derived(
		deviceModels.supported
			.map((code) => ({
				code,
				name: displayLanguageName(code, locale),
				installed: deviceModels.downloaded.has(code),
			}))
			.filter((row) => {
				const q = query.trim().toLowerCase();
				return (
					q === "" ||
					row.name.toLowerCase().includes(q) ||
					row.code.includes(q)
				);
			})
			.sort(
				(a, b) =>
					Number(b.installed) - Number(a.installed) ||
					a.name.localeCompare(b.name, locale),
			),
	);

	function explain(error: NativeErrorCode, fallback: string): string {
		return error === "wifi-required"
			? t("translate.wifiRequired")
			: fallback;
	}

	async function download(code: string) {
		const error = await deviceModels.download(code);
		if (error) {
			toast.error(explain(error, t("translate.downloadFailed")));
		}
	}

	async function confirmDelete() {
		const code = pendingDelete;
		deleteOpen = false;
		pendingDelete = null;
		if (code === null) return;
		const error = await deviceModels.remove(code);
		if (error) toast.error(t("translate.deleteFailed"));
	}
</script>

<h1 class="truncate ps-4 text-xl font-semibold tracking-tight">
	{t("translate.languages")}
</h1>

{#if !deviceModels.available}
	<p
		class="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground"
	>
		{t("translate.androidOnly")}
	</p>
{:else}
	<p class="px-4 text-sm text-muted-foreground">
		{t("translate.languagesIntro", { size: MODEL_SIZE_MB })}
	</p>
	<p class="px-4 text-xs text-muted-foreground">
		{t("translate.storage", {
			count: deviceModels.downloaded.size,
			size: deviceModels.downloaded.size * MODEL_SIZE_MB,
		})}
	</p>

	<Input
		type="search"
		bind:value={query}
		placeholder={t("translate.search")}
		aria-label={t("translate.search")}
	/>

	{#if deviceModels.loading && deviceModels.supported.length === 0}
		<div class="flex flex-col gap-2">
			<Skeleton class="h-14 w-full rounded-xl" />
			<Skeleton class="h-14 w-full rounded-xl" />
			<Skeleton class="h-14 w-full rounded-xl" />
		</div>
	{:else if rows.length === 0}
		<p class="px-4 py-6 text-center text-sm text-muted-foreground">
			{t("translate.noResults")}
		</p>
	{:else}
		<ul
			class="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card"
		>
			{#each rows as row (row.code)}
				<LanguageRow
					name={row.name}
					code={row.code}
					installed={row.installed}
					required={row.code === REQUIRED_MODEL}
					busy={deviceModels.busy.get(row.code)}
					onDownload={() => void download(row.code)}
					onDelete={() => {
						pendingDelete = row.code;
						deleteOpen = true;
					}}
				/>
			{/each}
		</ul>
	{/if}
	<p class="px-4 text-xs text-muted-foreground">
		{t("translate.euskeraNote")}
	</p>
{/if}

<AlertDialog.Root bind:open={deleteOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				{t("translate.deleteTitle", {
					language: pendingDelete
						? displayLanguageName(pendingDelete, locale)
						: "",
				})}
			</AlertDialog.Title>
			<AlertDialog.Description>
				{t("translate.deleteBody")}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel size="lg">
				{t("common.cancel")}
			</AlertDialog.Cancel>
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
