import { createHash } from 'node:crypto';
export const digestToken=token=>createHash('sha256').update(token).digest('hex');
export const isValidSessionToken=token=>typeof token==='string' && /^[a-f0-9]{64}$/.test(token);
export function validateLoginPayload(input){
 if(!input || typeof input!=='object')return false;
 const {organizationId,email,password}=input;
 return typeof organizationId==='string'
  && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(organizationId)
  && typeof email==='string' && email.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  && typeof password==='string' && password.length>=1 && password.length<=1024;
}
export function isAllowedMutationOrigin(method,provided,expected){
 return !['POST','PUT','PATCH','DELETE'].includes(method) || provided===expected;
}
