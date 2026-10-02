export type MarkAllReadResult = {
	/** Conversaciones marcadas como leídas con éxito. */
	marked: number;
	/** Conversaciones que no se pudieron marcar. */
	failed: number;
	/** No se pudo consultar la lista completa de sin leer (solo se marcó lo cargado). */
	listFailed: boolean;
};

const CONCURRENCY = 4;
const MAX_PAGES = 50;

/**
 * Marca como leídas todas las conversaciones con mensajes sin leer: las ya
 * cargadas más las que el servidor aún tenga sin leer en páginas no cargadas.
 * La API marca de una en una, así que se hace con algo de paralelismo.
 */
export async function runMarkAllRead({
	loadedUnreadIds,
	fetchUnreadPage,
	markOne,
}: {
	loadedUnreadIds: readonly string[];
	/** Una página de conversaciones sin leer; `nextPage` nulo cuando no hay más. */
	fetchUnreadPage: (
		page: number,
	) => Promise<{ ids: string[]; nextPage: number | null }>;
	/** Marca una conversación; devuelve `false` si falla. */
	markOne: (conversationId: string) => Promise<boolean>;
}): Promise<MarkAllReadResult> {
	const ids = new Set(loadedUnreadIds);
	let listFailed = false;
	try {
		let page: number | null = 1;
		for (let guard = 0; page !== null && guard < MAX_PAGES; guard++) {
			const result = await fetchUnreadPage(page);
			for (const id of result.ids) ids.add(id);
			page = result.nextPage;
		}
	} catch {
		listFailed = true;
	}

	const queue = [...ids];
	let marked = 0;
	let failed = 0;
	const worker = async () => {
		for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
			if (await markOne(id)) marked += 1;
			else failed += 1;
		}
	};
	await Promise.all(
		Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker),
	);
	return { marked, failed, listFailed };
}
