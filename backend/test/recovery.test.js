import test from 'node:test';
import assert from 'node:assert/strict';
import {generateRecoveryCodes,recoveryCodeDigest,matchesRecoveryDigest} from '../recovery.js';

const alice='11111111-2222-4333-8444-555555555555';
const bob='22222222-3333-4444-8555-666666666666';
test('recovery codes use 128-bit randomized values and have no duplicates',()=>{
 const codes=generateRecoveryCodes();
 assert.equal(codes.length,8);
 assert.equal(new Set(codes).size,8);
 for(const code of codes)assert.match(code,/^[A-F0-9]{8}(?:-[A-F0-9]{8}){3}$/);
 assert.notEqual(generateRecoveryCodes()[0],codes[0]);
});
test('recovery digests are user-bound and never equal a plaintext recovery code',()=>{
 const code=generateRecoveryCodes(1)[0];
 const digest=recoveryCodeDigest(alice,code);
 assert.match(digest,/^[a-f0-9]{64}$/);
 assert.notEqual(digest,code);
 assert.equal(matchesRecoveryDigest(alice,code,digest),true);
 assert.equal(matchesRecoveryDigest(bob,code,digest),false);
 assert.equal(matchesRecoveryDigest(alice,generateRecoveryCodes(1)[0],digest),false);
 assert.equal(matchesRecoveryDigest(alice,code,'invalid'),false);
 assert.equal(matchesRecoveryDigest(alice,'00000000',digest),false);
});
test('recovery code generation and digest validation fail closed',()=>{
 for(const n of [0,13,2.4,NaN,-1])assert.throws(()=>generateRecoveryCodes(n));
 const code=generateRecoveryCodes(1)[0];
 assert.throws(()=>recoveryCodeDigest('bad',code));
 assert.throws(()=>recoveryCodeDigest(alice,code.toLowerCase()));
});
