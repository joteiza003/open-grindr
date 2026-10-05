<script lang="ts">
	import { TrashIcon } from "phosphor-svelte";
	import { toast } from "svelte-sonner";

	import { exportLibrary } from "$lib/chat/export-library";
	import {
		formatBytes,
		totalBytes,
		usageByContact,
	} from "$lib/chat/library-storage";
	import { Button } from "$lib/components/ui/button";
	import { t } from "$lib/i18n";
	import type { SavedAlbum } from "$lib/model/messaging/saved-albums";

	let {
		albums,
		onDeleteMany,
	}: {
		albums: SavedAlbum[];
		onDeleteMany: (localIds: string[]) => Promise<void>;
	} = $props();

	let open = $state(false);
	const usage = $derived(usageByContact(albums));

	async function exportAll() {
		try {
			await exportLibrary(albums);
			toast.success(t("albumsKit.exported"));
		} catch (error) {
			console.error(error);
			toast.error(t("albumsKit.exportFailed"));
		}
	}
</script>

{#if albums.length > 0}
	<section
		data-slot="library-storage"
		class="rounded-2xl border border-border p-3 text-sm"
	>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="min-w-0 flex-1 text-start"
				aria-expanded={open}
				onclick={() => (open = !open)}
			>
				<span class="font-medium">{t("albumsKit.storageTitle")}</span>
				<span class="block text-xs text-muted-foreground">
					{t("albumsKit.storageUsed", {
						size: formatBytes(totalBytes(albums)),
						count: albums.length,
					})}
				</span>
			</button>
			<Button
				size="sm"
				variant="secondary"
				onclick={() => void exportAll()}
			>
				{t("albumsKit.export")}
			</Button>
		</div>
		{#if open}
			<ul class="mt-2 flex flex-col gap-1">
				{#each usage as contact (contact.key)}
					<li class="flex items-center gap-2">
						<span class="min-w-0 flex-1 truncate">
							{contact.name ?? t("search.unknownChat")}
						</span>
						<span class="text-xs text-muted-foreground">
							{contact.count} · {formatBytes(contact.bytes)}
						</span>
						<Button
							size="icon"
							variant="ghost"
							class="size-8"
							aria-label={t("albumsKit.deleteContact", {
								name: contact.name ?? t("search.unknownChat"),
							})}
							onclick={() => void onDeleteMany(contact.localIds)}
						>
							<TrashIcon class="size-4" />
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}
