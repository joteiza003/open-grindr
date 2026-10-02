<script lang="ts">
	import { ClockCounterClockwiseIcon } from "phosphor-svelte";

	import { profileMetadata } from "$lib/app-data/profile-metadata.svelte";
	import { t } from "$lib/i18n";
	import { currentLocale } from "$lib/i18n/t";
	import {
		hasRelationship,
		relationshipSummary,
		type RelationshipSummary,
		relativeTime,
	} from "$lib/profile/relationship";
	import { directConversationId } from "$lib/right-now/right-now-post";
	import { usageEvents } from "$lib/stats/event-log";
	import { getNow } from "$lib/util/now";
	import ProfileSection from "./ProfileSection.svelte";

	let {
		ourProfileId,
		profileId,
	}: { ourProfileId: number; profileId: number } = $props();

	let summary = $state<RelationshipSummary | null>(null);

	$effect(() => {
		let cancelled = false;
		usageEvents
			.all()
			.then((events) => {
				if (cancelled) return;
				summary = relationshipSummary(events, {
					conversationId: directConversationId(
						ourProfileId,
						profileId,
					),
					profileId,
				});
			})
			.catch((error: unknown) => console.error(error));
		return () => {
			cancelled = true;
		};
	});

	const meta = $derived(profileMetadata(profileId));
	const locale = $derived(currentLocale());
	const when = (at: number) => relativeTime(at, getNow(), locale);

	const lines = $derived.by(() => {
		const out: string[] = [];
		if (summary) {
			if (summary.messagesIn + summary.messagesOut > 0) {
				out.push(
					t("profile.you.messages", {
						out: summary.messagesOut,
						in: summary.messagesIn,
					}),
				);
				if (summary.lastAt !== null) {
					out.push(
						t("profile.you.lastMessage", {
							when: when(summary.lastAt),
						}),
					);
				}
				if (summary.firstAt !== null && summary.startedByMe !== null) {
					out.push(
						t(
							summary.startedByMe
								? "profile.you.firstMessage"
								: "profile.you.theyStarted",
							{ when: when(summary.firstAt) },
						),
					);
				}
			}
			if (summary.decision) {
				out.push(
					t(`profile.you.decision.${summary.decision.kind}`, {
						when: when(summary.decision.at),
					}),
				);
			}
		}
		if (meta.visits !== undefined && meta.visits > 0) {
			out.push(t("profile.you.visits", { count: meta.visits }));
		}
		return out;
	});
</script>

<ProfileSection title={t("profile.you.title")}>
	<div data-slot="profile-you" class="flex flex-col gap-1.5 text-sm">
		{#if summary !== null && (hasRelationship(summary) || lines.length > 0)}
			{#each lines as line (line)}
				<p class="flex items-center gap-2">
					<ClockCounterClockwiseIcon
						class="size-4 shrink-0 text-muted-foreground"
					/>
					{line}
				</p>
			{/each}
		{:else}
			<p class="text-muted-foreground">{t("profile.you.empty")}</p>
		{/if}
	</div>
</ProfileSection>
