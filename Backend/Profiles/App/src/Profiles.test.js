import assert from 'node:assert/strict';
import test from 'node:test';
import { SignJWT, generateKeyPair, exportSPKI } from 'jose';

process.env.NODE_ENV = 'test';
process.env.PROFILES_DB_PATH = ':memory:';
const { publicKey, privateKey } = await generateKeyPair('RS256');
const publicKeyPem = await exportSPKI(publicKey);

process.env.JWT_PUBLIC_KEY = Buffer.from(publicKeyPem, 'utf8').toString('base64');
process.env.AUTH_JWT_AUDIENCE = 'profiles';

const { default: app } = await import('./Profiles.js');
await app.ready();

const signToken = async (sub = 1, claims = {}) => {
  return new SignJWT({ username: `user${sub}`, ...claims })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(String(sub))
    .setAudience('profiles')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
};

const authHeader = async (sub = 1) => ({
  authorization: `Bearer ${await signToken(sub)}`
});

test('profiles: create, fetch, list, and guard auth', async (t) => {
  t.after(async () => {
    await app.close();
  });

  const createResponse = await app.inject({
    method: 'POST',
    url: '/profiles/me',
    headers: await authHeader(1),
    payload: {
      displayName: 'Alice',
      avatarUrl: 'https://example.com/alice.png',
      bio: 'Ready to play'
    }
  });

  assert.equal(createResponse.statusCode, 200);
  const created = createResponse.json().profile;
  assert.equal(created.displayName, 'Alice');
  assert.equal(created.userId, 1);

  const meResponse = await app.inject({
    method: 'GET',
    url: '/profiles/me',
    headers: await authHeader(1)
  });

  assert.equal(meResponse.statusCode, 200);
  assert.equal(meResponse.json().profile.bio, 'Ready to play');

  const otherResponse = await app.inject({
    method: 'GET',
    url: '/profiles/1',
    headers: await authHeader(2)
  });

  assert.equal(otherResponse.statusCode, 200);
  assert.equal(otherResponse.json().profile.displayName, 'Alice');

  const listResponse = await app.inject({
    method: 'GET',
    url: '/profiles?limit=10&offset=0',
    headers: await authHeader(2)
  });

  assert.equal(listResponse.statusCode, 200);
  assert.ok(Array.isArray(listResponse.json().profiles));
  assert.ok(listResponse.json().profiles.length >= 1);

  const unauthorizedResponse = await app.inject({
    method: 'GET',
    url: '/profiles/me'
  });

  assert.equal(unauthorizedResponse.statusCode, 401);
});
