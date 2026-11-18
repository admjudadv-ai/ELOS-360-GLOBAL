// Núcleo MFA TOTP para homologação. A habilitação real exige fluxo de inscrição,
// recuperação, autenticação em dois fatores e revisão adicional.
import {createHmac,randomBytes,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';

const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function encodeBase32(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.length===0)throw Error('Secret inválido');
 let value=0,bits=0,result='';
 for(const byte of buffer){
  value=(value<<8)|byte;bits+=8;
  while(bits>=5){result+=ALPHABET[(value>>>(bits-=5))&31];}
 }
 if(bits>0)result+=ALPHABET[(value<<(5-bits))&31];
 return result;
}
export function decodeBase32(input){
 if(typeof input!=='string'||!(/^[A-Z2-7]{16,128}$/).test(input))throw Error('Secret Base32 inválido');
 let value=0,bits=0;const out=[];
 for(const c of input){value=(value<<5)|ALPHABET.indexOf(c);bits+=5;if(bits>=8){out.push((value>>>(bits-=8))&255);}}
 if(bits && (value&((1<<bits)-1))!==0)throw Error('Secret com bits inválidos');
 return Buffer.from(out);
}
export function generateTotpSecret(){return encodeBase32(randomBytes(20));}
function counterFor(time,step=30){
 if(!Number.isFinite(time)||time<0||!Number.isInteger(step)||step<15||step>120)throw Error('Tempo inválido');
 return Math.floor(time/(step*1000));
}
function atCounter(secret,counter){
 const key=decodeBase32(secret);if(key.length<10)throw Error('Secret curto');
 const n=Buffer.alloc(8);n.writeBigUInt64BE(BigInt(counter));
 const digest=createHmac('sha1',key).update(n).digest();
 const offset=digest[digest.length-1]&15;
 const binary=(digest.readUInt32BE(offset)&0x7fffffff)%1_000_000;
 return String(binary).padStart(6,'0');
}
export function totpCode(secret,time=Date.now()){return atCounter(secret,counterFor(time));}
export function matchTotp(secret,provided,{time=Date.now(),lastAcceptedCounter=-1,window=1}={}){
 if(typeof provided!=='string'||!/^\d{6}$/.test(provided))return null;
 if(!Number.isSafeInteger(lastAcceptedCounter)||lastAcceptedCounter<-1)throw Error('Contador inválido');
 if(!Number.isInteger(window)||window<0||window>1)throw Error('Janela inválida');
 const current=counterFor(time);
 const input=Buffer.from(provided,'utf8');
 for(let delta=-window;delta<=window;delta++){
  const candidate=current+delta;
  if(candidate<0||candidate<=lastAcceptedCounter)continue;
  const expected=Buffer.from(atCounter(secret,candidate),'utf8');
  if(timingSafeEqual(input,expected))return candidate;
 }
 return null;
}
function keyBuffer(key){
 if(typeof key!=='string'||!(/^[0-9a-f]{64}$/i).test(key))throw Error('MFA_ENCRYPTION_KEY inválida: requer 32 bytes hexadecimais');
 return Buffer.from(key,'hex');
}
export function encryptTotpSecret(secret,hexKey,userId){
 decodeBase32(secret);
 if(typeof userId!=='string'||!userId)throw Error('ID de usuário obrigatório');
 const iv=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',keyBuffer(hexKey),iv);
 cipher.setAAD(Buffer.from('elo360-mfa:'+userId));
 const encrypted=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);
 return 'v1:'+Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64');
}
export function decryptTotpSecret(envelope,hexKey,userId){
 if(typeof envelope!=='string'||!envelope.startsWith('v1:')||!userId)throw Error('Segredo cifrado inválido');
 const packed=Buffer.from(envelope.slice(3),'base64');
 if(packed.length<29)throw Error('Segredo cifrado incompleto');
 const decipher=createDecipheriv('aes-256-gcm',keyBuffer(hexKey),packed.subarray(0,12));
 decipher.setAAD(Buffer.from('elo360-mfa:'+userId));
 decipher.setAuthTag(packed.subarray(12,28));
 const secret=Buffer.concat([decipher.update(packed.subarray(28)),decipher.final()]).toString('utf8');
 decodeBase32(secret);
 return secret;
}
