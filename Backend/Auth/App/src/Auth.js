
import dotenv from 'dotenv';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: "src/.env"});

const { hash, compare } = bcrypt;

const HOST = process.env.AUTH_HOST ?? '0.0.0.0';
const PORT = parseInt(process.env.AUTH_PORT ?? process.env.PORT ?? '3005', 10);
const DB_DIR = process.env.DB_DIR ?? path.join(process.cwd(), 'database');

const DB_PATH = path.join(DB_DIR, 'auth.db');
const EMAIL_DB_PATH = path.join(DB_DIR, 'auth-email.db');

const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;
if (! process.env.JWT_PRIVATE_KEY){
	console.log("NO JWT_PRIVATE_KEY in env!");
}

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

const privateKeyPem = decodePem(JWT_PRIVATE_KEY);
const publicKeyPem = decodePem(JWT_PUBLIC_KEY);
const isRsaConfigured = Boolean(privateKeyPem);

if (!isRsaConfigured) {
	console.warn('[auth] No JWT KEYS provided.');
}

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const emailDb = new Database(EMAIL_DB_PATH);
emailDb.pragma('journal_mode = WAL');

db.prepare(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	)
`).run();

emailDb.prepare(`
	CREATE TABLE IF NOT EXISTS email_users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	)
`).run();

const getUserByUsernameStmt = db.prepare('SELECT * FROM users WHERE username = ?');
const getUserByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const getUsernameMaxIdStmt = db.prepare('SELECT MAX(id) as maxId FROM users');
const insertUserStmt = db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)');
const updateUsernameStmt = db.prepare('UPDATE users SET username = ? WHERE id = ?');
const getEmailUserByEmailStmt = emailDb.prepare('SELECT * FROM email_users WHERE email = ?');
const getEmailUserByIdStmt = emailDb.prepare('SELECT * FROM email_users WHERE id = ?');
const getEmailMaxIdStmt = emailDb.prepare('SELECT MAX(id) as maxId FROM email_users');
const insertEmailUserStmt = emailDb.prepare('INSERT INTO email_users (id, email, password_hash) VALUES (?, ?, ?)');
const updateEmailStmt = emailDb.prepare('UPDATE email_users SET email = ? WHERE id = ?');

const getNextGlobalId = (() => {
	const getMaxId = (stmt) => {
		const row = stmt.get();
		return typeof row?.maxId === 'number' ? row.maxId : 0;
	};
	let nextId = Math.max(getMaxId(getUsernameMaxIdStmt), getMaxId(getEmailMaxIdStmt)) + 1;
	return () => {
		const id = nextId;
		nextId += 1;
		return id;
	};
})();

const app = Fastify({ logger: true });

const jwtPluginOptions =  {
		secret: {
			private: privateKeyPem,
			public: publicKeyPem ?? privateKeyPem
		},
		sign: {
			algorithm: 'RS256',
			expiresIn: '1h'
		},
		verify: {
			algorithms: ['RS256']
		}
	};


await app.register(fastifyJwt, jwtPluginOptions);

app.decorate('authenticate', async function authenticate(request, reply) {
	try {
		await request.jwtVerify();
	} catch (err) {
		reply.code(401).send({ message: 'Not authorized', error: err.message });
	}
});

const sanitizeUsernameUser = (user) => ({
	id: user.id,
	username: user.username,
	createdAt: user.created_at
});

const sanitizeEmailUser = (user) => ({
	id: user.id,
	email: user.email,
	createdAt: user.created_at
});

// USERNAME

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
	const userId = getNextGlobalId();
	insertUserStmt.run(userId, normalizedUsername, passwordHash);
	const createdUser = getUserByIdStmt.get(userId);
	const token = app.jwt.sign({ sub: createdUser.id, username: createdUser.username, kind: 'username' });

	reply.code(201);
	return {
		token,
		user: sanitizeUsernameUser(createdUser)
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

	const token = app.jwt.sign({ sub: user.id, username: user.username, kind: 'username' });
	return {
		token,
		user: sanitizeUsernameUser(user)
	};
});

app.put('/username', {
	preValidation: [app.authenticate],
	schema: {
		body: {
			type: 'object',
			required: ['username'],
			properties: {
				username: { type: 'string', minLength: 3, maxLength: 32 }
			}
		}
	}
}, async (request, reply) => {
	const { username } = request.body;
	const userId = request.user.sub;
	const normalizedUsername = username.trim();
	const conflictingUser = getUserByUsernameStmt.get(normalizedUsername);
	if (conflictingUser && conflictingUser.id !== userId) {
		reply.code(409);
		return { message: 'Username already taken' };
	}

	const existingUsernameUser = getUserByIdStmt.get(userId);
	if (existingUsernameUser) {
		updateUsernameStmt.run(normalizedUsername, userId);
		const updatedUser = getUserByIdStmt.get(userId);
		return { user: sanitizeUsernameUser(updatedUser) };
	}

	const emailUser = getEmailUserByIdStmt.get(userId);
	if (!emailUser) {
		reply.code(404);
		return { message: 'User not found' };
	}

	insertUserStmt.run(userId, normalizedUsername, emailUser.password_hash);
	reply.code(201);
	const createdUser = getUserByIdStmt.get(userId);
	return { user: sanitizeUsernameUser(createdUser) };
});

// EMAIL

app.post('/signup/email', {
	schema: {
		body: {
			type: 'object',
			required: ['email', 'password'],
			properties: {
				email: { type: 'string', format: 'email', minLength: 5, maxLength: 255 },
				password: { type: 'string', minLength: 8, maxLength: 128 }
			}
		}
	}
}, async (request, reply) => {
	const { email, password } = request.body;
	const normalizedEmail = email.trim().toLowerCase();

	const existingUser = getEmailUserByEmailStmt.get(normalizedEmail);
	if (existingUser) {
		reply.code(409);
		return { message: 'Email already registered' };
	}

	const passwordHash = await hash(password, 10);
	const userId = getNextGlobalId();
	insertEmailUserStmt.run(userId, normalizedEmail, passwordHash);
	const createdUser = getEmailUserByIdStmt.get(userId);
	const token = app.jwt.sign({ sub: createdUser.id, email: createdUser.email, kind: 'email' });

	reply.code(201);
	return {
		token,
		user: sanitizeEmailUser(createdUser)
	};
});

app.post('/login/email', {
	schema: {
		body: {
			type: 'object',
			required: ['email', 'password'],
			properties: {
				email: { type: 'string', format: 'email' },
				password: { type: 'string' }
			}
		}
	}
}, async (request, reply) => {
	const { email, password } = request.body;
	const normalizedEmail = email.trim().toLowerCase();
	const user = getEmailUserByEmailStmt.get(normalizedEmail);

	if (!user) {
		reply.code(401);
		return { message: 'Invalid credentials' };
	}

	const isValidPassword = await compare(password, user.password_hash);
	if (!isValidPassword) {
		reply.code(401);
		return { message: 'Invalid credentials' };
	}

	const token = app.jwt.sign({ sub: user.id, email: user.email, kind: 'email' });
	return {
		token,
		user: sanitizeEmailUser(user)
	};
});

app.put('/email', {
	preValidation: [app.authenticate],
	schema: {
		body: {
			type: 'object',
			required: ['email'],
			properties: {
				email: { type: 'string', format: 'email', minLength: 5, maxLength: 255 }
			}
		}
	}
}, async (request, reply) => {
	const { email } = request.body;
	const userId = request.user.sub;
	const normalizedEmail = email.trim().toLowerCase();
	const conflictingUser = getEmailUserByEmailStmt.get(normalizedEmail);
	if (conflictingUser && conflictingUser.id !== userId) {
		reply.code(409);
		return { message: 'Email already registered' };
	}

	const existingEmailUser = getEmailUserByIdStmt.get(userId);
	if (existingEmailUser) {
		updateEmailStmt.run(normalizedEmail, userId);
		const updatedUser = getEmailUserByIdStmt.get(userId);
		return { user: sanitizeEmailUser(updatedUser) };
	}

	const usernameUser = getUserByIdStmt.get(userId);
	if (!usernameUser) {
		reply.code(404);
		return { message: 'User not found' };
	}

	insertEmailUserStmt.run(userId, normalizedEmail, usernameUser.password_hash);
	reply.code(201);
	const createdUser = getEmailUserByIdStmt.get(userId);
	return { user: sanitizeEmailUser(createdUser) };
});

app.get('/me', { preValidation: [app.authenticate] }, async (request) => {
	const userId = request.user.sub;
	const kind = request.user.kind ?? 'username';

	if (kind === 'email') {
		const emailUser = getEmailUserByIdStmt.get(userId);
		if (!emailUser) {
			return { message: 'User not found' };
		}
		return { user: sanitizeEmailUser(emailUser) };
	}

	const user = getUserByIdStmt.get(userId);
	if (!user) {
		return { message: 'User not found' };
	}

	return {
		user: sanitizeUsernameUser(user)
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


