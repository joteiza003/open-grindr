<script lang="ts">
	import { untrack } from "svelte";

	import { showErrorToast } from "$lib/api/error-toast";
	import { getOrCreateConversationsState } from "$lib/chat/conversations-context.svelte";
	import { Button } from "$lib/components/ui/button";
	import { t } from "$lib/i18n";
	import {
		endSilence,
		silenceEntries,
	} from "$lib/safety/silence-state.svelte";
	import {
		isSilenceActive,
		type SilenceEntry,
	} from "$lib/safety/temporary-silence";

	let { data }: { data: { ourProfileId: number } } = $props();

	const conversations = untrack(() =>
		getOrCreateConversationsState(data.ourProfileId),
	);
	const active = $derived(
		silenceEntries()
			.filter((entry) => isSilenceActive(entry, Date.now()))
			.toSorted((a, b) => a.until - b.until),
	);

	async function reactivate(entry: SilenceEntry) {
		try {
			if (entry.kind === "mute" && entry.conversationId !== undefined) {
				await conversations.setMuted({
					conversationIds: [entry.conversationId],
					muted: false,
				});
			}
			await endSilence({ profileId: entry.profileId, kind: entry.kind });
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("silence.failed"), error });
		}
	}
</script>

<div class="flex w-full p-4 pb-nav-clear">
	<div
		class="m-auto flex w-full max-w-120 flex-col gap-3"
		data-slot="silences"
	>
		{#if active.length === 0}
			<p class="text-sm text-muted-foreground">{t("silence.none")}</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each active as entry (`${entry.profileId}:${entry.kind}`)}
					<li
						class="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
					>
						<a
							href="/profile/{entry.profileId}"
							class="flex min-w-0 flex-col"
						>
							<span class="truncate text-sm font-medium">
								{t("silence.person", { id: entry.profileId })}
							</span>
							<span class="text-xs text-muted-foreground">
								{entry.kind === "mute"
									? t("silence.kindMute")
									: t("silence.kindHide")}
								· {new Date(entry.until).toLocaleString()}
							</span>
						</a>
						<Button
							variant="secondary"
							size="sm"
							onclick={() => void reactivate(entry)}
						>
							{t("silence.reactivate")}
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
