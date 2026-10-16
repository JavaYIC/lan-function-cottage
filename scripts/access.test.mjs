import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCESS_DIGEST, REMEMBER_MS, validAccess } from '../src/lib/access.js';
const now = 1800000000000;
test('access is limited to seven days and invalidated by a changed verifier', () => {
  const encode = entry => JSON.stringify(entry);
  assert.ok(validAccess(encode({version:ACCESS_DIGEST,expiresAt:now+REMEMBER_MS}),now));
  assert.equal(validAccess(encode({version:ACCESS_DIGEST,expiresAt:now}),now),null);
  assert.equal(validAccess(encode({version:'obsolete',expiresAt:now+1000}),now),null);
  assert.equal(validAccess(encode({version:ACCESS_DIGEST,expiresAt:now+REMEMBER_MS+1}),now),null);
});
test('malformed stored access never prevents rendering the password screen', () => {
  for(const raw of [null,'', 'broken', '{}','null','[]', JSON.stringify({version:ACCESS_DIGEST,expiresAt:'tomorrow'})]) assert.equal(validAccess(raw,now),null);
});
