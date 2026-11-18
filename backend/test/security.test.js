import test from 'node:test';
import assert from 'node:assert/strict';
import {digestToken,isValidSessionToken,validateLoginPayload,isAllowedMutationOrigin} from '../security.js';
const org='11111111-2222-4333-8444-555555555555';
test('accepts strictly shaped fictitious credentials',()=>{
 assert.equal(validateLoginPayload({organizationId:org,email:'ficticio@example.test',password:'Senha ficticia 123!'}),true);
});
test('rejects malformed, missing and oversized credentials',()=>{
 for(const value of [null,{}, {organizationId:org,email:'invalid',password:'abc'}, {organizationId:org,email:'x@example.test',password:''},{organizationId:org,email:'x@example.test',password:'x'.repeat(1025)}])assert.equal(validateLoginPayload(value),false);
});
test('session tokens must be exactly 64 lowercase hexadecimal characters',()=>{
 assert.ok(isValidSessionToken('a'.repeat(64)));
 for(const t of [undefined,'abc','A'.repeat(64),'z'.repeat(64)])assert.equal(isValidSessionToken(t),false);
});
test('session token hash is deterministic and token is not stored in plaintext',()=>{
 const token='a'.repeat(64);const hash=digestToken(token);
 assert.equal(hash.length,64);assert.notEqual(hash,token);assert.equal(hash,digestToken(token));
});
test('mutating requests require exact configured origin',()=>{
 assert.equal(isAllowedMutationOrigin('POST','https://elo.test','https://elo.test'),true);
 assert.equal(isAllowedMutationOrigin('POST','https://evil.test','https://elo.test'),false);
 assert.equal(isAllowedMutationOrigin('POST',undefined,'https://elo.test'),false);
 assert.equal(isAllowedMutationOrigin('GET',undefined,'https://elo.test'),true);
});
