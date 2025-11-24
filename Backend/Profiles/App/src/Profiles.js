
import dotenv from 'dotenv';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: "src/.env"});

const HOST = process.env.PROFILES_HOST ?? '0.0.0.0';
const PORT = parseInt(process.env.PROFILES_PORT ?? process.env.PORT ?? '3006', 10);
const DB_PATH = process.env.PROFILES_DB_PATH ?? path.join(process.cwd(), 'data', 'profiles.db');
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;
const JWT_AUDIENCE = process.env.AUTH_JWT_AUDIENCE;

const decodePem = (value) => {
	if (!value) return null;
	const trimmed = value.trim();
	if (trimmed.includes('-----BEGIN')) {
		return trimmed;
	}
	try {
		return Buffer.from(trimmed, 'base64').toString('utf8');
	} catch (_err) {
		return trimmed;
	}
};

const publicKeyPem = decodePem(JWT_PUBLIC_KEY);

if (!publicKeyPem) {
	console.warn('[profiles] Missing JWT_PUBLIC_KEY – provide a PEM string or base64-encoded PEM');
}

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.prepare(`
	CREATE TABLE IF NOT EXISTS profiles (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL UNIQUE,
		display_name TEXT,
		avatar_url TEXT,
		bio TEXT,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	)
`).run();

const upsertProfileStmt = db.prepare(`
	INSERT INTO profiles (user_id, display_name, avatar_url, bio, updated_at)
	VALUES (@user_id, @display_name, @avatar_url, @bio, CURRENT_TIMESTAMP)
	ON CONFLICT(user_id) DO UPDATE SET
		display_name=excluded.display_name,
		avatar_url=excluded.avatar_url,
		bio=excluded.bio,
		updated_at=CURRENT_TIMESTAMP
`);
const getProfileStmt = db.prepare('SELECT * FROM profiles WHERE user_id = ?');
const listProfilesStmt = db.prepare('SELECT * FROM profiles ORDER BY updated_at DESC LIMIT ? OFFSET ?');

const app = Fastify({ logger: true });

if (publicKeyPem) {
	const verifyOptions = {
		algorithms: ['RS256', 'RS512']
	};
	if (JWT_AUDIENCE) {
		verifyOptions.audience = JWT_AUDIENCE;
	}
	await app.register(fastifyJwt, {
		secret: {
			public: publicKeyPem
		},
		verify: verifyOptions
	});
	app.decorate('authenticate', async function authenticate(request) {
		await request.jwtVerify();
	});
} else {
	app.decorate('authenticate', async () => {
		const error = new Error('JWT verification not configured');
		error.statusCode = 503;
		throw error;
	});
}

const sanitizeProfile = (row) => ({
	userId: row.user_id,
	displayName: row.display_name,
	avatarUrl: row.avatar_url,
	bio: row.bio,
	createdAt: row.created_at,
	updatedAt: row.updated_at
});

const parseUserId = (maybeId) => {
	const id = Number(maybeId);
	return Number.isFinite(id) ? id : null;
};

const ensureUserFromToken = (user) => {
	const userId = parseUserId(user?.sub);
	if (userId === null) {
		const error = new Error('Missing user id in token');
		error.statusCode = 400;
		throw error;
	}
	return userId;
};

app.post('/profiles/me', { preValidation: [app.authenticate] }, async (request) => {
	const userId = ensureUserFromToken(request.user);

	const payload = typeof request.body === 'object' && request.body !== null ? request.body : {};
	const display_name = typeof payload.displayName === 'string' ? payload.displayName : null;
	const avatar_url = typeof payload.avatarUrl === 'string' ? payload.avatarUrl : null;
	const bio = typeof payload.bio === 'string' ? payload.bio : null;

	upsertProfileStmt.run({ user_id: userId, display_name, avatar_url, bio });
	const profile = getProfileStmt.get(userId);
	return { profile: sanitizeProfile(profile) };
});

app.get('/profiles/me', { preValidation: [app.authenticate] }, async (request, reply) => {
	const userId = ensureUserFromToken(request.user);

	const profile = getProfileStmt.get(userId);
	if (!profile) {
		reply.code(404);
		return { message: 'Profile not found' };
	}
	return { profile: sanitizeProfile(profile) };
});

app.get('/profiles', { preValidation: [app.authenticate] }, async (request) => {
	const query = request.query ?? {};
	const limitParam = Number(query.limit ?? 20);
	const offsetParam = Number(query.offset ?? 0);
	const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 20;
	const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;
	const rows = listProfilesStmt.all(limit, offset);
	return {
		profiles: rows.map(sanitizeProfile),
		pagination: { limit, offset }
	};
});

app.get('/profiles/:userId', { preValidation: [app.authenticate] }, async (request, reply) => {
	const userId = parseUserId(request.params?.userId);
	if (userId === null) {
		reply.code(400);
		return { message: 'Invalid user id' };
	}
	const profile = getProfileStmt.get(userId);
	if (!profile) {
		reply.code(404);
		return { message: 'Profile not found' };
	}
	return { profile: sanitizeProfile(profile) };
});

const start = async () => {
	try {
		await app.listen({ host: HOST, port: PORT });
		app.log.info(`Profiles service listening on http://${HOST}:${PORT}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
};

if (process.env.NODE_ENV !== 'test') {
	start();
}

export default app;


