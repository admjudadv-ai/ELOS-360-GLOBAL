import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {encodeBase32,decodeBase32,generateTotpSecret,totpCode,matchTotp,encryptTotpSecret,decryptTotpSecret} from '../mfa.js';

const user='11111111-2222-4333-8444-555555555555';
const other='22222222-3333-4444-8555-666666666666';

test('RFC 6238 SHA1 6-digit vector for 59 seconds',()=>{
 const secret=encodeBase32(Buffer.from('12345678901234567890','ascii'));
 assert.equal(totpCode(secret,59000),'287082');
 assert.equal(matchTotp(secret,'287082',{time:59000,window:0}),1);
});
test('new random MFA secret round-trips in RFC4648 Base32',()=>{
 const secret=generateTotpSecret();
 assert.match(secret,/^[A-Z2-7]{32}$/);
 assert.equal(decodeBase32(secret).length,20);
 assert.equal(encodeBase32(decodeBase32(secret)),secret);
});
test('TOTP checks digits, clock skew and rejects used counter',()=>{
 const secret=generateTotpSecret(),time=1_800_000_000_000,code=totpCode(secret,time);
 const match=matchTotp(secret,code,{time,window:0});
 assert.equal(typeof match,'number');
 assert.equal(matchTotp(secret,code,{time,lastAcceptedCounter:match,window:0}),null);
 assert.equal(matchTotp(secret,'12345x',{time}),null);
 assert.equal(matchTotp(secret,'12345',{time}),null);
 assert.equal(matchTotp(secret,'9999999',{time}),null);
 assert.equal(matchTotp(secret,code,{time:time+60000,window:1}),null);
});
test('MFA secret stored encrypted with AES-256-GCM and bound to user ID',()=>{
 const secret=generateTotpSecret(), key=randomBytes(32).toString('hex');
 const encrypted=encryptTotpSecret(secret,key,user);
 assert.match(encrypted,/^v1:/);
 assert.ok(!encrypted.includes(secret));
 assert.equal(decryptTotpSecret(encrypted,key,user),secret);
 assert.throws(()=>decryptTotpSecret(encrypted,key,other));
 assert.throws(()=>decryptTotpSecret(encrypted,'00'.repeat(32),user));
 assert.throws(()=>encryptTotpSecret(secret,'invalid',user));
 assert.throws(()=>decryptTotpSecret('v1:abc',key,user));
});
test('TOTP validation is strict and rejects improperly encoded secrets',()=>{
 assert.throws(()=>decodeBase32('hello world'));
 assert.throws(()=>decodeBase32('A'.repeat(15)));
 assert.throws(()=>decodeBase32('B'.repeat(16)+'1'));
});
