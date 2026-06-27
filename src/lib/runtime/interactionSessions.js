const InteractionSession = require('../schemas/interactionSessionSchema');

const memorySessions = new Map();
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

async function saveInteractionSession(input = {}) {
	const now = new Date().toISOString();
	const sessionId = String(input.sessionId || input.messageId || '');
	if (!sessionId) throw new TypeError('Interaction session requires a sessionId or messageId.');

	const document = {
		sessionId,
		kind: input.kind || 'component',
		ownerId: input.ownerId || null,
		guildId: input.guildId || null,
		channelId: input.channelId || null,
		messageId: input.messageId || null,
		state: input.state && typeof input.state === 'object' ? input.state : {},
		expiresAt: input.expiresAt || new Date(Date.now() + (input.ttlMs || DEFAULT_TTL_MS)).toISOString(),
		createdAt: input.createdAt || now,
		updatedAt: now
	};

	memorySessions.set(sessionId, document);
	if (document.messageId) memorySessions.set(`message:${document.messageId}`, document);

	try {
		const existing = await InteractionSession.findOne({ sessionId });
		if (existing) {
			Object.assign(existing, document, { createdAt: existing.createdAt || document.createdAt });
			await existing.save();
			return existing;
		}
		return await InteractionSession.create(document);
	} catch {
		return document;
	}
}

async function updateInteractionSession(sessionId, updates = {}) {
	const existing = await getInteractionSession({ sessionId });
	if (!existing) return saveInteractionSession({ ...updates, sessionId });
	return saveInteractionSession({
		...existing,
		...updates,
		sessionId: existing.sessionId || sessionId,
		state: { ...(existing.state || {}), ...(updates.state || {}) },
		createdAt: existing.createdAt
	});
}

async function getInteractionSession({ sessionId, messageId } = {}) {
	const keys = [sessionId, messageId ? `message:${messageId}` : null].filter(Boolean).map(String);
	for (const key of keys) {
		const cached = memorySessions.get(key);
		if (cached && !isExpired(cached)) return cached;
	}

	try {
		let session = sessionId ? await InteractionSession.findOne({ sessionId: String(sessionId) }) : null;
		if (!session && messageId) session = await InteractionSession.findOne({ messageId: String(messageId) });
		if (!session || isExpired(session)) return null;
		memorySessions.set(session.sessionId, session);
		if (session.messageId) memorySessions.set(`message:${session.messageId}`, session);
		return session;
	} catch {
		return null;
	}
}

async function deleteInteractionSession(sessionId) {
	if (!sessionId) return;
	const session = memorySessions.get(String(sessionId));
	memorySessions.delete(String(sessionId));
	if (session?.messageId) memorySessions.delete(`message:${session.messageId}`);
	try {
		await InteractionSession.deleteOne({ sessionId: String(sessionId) });
	} catch {}
}

function isExpired(session) {
	return Boolean(session?.expiresAt && Date.parse(session.expiresAt) <= Date.now());
}

function clearInteractionSessionCache() {
	memorySessions.clear();
}

module.exports = {
	clearInteractionSessionCache,
	deleteInteractionSession,
	getInteractionSession,
	saveInteractionSession,
	updateInteractionSession
};
