// Map screen: refreshing pin positions, the satellite view, save errors, the
// crash fallback and the hidden diagnostics panel.
export const enMap = {
	"map.refreshAll": "Update positions",
	"map.refreshAllTitle": "Update the positions of profile pins",
	"map.refreshOne": "Update",
	"map.refreshProgress": "Updating {n}/{total}…",
	"map.refreshing": "Updating…",
	"map.refreshFailed": "Couldn't update the position",
	"map.refreshPartial": "Updated {done} of {total} positions",
	"map.saveFailed": "Couldn't save the change on this device",
	"map.tilesFailing": "The map isn't loading. Check your connection.",
	"map.satellite": "Satellite view",
	"map.errorTitle": "The map ran into a problem",
	"map.retry": "Try again",
	"map.traceTitle": "Map diagnostics",
	"map.traceHint":
		"Nothing is stored or sent. If the map misbehaves, copy this and share it.",
	"map.traceCopy": "Copy report",
	"map.traceReload": "Reload the map",
	"map.traceHome": "Back to home",
	"map.traceCopied": "Report copied",
	"map.traceCopyFailed": "Couldn't copy the report",
} as const;
