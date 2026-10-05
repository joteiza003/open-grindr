import { usageEvents } from "$lib/stats/event-log";
import {
	MAX_UNDO_HISTORY,
	popUndo,
	pushUndo,
	type UndoableDecision,
} from "./deck-history";
import { unacceptProfile, unrejectProfile } from "./swipe-decisions";

/**
 * Historial de decisiones del carrusel que se pueden deshacer, y el perfil que
 * acaba de volver para mostrarse el primero.
 */
export class DeckUndo {
	history = $state<UndoableDecision[]>([]);
	returnedId = $state<number | null>(null);

	get canUndo(): boolean {
		return this.history.length > 0;
	}

	/** Anota la decisión para poder deshacerla y en el registro de uso. */
	remember(decision: UndoableDecision): void {
		this.history = pushUndo(this.history, decision, MAX_UNDO_HISTORY);
		this.returnedId = null;
		usageEvents.record({
			k: decision.kind === "reject" ? "hide" : decision.kind,
			c: decision.id,
		});
	}

	/**
	 * Revierte la última decisión. "Omitir" solo vive en memoria, así que lo
	 * revierte quien llama con `restoreSkipped`. Si falla, el historial queda
	 * intacto para poder reintentar.
	 */
	async undo({
		restoreSkipped,
	}: {
		restoreSkipped: (id: number) => void;
	}): Promise<void> {
		const last = popUndo(this.history);
		if (!last) return;
		const { id, kind } = last.decision;
		if (kind === "reject") await unrejectProfile(id);
		else if (kind === "like") await unacceptProfile(id);
		else restoreSkipped(id);
		this.history = last.rest;
		this.returnedId = id;
	}
}
