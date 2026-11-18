import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedModules,hasModuleAccess,isSameOrganization,isPlatformOwner,canOpenAdministration} from '../permissions.js';
test('roles absent, invalid or unknown deny access',()=>{
 for(const roles of [undefined,null,{},[],['desconhecido']])assert.deepEqual(allowedModules(roles),[]);
 assert.equal(hasModuleAccess(['desconhecido'],'financeiro'),false);
 assert.equal(hasModuleAccess(['admin'],'not-a-module'),false);
});
test('privileged roles see only their modules',()=>{
 assert.deepEqual(allowedModules(['previdencia']).map(x=>x.code),['previdencia']);
 assert.deepEqual(allowedModules(['financeiro']).map(x=>x.code),['financeiro']);
 assert.deepEqual(allowedModules(['cliente']).map(x=>x.code),['atendimento']);
 assert.equal(hasModuleAccess(['parceiro'],'investidores'),true);
 assert.equal(hasModuleAccess(['parceiro'],'juridico'),false);
});
test('multiple roles are a nonduplicated union',()=>{
 assert.deepEqual(allowedModules(['saude','saude','educacao']).map(x=>x.code),['saude','educacao']);
 assert.equal(allowedModules(['admin']).length,9);
 assert.equal(hasModuleAccess(['admin'],'atendimento'),false);
});
test('organization boundary rejects missing or different organization',()=>{
 const current={organization_id:'11111111-2222-4333-8444-555555555555'};
 assert.equal(isSameOrganization(current,current.organization_id),true);
 assert.equal(isSameOrganization(current,'22222222-3333-4444-8555-666666666666'),false);
 assert.equal(isSameOrganization(current,undefined),false);
 assert.equal(isSameOrganization(null,current.organization_id),false);
});

test('exclusive platform ownership exposes all defined modules and grants admin screen',()=>{
 const owner=['platform_owner'];
 assert.equal(isPlatformOwner(owner),true);
 assert.equal(canOpenAdministration(owner),true);
 assert.deepEqual(allowedModules(owner).map(m=>m.code),['previdencia','juridico','saude','educacao','empresarial','financeiro','network','investidores','cooperacao','atendimento']);
 assert.equal(hasModuleAccess(owner,'atendimento'),true);
 assert.equal(canOpenAdministration(['cliente']),false);
 assert.equal(isPlatformOwner(['admin']),false);
});
