<script lang="ts">
	import { ArrowsDownUpIcon } from "phosphor-svelte";

	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import { INBOX_SORTS, type InboxSort } from "$lib/chat/inbox-sort";
	import { Button } from "$lib/components/ui/button";
	import * as ResponsiveDialog from "$lib/components/ui/responsive-dialog";
	import { t } from "$lib/i18n";

	let open = $state(false);

	const sort = $derived(preferencesSnapshot().chat.inboxSort);
	const label: Record<InboxSort, () => string> = {
		recent: () => t("inboxSort.recent"),
		unread: () => t("inboxSort.unread"),
		online: () => t("inboxSort.online"),
	};

	function choose(next: InboxSort) {
		open = false;
		if (next === sort) return;
		setPreferences({
			chat: { ...preferencesSnapshot().chat, inboxSort: next },
		}).catch((error: unknown) => {
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}
</script>

<Button
	variant="secondary"
	class="h-9"
	data-slot="inbox-sort"
	aria-pressed={sort !== "recent"}
	aria-label={t("inboxSort.title")}
	title={label[sort]()}
	onclick={() => (open = true)}
>
	<ArrowsDownUpIcon weight={sort === "recent" ? "regular" : "fill"} />
</Button>

<ResponsiveDialog.Root bind:open>
	<ResponsiveDialog.Content
		class="flex flex-col"
		dialogClass="sm:max-w-sm"
		dialogProps={{ showCloseButton: true }}
	>
		<ResponsiveDialog.Header class="pb-2">
			<ResponsiveDialog.Title
				>{t("inboxSort.title")}</ResponsiveDialog.Title
			>
			<ResponsiveDialog.Description>
				{t("inboxSort.hint")}
			</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>
		<ResponsiveDialog.Body
			class="flex flex-col gap-1.5"
			drawerClass="px-4 pb-4"
		>
			<div
				role="radiogroup"
				aria-label={t("inboxSort.title")}
				class="flex flex-col gap-1.5"
			>
				{#each INBOX_SORTS as option (option)}
					<button
						type="button"
						role="radio"
						aria-checked={option === sort}
						class="rounded-xl border border-border px-3 py-2 text-start text-sm aria-checked:border-transparent aria-checked:bg-primary aria-checked:text-primary-foreground"
						onclick={() => choose(option)}
					>
						{label[option]()}
					</button>
				{/each}
			</div>
		</ResponsiveDialog.Body>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
