
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
		avatar_url TEXT,
		bio TEXT,
		status TEXT DEFAULT 'Offline',
		last_seen DATETIME,
		wins INTEGER DEFAULT 0,
		losses INTEGER DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	)
`).run();

try { db.prepare(`ALTER TABLE profiles ADD COLUMN losses INTEGER DEFAULT 0`).run(); } catch {}

db.prepare(`
	CREATE TABLE IF NOT EXISTS friendships (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		friend_id INTEGER NOT NULL,
		status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'blocked')),
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		action_user_id INTEGER NOT NULL,
		UNIQUE(user_id, friend_id),
		FOREIGN KEY(user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
		FOREIGN KEY(friend_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
		FOREIGN KEY(action_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
		CHECK(user_id < friend_id)
	)
`).run();

const upsertProfileStmt = db.prepare(`
	INSERT INTO profiles (user_id, avatar_url, bio, status, last_seen, wins, losses, updated_at)
	VALUES (@user_id, @avatar_url, @bio, @status, @last_seen, @wins, @losses, CURRENT_TIMESTAMP)
	ON CONFLICT(user_id) DO UPDATE SET
		avatar_url=COALESCE(excluded.avatar_url, avatar_url),
		bio=COALESCE(excluded.bio, bio),
		status=excluded.status,
		last_seen=excluded.last_seen,
		updated_at=CURRENT_TIMESTAMP
`);
const getProfileStmt = db.prepare('SELECT * FROM profiles WHERE user_id = ?');
const listProfilesStmt = db.prepare('SELECT * FROM profiles ORDER BY updated_at DESC LIMIT ? OFFSET ?');

const insertFriendRequestStmt = db.prepare(`
	INSERT OR IGNORE INTO friendships (user_id, friend_id, status, action_user_id)
	VALUES (?, ?, 'pending', ?)
`);
const updateFriendStatusStmt = db.prepare(`
	UPDATE friendships SET status = ? WHERE user_id = ? AND friend_id = ?
`);
const getFriendshipsStmt = db.prepare(`
	SELECT f.*
	FROM friendships f
	WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = ?
	ORDER BY f.created_at DESC
`);

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
	avatarUrl: row.avatar_url,
	bio: row.bio,
	status: row.status,
	lastSeen: row.last_seen,
	wins: row.wins,
	losses: row.losses,
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

app.post('/me', { preValidation: [app.authenticate] }, async (request) => {
	const userId = ensureUserFromToken(request.user);

	const payload = typeof request.body === 'object' && request.body !== null ? request.body : {};
	const avatar_url = typeof payload.avatarUrl === 'string' ? payload.avatarUrl : null;
	const bio = typeof payload.bio === 'string' ? payload.bio : null;

	upsertProfileStmt.run({ 
		user_id: userId, 
		avatar_url, 
		bio, 
		status: 'Online', 
		last_seen: new Date().toISOString(), 
		wins: 0, 
		losses: 0 
	});
	const profile = getProfileStmt.get(userId);
	return { profile: sanitizeProfile(profile) };
});

app.get('/me', { preValidation: [app.authenticate] }, async (request, reply) => {
	const userId = ensureUserFromToken(request.user);

	const profile = getProfileStmt.get(userId);
	if (!profile) {
		reply.code(404);
		return { message: 'Profile not found' };
	}
	return { profile: sanitizeProfile(profile) };
});

app.get('/', { preValidation: [app.authenticate] }, async (request) => {
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

app.get('/:userId', { preValidation: [app.authenticate] }, async (request, reply) => {
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

// Friendships routes
app.post('/friends/request/:friendId', { preValidation: [app.authenticate] }, async (request, reply) => {
	const userId = ensureUserFromToken(request.user);
	const friendId = parseUserId(request.params.friendId);
	if (friendId === null || friendId === userId) {
		reply.code(400);
		return { message: 'Invalid friend id' };
	}
	const [smaller, larger] = userId < friendId ? [userId, friendId] : [friendId, userId];
	insertFriendRequestStmt.run(smaller, larger, userId);
	return { message: 'Friend request sent' };
});

app.post('/friends/:friendId/accept', { preValidation: [app.authenticate] }, async (request, reply) => {
	const userId = ensureUserFromToken(request.user);
	const friendId = parseUserId(request.params.friendId);
	if (friendId === null) {
		reply.code(400);
		return { message: 'Invalid friend id' };
	}
	const [smaller, larger] = userId < friendId ? [userId, friendId] : [friendId, userId];
	updateFriendStatusStmt.run('accepted', smaller, larger);
	return { message: 'Friend request accepted' };
});

app.post('/friends/:friendId/block', { preValidation: [app.authenticate] }, async (request, reply) => {
	const userId = ensureUserFromToken(request.user);
	const friendId = parseUserId(request.params.friendId);
	if (friendId === null) {
		reply.code(400);
		return { message: 'Invalid friend id' };
	}
	const [smaller, larger] = userId < friendId ? [userId, friendId] : [friendId, userId];
	updateFriendStatusStmt.run('blocked', smaller, larger);
	return { message: 'Friend blocked' };
});

app.get('/friends', { preValidation: [app.authenticate] }, async (request) => {
	const userId = ensureUserFromToken(request.user);
	const friendships = getFriendshipsStmt.all(userId, userId, 'accepted');
	return { friendships };
});

app.get('/friends/requests', { preValidation: [app.authenticate] }, async (request) => {
	const userId = ensureUserFromToken(request.user);
	const friendships = getFriendshipsStmt.all(userId, userId, 'pending');
	return { friendships };
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


