import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.AUTH_DB_PATH = ':memory:';

const appPromise = (async () => {
  const { default: app } = await import('./Auth.js');
  await app.ready();
  return app;
})();

test('signup → login → me returns a valid JWT flow', async (t) => {
  const app = await appPromise;

  t.after(async () => {
    await app.close();
  });

  const signupResponse = await app.inject({
    method: 'POST',
    url: '/signup',
    payload: { username: 'alice', password: 'secretPass1!' }
  });

  assert.equal(signupResponse.statusCode, 201);
  const signupBody = signupResponse.json();
  assert.ok(signupBody.token, 'signup should return a token');
  assert.equal(signupBody.user.username, 'alice');

  const loginResponse = await app.inject({
    method: 'POST',
    url: '/login',
    payload: { username: 'alice', password: 'secretPass1!' }
  });

  assert.equal(loginResponse.statusCode, 200);
  const loginBody = loginResponse.json();
  assert.ok(loginBody.token, 'login should return a token');

  const meResponse = await app.inject({
    method: 'GET',
    url: '/me',
    headers: {
      authorization: `Bearer ${loginBody.token}`
    }
  });

  assert.equal(meResponse.statusCode, 200);
  const meBody = meResponse.json();
  assert.equal(meBody.user.username, 'alice');
});
