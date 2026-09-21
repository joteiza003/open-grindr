/**
 * A tiny per-resource write serializer. Index files are persisted with a
 * read-modify-write cycle (load the whole list, change one entry, write it
 * back). If two of those cycles overlap — e.g. two received locations
 * auto-capturing on render at once — both read the same list and the second
 * write clobbers the first, silently dropping an entry. Chaining every
 * mutation through one queue makes them run strictly one after another.
 *
 * Each call site owns its own queue (albums and locations must not block each
 * other), so this is a factory, not a shared singleton.
 */
export function createWriteSerializer(): <T>(
	op: () => Promise<T>,
) => Promise<T> {
	let tail: Promise<unknown> = Promise.resolve();
	return <T>(op: () => Promise<T>): Promise<T> => {
		const run = tail.then(op, op);
		// Keep the chain alive regardless of whether an op resolves or rejects,
		// so one failed write never wedges every write that follows it.
		tail = run.then(
			() => undefined,
			() => undefined,
		);
		return run;
	};
}
