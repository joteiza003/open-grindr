<script lang="ts">
	import { PlusIcon, TrashIcon } from "phosphor-svelte";
	import { toast } from "svelte-sonner";

	import { showErrorToast } from "$lib/api/error-toast";
	import {
		addMediaToDrawer,
		UnsupportedChatMediaError,
	} from "$lib/api/messaging/chat-media";
	import {
		deleteDrawerMedia,
		type DrawerMedia,
		getAllDrawerMedia,
	} from "$lib/api/messaging/drawer";
	import {
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import MediaSheetGrid from "$lib/components/media-sheet/MediaSheetGrid.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { t } from "$lib/i18n";
	import { mediaFileKindOf } from "$lib/platform/media-file";
	import { pickMultipleMedia } from "$lib/platform/media-picker";
	import { proxyMediaUrl } from "$lib/util/media";
	import { SelectionSet } from "$lib/util/selection.svelte";

	const MAX_ITEMS = 5;

	const initial = preferencesSnapshot().browse;
	let texts = $state<string[]>([...initial.greetingMessages]);
	const selected = new SelectionSet<number>(MAX_ITEMS);
	for (const id of initial.greetingMediaIds) selected.add(id);

	let media = $state<DrawerMedia[] | null>(null);
	let error = $state<unknown>(null);
	let uploading = $state(0);

	async function load() {
		media = null;
		error = null;
		try {
			media = (await getAllDrawerMedia()).filter(
				(item) => mediaFileKindOf(item.contentType) !== "video",
			);
		} catch (err) {
			console.error(err);
			error = err;
		}
	}
	void load();

	function save(next: {
		greetingMessages?: string[];
		greetingMediaIds?: number[];
	}) {
		setPreferences({
			browse: { ...preferencesSnapshot().browse, ...next },
		}).catch((err: unknown) => {
			showErrorToast({ label: "Failed to save preferences", error: err });
		});
	}

	function saveTexts() {
		save({
			greetingMessages: texts
				.map((text) => text.trim())
				.filter((text) => text !== ""),
		});
	}

	function toggle(id: number) {
		selected.toggle(id);
		save({ greetingMediaIds: selected.values() });
	}

	function restoreDefault() {
		texts = ["Hola", "¿Qué tal?"];
		selected.clear();
		save({ greetingMessages: [...texts], greetingMediaIds: [] });
	}

	async function addMedia() {
		let picked;
		try {
			picked = await pickMultipleMedia("media");
		} catch (err) {
			console.error(err);
			toast.error("Couldn't open the picker");
			return;
		}
		uploading += picked.length;
		for (const item of picked) {
			try {
				const added = await addMediaToDrawer(item);
				media = [
					added,
					...(media ?? []).filter(({ id }) => id !== added.id),
				];
			} catch (err) {
				console.error(err);
				toast.error(
					err instanceof UnsupportedChatMediaError
						? err.message
						: "Couldn't upload photo or video",
				);
			} finally {
				uploading--;
			}
		}
	}

	function describe(item: DrawerMedia) {
		return {
			key: item.id,
			src: proxyMediaUrl(item.url, { as: "image" }),
			video: false,
		};
	}
</script>

<svelte:head>
	<title>{t("greeting.title")}</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<section class="flex flex-col gap-2">
		<h2 class="text-sm font-semibold">{t("greeting.messages")}</h2>
		<p class="text-xs text-muted-foreground">{t("greeting.hint")}</p>
		{#each texts.keys() as index (index)}
			<div class="flex items-center gap-2">
				<Input
					bind:value={texts[index]}
					maxlength={500}
					aria-label={t("greeting.messageN", { n: index + 1 })}
					onchange={saveTexts}
				/>
				<Button
					variant="ghost"
					size="icon"
					class="size-9 shrink-0"
					aria-label={t("greeting.remove")}
					onclick={() => {
						texts = texts.filter((_, i) => i !== index);
						saveTexts();
					}}
				>
					<TrashIcon class="size-4" />
				</Button>
			</div>
		{/each}
		<div class="flex gap-2">
			{#if texts.length < MAX_ITEMS}
				<Button
					variant="secondary"
					size="sm"
					onclick={() => (texts = [...texts, ""])}
				>
					<PlusIcon class="size-4" />
					{t("greeting.add")}
				</Button>
			{/if}
			<Button variant="ghost" size="sm" onclick={restoreDefault}>
				{t("greeting.restore")}
			</Button>
		</div>
	</section>

	<section class="flex flex-col gap-2">
		<h2 class="text-sm font-semibold">{t("greeting.photos")}</h2>
		<p class="text-xs text-muted-foreground">
			{t("greeting.photosHint", { max: MAX_ITEMS })}
		</p>
		<MediaSheetGrid
			items={media}
			{error}
			onRetry={() => void load()}
			{describe}
			{selected}
			onToggle={toggle}
			emptyTitle="No media sent yet"
			addLabel="Upload photos or videos"
			onAdd={addMedia}
			pending={uploading}
			remove={(item) => deleteDrawerMedia(item.id)}
			onRemoved={(item) => {
				media = (media ?? []).filter(({ id }) => id !== item.id);
			}}
		/>
	</section>
</div>
