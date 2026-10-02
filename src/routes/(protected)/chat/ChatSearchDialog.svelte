<script lang="ts">
	import { goto } from "$app/navigation";

	import { getConversations } from "$lib/chat/conversations-context.svelte";
	import {
		SEARCH_KINDS,
		type SearchKind,
		searchMessages,
		splitAroundMatch,
	} from "$lib/chat/message-search";
	import { Input } from "$lib/components/ui/input";
	import * as ResponsiveDialog from "$lib/components/ui/responsive-dialog";
	import { t } from "$lib/i18n";

	let {
		open = $bindable(false),
		conversationId,
	}: {
		open: boolean;
		/** Si se indica, solo se busca en esa conversación. */
		conversationId?: string;
	} = $props();

	const conversations = getConversations();

	let query = $state("");
	let kind = $state<SearchKind>("all");

	const results = $derived(
		open
			? searchMessages({
					conversations: conversations.entries.map((entry) => ({
						conversationId: entry.data.conversationId,
						name: entry.data.name ?? null,
						preview: entry.data.preview ?? undefined,
						lastActivityTimestamp: entry.data.lastActivityTimestamp,
					})),
					getCached: (id) => conversations.getCachedConversation(id),
					query,
					kind,
					conversationId,
				})
			: [],
	);
	const searching = $derived(query.trim() !== "" || kind !== "all");

	const kindLabel: Record<SearchKind, () => string> = {
		all: () => t("search.kind.all"),
		text: () => t("search.kind.text"),
		media: () => t("search.kind.media"),
		link: () => t("search.kind.link"),
		location: () => t("search.kind.location"),
	};

	function openResult(id: string) {
		open = false;
		void goto(`/chat/${id}`);
	}

	function resultLabel(result: (typeof results)[number]): string {
		if (result.text !== null) return result.text;
		return kindLabel[result.kind === "other" ? "all" : result.kind]();
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
			<ResponsiveDialog.Title>
				{conversationId ? t("search.titleChat") : t("search.title")}
			</ResponsiveDialog.Title>
			<ResponsiveDialog.Description>
				{t("search.scope")}
			</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>
		<ResponsiveDialog.Body
			data-slot="chat-search"
			class="flex flex-col gap-3"
			dialogClass="-mx-1 px-1"
			drawerClass="px-4 pb-4"
		>
			<Input
				type="search"
				bind:value={query}
				placeholder={t("search.placeholder")}
				aria-label={t("search.placeholder")}
			/>
			<div
				role="radiogroup"
				aria-label={t("search.kinds")}
				data-scroll-intent="x"
				class="scrollbar-thin flex items-center gap-1.5 overflow-x-auto"
			>
				{#each SEARCH_KINDS as option (option)}
					<button
						type="button"
						role="radio"
						aria-checked={option === kind}
						class="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors aria-checked:border-transparent aria-checked:bg-primary aria-checked:text-primary-foreground"
						onclick={() => (kind = option)}
					>
						{kindLabel[option]()}
					</button>
				{/each}
			</div>

			{#if !searching}
				<p class="text-sm text-muted-foreground">{t("search.start")}</p>
			{:else if results.length === 0}
				<p class="text-sm text-muted-foreground">{t("search.none")}</p>
			{:else}
				<ul class="flex flex-col gap-1">
					{#each results as result (`${result.conversationId}:${result.messageId ?? "preview"}`)}
						{@const parts =
							result.text !== null
								? splitAroundMatch({ text: result.text, query })
								: null}
						<li>
							<button
								type="button"
								class="flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-start transition-colors hover:bg-muted/70"
								onclick={() =>
									openResult(result.conversationId)}
							>
								<span
									class="text-xs font-medium text-muted-foreground"
								>
									{result.conversationName ??
										t("search.unknownChat")}
									{#if result.fromPreview}
										· {t("search.fromPreview")}
									{/if}
								</span>
								<span
									class="line-clamp-2 text-sm wrap-anywhere"
								>
									{#if parts && parts.match !== ""}
										{parts.before}<mark
											class="rounded-sm bg-primary/25 text-foreground"
											>{parts.match}</mark
										>{parts.after}
									{:else}
										{resultLabel(result)}
									{/if}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</ResponsiveDialog.Body>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
