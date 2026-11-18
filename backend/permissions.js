// Autorização por perfil; nunca usar a visualização do navegador como controle de acesso.
const MODULES=Object.freeze({
 previdencia:'Previdência',
 juridico:'Jurídico',
 saude:'Saúde',
 educacao:'Educação',
 empresarial:'Gestão Empresarial',
 financeiro:'Financeiro',
 network:'Network Global',
 investidores:'Investidores e Parceiros',
 cooperacao:'Cooperação Internacional',
 atendimento:'Meu Atendimento'
});
const ROLE_MODULES=Object.freeze({
 platform_owner:Object.keys(MODULES),
 admin:['previdencia','juridico','saude','educacao','empresarial','financeiro','network','investidores','cooperacao'],
 previdencia:['previdencia'],
 juridico:['juridico'],
 saude:['saude'],
 educacao:['educacao'],
 empresarial:['empresarial'],
 financeiro:['financeiro'],
 parceiro:['network','investidores','cooperacao'],
 cliente:['atendimento']
});
export function allowedModules(roles){
 if(!Array.isArray(roles))return [];
 const allowed=new Set();
 for(const role of roles){
  if(typeof role!=='string')continue;
  for(const code of ROLE_MODULES[role]||[])allowed.add(code);
 }
 return Object.entries(MODULES).filter(([code])=>allowed.has(code)).map(([code,name])=>({code,name}));
}
export function isPlatformOwner(roles){return Array.isArray(roles)&&roles.includes('platform_owner');}
export function canOpenAdministration(roles){return isPlatformOwner(roles)||Array.isArray(roles)&&roles.includes('admin');}
export function hasModuleAccess(roles,code){
 return typeof code==='string' && allowedModules(roles).some(module=>module.code===code);
}
// Para futuros endpoints de dados: negar por padrão qualquer acesso entre organizações.
export function isSameOrganization(requester,resourceOrganizationId){
 return !!requester && typeof requester.organization_id==='string' &&
 typeof resourceOrganizationId==='string' &&
 requester.organization_id.toLowerCase()===resourceOrganizationId.toLowerCase();
}
