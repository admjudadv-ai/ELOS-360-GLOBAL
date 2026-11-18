// Códigos de recuperação MFA para homologação: não cria nem concede sessões.
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
const CODE_FORMAT=/^[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
export function generateRecoveryCodes(count=8){
 if(!Number.isSafeInteger(count)||count<1||count>12)throw Error('Quantidade inválida');
 const out=[];
 for(let i=0;i<count;i++){
  const hex=randomBytes(16).toString('hex').toUpperCase();
  out.push(hex.match(/.{8}/g).join('-'));
 }
 return out;
}
export function recoveryCodeDigest(userId,code){
 if(typeof userId!=='string'||!(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i).test(userId))
  throw Error('Identificador de usuário inválido');
 if(typeof code!=='string'||!CODE_FORMAT.test(code))throw Error('Formato de recuperação inválido');
 return createHash('sha256').update('elo360:recovery:v1:').update(userId.toLowerCase())
  .update(':').update(code).digest('hex');
}
export function matchesRecoveryDigest(userId,code,storedDigest){
 if(typeof storedDigest!=='string'||!(/^[a-f0-9]{64}$/).test(storedDigest))return false;
 try{
  const actual=Buffer.from(recoveryCodeDigest(userId,code),'hex');
  return timingSafeEqual(actual,Buffer.from(storedDigest,'hex'));
 }catch{return false;}
}
// Consumo de uso único deve ser uma remoção atômica no banco em transação,
// e só poderá habilitar sessão após uma operação de DELETE ... RETURNING bem-sucedida.
