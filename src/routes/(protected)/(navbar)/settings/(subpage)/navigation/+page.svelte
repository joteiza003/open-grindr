<script lang="ts">
	import { ArrowDownIcon, ArrowUpIcon } from "phosphor-svelte";

	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Switch } from "$lib/components/ui/switch";
	import { t } from "$lib/i18n";
	import {
		MAX_NAV_TABS,
		MIN_NAV_TABS,
		moveNavTab,
		type NavTabId,
		normalizeNavTabs,
		orderedNavTabs,
		toggleNavTab,
	} from "$lib/model/nav-tabs";
	import {
		MIN_NOTIFICATION_MODULES,
		moveNotificationModule,
		normalizeNotificationModules,
		type NotificationModuleId,
		orderedNotificationModules,
		toggleNotificationModule,
	} from "$lib/model/notification-modules";
	import PreferenceSwitchSetting from "../app/PreferenceSwitchSetting.svelte";

	const tabs = $derived(normalizeNavTabs(preferencesSnapshot().navTabs));
	const modules = $derived(
		normalizeNotificationModules(preferencesSnapshot().notificationModules),
	);

	const tabLabels: Record<NavTabId, () => string> = {
		browse: () => t("nav.browse"),
		carrousel: () => t("nav.carrousel"),
		rightNow: () => t("nav.rightNow"),
		interest: () => t("nav.interest"),
		chat: () => t("nav.inbox"),
		notifications: () => t("nav.notifications"),
		map: () => t("nav.map"),
	};
	const moduleLabels: Record<NotificationModuleId, () => string> = {
		unanswered: () => t("notifications.unread"),
		savedFilters: () => t("savedFilters.title"),
		stats: () => t("notifications.week"),
		shortcuts: () => t("notifications.shortcuts"),
	};

	function save(values: Parameters<typeof setPreferences>[0]) {
		setPreferences(values).catch((error: unknown) => {
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}
</script>

<div class="flex w-full p-4 pb-nav-clear">
	<div class="m-auto flex w-full max-w-120 flex-col gap-4">
		<section class="flex flex-col gap-2" data-slot="nav-tabs-setting">
			<h2 class="text-sm font-semibold">{t("navSettings.tabs")}</h2>
			<p class="text-xs text-muted-foreground">
				{t("navSettings.tabsHint", {
					min: MIN_NAV_TABS,
					max: MAX_NAV_TABS,
				})}
			</p>
			<ul class="flex flex-col gap-1.5">
				{#each orderedNavTabs(tabs) as entry, index (entry.id)}
					<li
						class="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
						data-tab={entry.id}
					>
						<span
							class={[
								"flex-1 text-sm",
								{ "text-muted-foreground": !entry.visible },
							]}
						>
							{tabLabels[entry.id]()}
						</span>
						{#if entry.visible}
							<Button
								variant="ghost"
								size="icon"
								aria-label={t("navSettings.moveUp", {
									name: tabLabels[entry.id](),
								})}
								disabled={index === 0}
								onclick={() =>
									save({
										navTabs: moveNavTab(tabs, entry.id, -1),
									})}
							>
								<ArrowUpIcon />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								aria-label={t("navSettings.moveDown", {
									name: tabLabels[entry.id](),
								})}
								disabled={index === tabs.length - 1}
								onclick={() =>
									save({
										navTabs: moveNavTab(tabs, entry.id, 1),
									})}
							>
								<ArrowDownIcon />
							</Button>
						{/if}
						<Switch
							checked={entry.visible}
							disabled={!preferencesLoaded() ||
								(entry.visible &&
									tabs.length <= MIN_NAV_TABS) ||
								(!entry.visible && tabs.length >= MAX_NAV_TABS)}
							aria-label={tabLabels[entry.id]()}
							onCheckedChange={() =>
								save({ navTabs: toggleNavTab(tabs, entry.id) })}
						/>
					</li>
				{/each}
			</ul>
			<Button
				variant="ghost"
				class="self-start"
				onclick={() => save({ navTabs: normalizeNavTabs([]) })}
			>
				{t("navSettings.reset")}
			</Button>
		</section>

		<section
			class="flex flex-col gap-2"
			data-slot="notification-modules-setting"
		>
			<h2 class="text-sm font-semibold">{t("navSettings.modules")}</h2>
			<p class="text-xs text-muted-foreground">
				{t("navSettings.modulesHint")}
			</p>
			<ul class="flex flex-col gap-1.5">
				{#each orderedNotificationModules(modules) as entry, index (entry.id)}
					<li
						class="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
						data-module={entry.id}
					>
						<span
							class={[
								"flex-1 text-sm",
								{ "text-muted-foreground": !entry.visible },
							]}
						>
							{moduleLabels[entry.id]()}
						</span>
						{#if entry.visible}
							<Button
								variant="ghost"
								size="icon"
								aria-label={t("navSettings.moveUp", {
									name: moduleLabels[entry.id](),
								})}
								disabled={index === 0}
								onclick={() =>
									save({
										notificationModules:
											moveNotificationModule(
												modules,
												entry.id,
												-1,
											),
									})}
							>
								<ArrowUpIcon />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								aria-label={t("navSettings.moveDown", {
									name: moduleLabels[entry.id](),
								})}
								disabled={index === modules.length - 1}
								onclick={() =>
									save({
										notificationModules:
											moveNotificationModule(
												modules,
												entry.id,
												1,
											),
									})}
							>
								<ArrowDownIcon />
							</Button>
						{/if}
						<Switch
							checked={entry.visible}
							disabled={!preferencesLoaded() ||
								(entry.visible &&
									modules.length <= MIN_NOTIFICATION_MODULES)}
							aria-label={moduleLabels[entry.id]()}
							onCheckedChange={() =>
								save({
									notificationModules:
										toggleNotificationModule(
											modules,
											entry.id,
										),
								})}
						/>
					</li>
				{/each}
			</ul>
		</section>

		<section class="flex flex-col gap-2">
			<PreferenceSwitchSetting
				preference="oneHandMode"
				title={t("navSettings.oneHand")}
				description={t("navSettings.oneHandHint")}
			/>
		</section>
	</div>
</div>
