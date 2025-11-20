
import 'dotenv/config';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

const { hash, compare } = bcrypt;

const HOST = process.env.AUTH_HOST ?? '0.0.0.0';
const PORT = parseInt(process.env.AUTH_PORT ?? process.env.PORT ?? '3001', 10);
const DB_PATH = process.env.AUTH_DB_PATH ?? path.join(process.cwd(), 'data', 'auth.db');
const JWT_SECRET = process.env.JWT_SECRET ?? 'change-this-secret';

if (JWT_SECRET === 'change-this-secret') {
	console.warn('[auth] No JWT_SECRET provided. Falling back to an insecure default – do not use in production.');
}

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.prepare(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	)
`).run();

const getUserByUsernameStmt = db.prepare('SELECT * FROM users WHERE username = ?');
const getUserByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const insertUserStmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');

const app = Fastify({ logger: true });

await app.register(fastifyJwt, {
	secret: JWT_SECRET,
	sign: {
		expiresIn: '1h'
	}
});

app.decorate('authenticate', async function authenticate(request, reply) {
	try {
		await request.jwtVerify();
	} catch (err) {
		reply.code(401).send({ message: 'Not authorized', error: err.message });
	}
});

const sanitizeUser = (user) => ({
	id: user.id,
	username: user.username,
	createdAt: user.created_at
});

app.post('/signup', {
	schema: {
		body: {
			type: 'object',
			required: ['username', 'password'],
			properties: {
				username: { type: 'string', minLength: 3, maxLength: 32 },
				password: { type: 'string', minLength: 8, maxLength: 128 }
			}
		}
	}
}, async (request, reply) => {
	const { username, password } = request.body;
	const normalizedUsername = username.trim();

	const existingUser = getUserByUsernameStmt.get(normalizedUsername);
	if (existingUser) {
		reply.code(409);
		return { message: 'Username already taken' };
	}

	const passwordHash = await hash(password, 10);
	const insertResult = insertUserStmt.run(normalizedUsername, passwordHash);
	const createdUser = getUserByIdStmt.get(insertResult.lastInsertRowid);
	const token = app.jwt.sign({ sub: createdUser.id, username: createdUser.username });

	reply.code(201);
	return {
		token,
		user: sanitizeUser(createdUser)
	};
});

app.post('/login', {
	schema: {
		body: {
			type: 'object',
			required: ['username', 'password'],
			properties: {
				username: { type: 'string' },
				password: { type: 'string' }
			}
		}
	}
}, async (request, reply) => {
	const { username, password } = request.body;
	const normalizedUsername = username.trim();
	const user = getUserByUsernameStmt.get(normalizedUsername);

	if (!user) {
		reply.code(401);
		return { message: 'Invalid credentials' };
	}

	const isValidPassword = await compare(password, user.password_hash);
	if (!isValidPassword) {
		reply.code(401);
		return { message: 'Invalid credentials' };
	}

	const token = app.jwt.sign({ sub: user.id, username: user.username });
	return {
		token,
		user: sanitizeUser(user)
	};
});

app.get('/me', { preValidation: [app.authenticate] }, async (request) => {
	const userId = request.user.sub;
	const user = getUserByIdStmt.get(userId);

	if (!user) {
		return { message: 'User not found' };
	}

	return {
		user: sanitizeUser(user)
	};
});

const start = async () => {
	try {
		await app.listen({ host: HOST, port: PORT });
		app.log.info(`Auth service listening on http://${HOST}:${PORT}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
};

if (process.env.NODE_ENV !== 'test') {
	start();
}

export default app;


