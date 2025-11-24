import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.AUTH_DB_PATH = ':memory:';
process.env.AUTH_EMAIL_DB_PATH = ':memory:';

const appPromise = (async () => {
  const { default: app } = await import('./Auth.js');
  await app.ready();
  return app;
})();

test.after(async () => {
  const app = await appPromise;
  await app.close();
});

test('signup → login → me returns a valid JWT flow', async (t) => {
  const app = await appPromise;

  const signupResponse = await app.inject({
    method: 'POST',
    url: '/signup',
    payload: { username: 'alice', password: 'secretPass1!' }
  });

  assert.equal(signupResponse.statusCode, 201);
  const signupBody = signupResponse.json();
  assert.ok(signupBody.token, 'signup should return a token');
  assert.equal(typeof signupBody.user.id, 'number');
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

test('signup/login via email uses the email database and token', async () => {
  const app = await appPromise;

  const signupResponse = await app.inject({
    method: 'POST',
    url: '/signup/email',
    payload: { email: 'bob@example.com', password: 'secretPass2!' }
  });

  assert.equal(signupResponse.statusCode, 201);
  const signupBody = signupResponse.json();
  assert.ok(signupBody.token, 'signup should return a token');
  assert.equal(typeof signupBody.user.id, 'number');
  assert.equal(signupBody.user.email, 'bob@example.com');

  const loginResponse = await app.inject({
    method: 'POST',
    url: '/login/email',
    payload: { email: 'bob@example.com', password: 'secretPass2!' }
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
  assert.equal(meBody.user.email, 'bob@example.com');
});

test('IDs are unique between username and email databases', async () => {
  const app = await appPromise;

  const usernameSignup = await app.inject({
    method: 'POST',
    url: '/signup',
    payload: { username: 'charlie', password: 'secretPass3!' }
  });

  assert.equal(usernameSignup.statusCode, 201);
  const usernameBody = usernameSignup.json();

  const emailSignup = await app.inject({
    method: 'POST',
    url: '/signup/email',
    payload: { email: 'charlie@example.com', password: 'secretPass4!' }
  });

  assert.equal(emailSignup.statusCode, 201);
  const emailBody = emailSignup.json();

  assert.notEqual(
    usernameBody.user.id,
    emailBody.user.id,
    'IDs must remain unique across both databases'
  );
});

test('username-based user can add and update email via /email endpoint', async () => {
  const app = await appPromise;

  const signupResponse = await app.inject({
    method: 'POST',
    url: '/signup',
    payload: { username: 'dave', password: 'secretPass5!' }
  });

  assert.equal(signupResponse.statusCode, 201);
  const { token } = signupResponse.json();

  const addEmailResponse = await app.inject({
    method: 'PUT',
    url: '/email',
    headers: {
      authorization: `Bearer ${token}`
    },
    payload: { email: 'dave@example.com' }
  });

  assert.equal(addEmailResponse.statusCode, 201);
  assert.equal(addEmailResponse.json().user.email, 'dave@example.com');

  const updateEmailResponse = await app.inject({
    method: 'PUT',
    url: '/email',
    headers: {
      authorization: `Bearer ${token}`
    },
    payload: { email: 'dave-new@example.com' }
  });

  assert.equal(updateEmailResponse.statusCode, 200);
  assert.equal(updateEmailResponse.json().user.email, 'dave-new@example.com');
});

test('email-based user can add and update username via /username endpoint', async () => {
  const app = await appPromise;

  const signupResponse = await app.inject({
    method: 'POST',
    url: '/signup/email',
    payload: { email: 'eve@example.com', password: 'secretPass6!' }
  });

  assert.equal(signupResponse.statusCode, 201);
  const { token } = signupResponse.json();

  const addUsernameResponse = await app.inject({
    method: 'PUT',
    url: '/username',
    headers: {
      authorization: `Bearer ${token}`
    },
    payload: { username: 'eve-user' }
  });

  assert.equal(addUsernameResponse.statusCode, 201);
  assert.equal(addUsernameResponse.json().user.username, 'eve-user');

  const updateUsernameResponse = await app.inject({
    method: 'PUT',
    url: '/username',
    headers: {
      authorization: `Bearer ${token}`
    },
    payload: { username: 'eve-user-2' }
  });

  assert.equal(updateUsernameResponse.statusCode, 200);
  assert.equal(updateUsernameResponse.json().user.username, 'eve-user-2');
});
