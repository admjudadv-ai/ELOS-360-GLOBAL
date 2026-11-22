/* Elos 360° Global — tradução automática para todos os países e idiomas (Coordenadora PSP) */
(function(){
if(window.__ELOSI18N)return;window.__ELOSI18N=1;
var SRC='pt';
/* país (ISO 3166) -> idioma principal (BCP-47) */
var CL='AF:fa,AX:sv,AL:sq,DZ:ar,AS:en,AD:ca,AO:pt,AI:en,AG:en,AR:es,AM:hy,AW:nl,AU:en,AT:de,AZ:az,BS:en,BH:ar,BD:bn,BB:en,BY:be,BE:nl,BZ:en,BJ:fr,BM:en,BT:dz,BO:es,BA:bs,BW:en,BR:pt,BN:ms,BG:bg,BF:fr,BI:rn,CV:pt,KH:km,CM:fr,CA:en,KY:en,CF:fr,TD:fr,CL:es,CN:zh-CN,CO:es,KM:ar,CG:fr,CD:fr,CK:en,CR:es,CI:fr,HR:hr,CU:es,CW:nl,CY:el,CZ:cs,DK:da,DJ:fr,DM:en,DO:es,EC:es,EG:ar,SV:es,GQ:es,ER:ti,EE:et,SZ:en,ET:am,FK:en,FO:fo,FJ:en,FI:fi,FR:fr,GF:fr,PF:fr,GA:fr,GM:en,GE:ka,GH:en,GI:en,GR:el,GL:kl,GD:en,GP:fr,GU:en,GT:es,GG:en,GN:fr,GW:pt,GY:en,HT:ht,VA:it,HN:es,HK:zh-HK,HU:hu,IS:is,IN:hi,ID:id,IR:fa,IQ:ar,IE:en,IM:en,IL:he,IT:it,JM:en,JP:ja,JE:en,JO:ar,KZ:kk,KE:sw,KI:en,KP:ko,KR:ko,XK:sq,KW:ar,KG:ky,LA:lo,LV:lv,LB:ar,LS:st,LR:en,LY:ar,LI:de,LT:lt,LU:lb,MO:zh-HK,MG:mg,MW:ny,MY:ms,MV:dv,ML:fr,MT:mt,MH:en,MQ:fr,MR:ar,MU:en,YT:fr,MX:es,FM:en,MD:ro,MC:fr,MN:mn,ME:sr,MS:en,MA:ar,MZ:pt,MM:my,NA:en,NR:en,NP:ne,NL:nl,NC:fr,NZ:en,NI:es,NE:fr,NG:en,NU:en,MK:mk,MP:en,NO:nb,OM:ar,PK:ur,PW:en,PS:ar,PA:es,PG:en,PY:es,PE:es,PH:fil,PN:en,PL:pl,PT:pt-PT,PR:es,QA:ar,RE:fr,RO:ro,RU:ru,RW:rw,BL:fr,SH:en,KN:en,LC:en,MF:fr,PM:fr,VC:en,WS:sm,SM:it,ST:pt,SA:ar,SN:fr,RS:sr,SC:en,SL:en,SG:en,SX:nl,SK:sk,SI:sl,SB:en,SO:so,ZA:en,SS:en,ES:es,LK:si,SD:ar,SR:nl,SE:sv,CH:de,SY:ar,TW:zh-TW,TJ:tg,TZ:sw,TH:th,TL:pt,TG:fr,TK:en,TO:to,TT:en,TN:ar,TR:tr,TM:tk,TC:en,TV:en,UG:en,UA:uk,AE:ar,GB:en,US:en,UY:es,UZ:uz,VU:bi,VE:es,VN:vi,VG:en,VI:en,WF:fr,EH:ar,YE:ar,ZM:en,ZW:en';
var COUNTRIES=CL.split(',').map(function(p){var a=p.split(':');return {c:a[0],l:a[1]}});
var RTL={ar:1,he:1,fa:1,ur:1,ps:1,dv:1,yi:1,ckb:1,sd:1,ug:1};
var LS=null;try{LS=window.localStorage;LS.getItem('x')}catch(e){LS=null}
function lsGet(k){try{return LS?LS.getItem(k):null}catch(e){return null}}
function lsSet(k,v){try{if(LS)LS.setItem(k,v)}catch(e){}}
function base(l){return (l||'').split('-')[0].toLowerCase()}
function flag(c){if(c==='XK')return '🇽🇰';return c.replace(/./g,function(ch){return String.fromCodePoint(127397+ch.charCodeAt(0))})}
function dn(loc,type,code){try{return new Intl.DisplayNames([loc],{type:type}).of(code)}catch(e){return code}}
function langSelf(l){var n=dn(l,'language',l);return n?n.charAt(0).toUpperCase()+n.slice(1):l}

/* ---------- estado ---------- */
var cur=SRC,curCountry='',DICT={},TOUT={},queue=[],queued={},busy=false,stopped=false,DB=null,SAMPLE=null,dbLoaded={};
function dictFor(l){if(!DICT[l]){DICT[l]={};var raw=lsGet('elos_i18n_'+l);if(raw){try{DICT[l]=JSON.parse(raw)||{}}catch(e){}}}return DICT[l]}
function saveDict(l){lsSet('elos_i18n_'+l,JSON.stringify(DICT[l]||{}))}

/* ---------- coleta de textos ---------- */
var SKIP={SCRIPT:1,STYLE:1,NOSCRIPT:1,TEXTAREA:1,CODE:1,PRE:1,SVG:1,svg:1,CANVAS:1,IFRAME:1};
var ATTRS=['placeholder','title','aria-label','alt'];
function worth(s){s=s.trim();if(s.length<2)return false;if(!/[A-Za-zÀ-ÿ]/.test(s))return false;if(/^[\w.+-]+@[\w.-]+$/.test(s))return false;if(/^(https?:\/\/|www\.)\S+$/.test(s))return false;if(/^@[\w.]+$/.test(s))return false;if(s.length>4000)return false;return true}
function inWidget(n){while(n){if(n.id==='elos-i18n'||(n.dataset&&n.dataset.noTr!==undefined))return true;n=n.parentNode}return false}
function walk(root,fn){
  if(!root)return;
  if(root.nodeType===3){fn(root,null);return}
  if(root.nodeType!==1||SKIP[root.nodeName]||inWidget(root))return;
  var tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,{acceptNode:function(n){if(n.nodeType===1){if(SKIP[n.nodeName]||n.id==='elos-i18n'||(n.dataset&&n.dataset.noTr!==undefined))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_SKIP}return NodeFilter.FILTER_ACCEPT}});
  ATTRS.forEach(function(a){if(root.getAttribute&&root.getAttribute(a))fn(root,a)});
  root.querySelectorAll&&root.querySelectorAll('['+ATTRS.join('],[')+'],input[type=button],input[type=submit]').forEach(function(el){if(SKIP[el.nodeName]||inWidget(el))return;ATTRS.forEach(function(a){if(el.getAttribute(a))fn(el,a)});if(el.type==='button'||el.type==='submit')fn(el,'value')});
  var n;while((n=tw.nextNode()))fn(n,null);
}
/* original de cada nó/atributo */
var ORIG=new WeakMap();
function getOrig(node,attr){var m=ORIG.get(node);var key=attr||'#t';var v=attr?node.getAttribute(attr):node.nodeValue;if(v==null)return null;
  if(m&&m[key]!=null){if(v===m[key+'_set'])return m[key];/* conteúdo foi trocado pelo app */}
  if(!m){m={};ORIG.set(node,m)}m[key]=v;m[key+'_set']=null;return v}
function setVal(node,attr,orig,val){var m=ORIG.get(node);var key=attr||'#t';m[key]=orig;m[key+'_set']=val;if(attr)node.setAttribute(attr,val);else node.nodeValue=val}

function applyNode(node,attr){
  var o=getOrig(node,attr);if(o==null)return;
  var lead=o.match(/^\s*/)[0],trail=o.match(/\s*$/)[0],core=o.trim();
  if(cur===SRC){var m=ORIG.get(node);var now=attr?node.getAttribute(attr):node.nodeValue;if(m&&m[(attr||'#t')+'_set']!=null&&now!==o)setVal(node,attr,o,o);return}
  if(!worth(core))return;
  var d=dictFor(cur);
  if(d[core]!=null){var nv=lead+d[core]+trail;if((attr?node.getAttribute(attr):node.nodeValue)!==nv)setVal(node,attr,o,nv)}
  else if(!queued[cur+'\u0001'+core]){queued[cur+'\u0001'+core]=1;queue.push(core)}
}
function applyAll(root){observerOff();walk(root||document.body,applyNode);observerOn();if(cur!==SRC)pump()}

/* ---------- tradução via Claude ---------- */
function chunks(list){var out=[],c=[],n=0;list.forEach(function(s){if(c.length&&(c.length>=70||n+s.length>5000)){out.push(c);c=[];n=0}c.push(s);n+=s.length});if(c.length)out.push(c);return out}
function post(u,b){return fetch(u,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Elos':'1'},body:JSON.stringify(b)}).then(function(r){return r.json().then(function(j){if(!r.ok){var e=new Error(j.error||r.status);e.status=r.status;throw e}return j})})}
async function pump(){
  if(busy||stopped||cur===SRC||!queue.length)return;busy=true;var lang=cur;
  try{
    await loadShared(lang);
    var d=dictFor(lang);queue=queue.filter(function(s){return d[s]==null});
    if(!queue.length){busy=false;applyAll();return}
    var groups=chunks(queue.splice(0,queue.length));
    for(var gi=0;gi<groups.length;gi++){
      if(cur!==lang)break;
      var g=groups[gi];status('🌐 '+langSelf(lang)+' … '+Math.round(gi/groups.length*100)+'%');
      var res=null;
      try{res=await post('/api/traduzir',{lang:lang,s:g})}catch(e){
        if(e.status===429){g.forEach(function(s){queue.push(s)});status('🌐 '+langSelf(lang)+' — ⏳');setTimeout(function(){busy=false;pump()},20000);return}
        if(e.status===503){stopped=true;status(langSelf(lang)+' — ✕');busy=false;return}
        res=null}
      if(res&&res.t){g.forEach(function(s){if(typeof res.t[s]==='string'&&res.t[s].trim())d[s]=res.t[s]});saveDict(lang);applyAll()}
    }
    status('🌐 '+langSelf(lang)+' ✓');setTimeout(function(){if(cur===lang)status('')},2500);
  }catch(e){}
  busy=false;if(queue.length&&cur===lang)setTimeout(pump,300);
}
/* ---------- cache compartilhado no servidor da Elos (próximos visitantes já recebem traduzido) ---------- */
function loadShared(lang){if(dbLoaded[lang])return dbLoaded[lang];dbLoaded[lang]=fetch('/api/traduzir/'+encodeURIComponent(lang)).then(function(r){return r.ok?r.json():{}}).then(function(j){var d=dictFor(lang),n=0,o=(j&&j.d)||{};for(var k in o){if(d[k]==null){d[k]=o[k];n++}}if(n)saveDict(lang)}).catch(function(){});return dbLoaded[lang]}

/* ---------- observador de mudanças (o sistema redesenha telas) ---------- */
var MO=null,pend=[],tmr=null;
function observerOn(){if(MO)MO.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS})}
function observerOff(){if(MO){MO.takeRecords().forEach(function(r){if(r.type==='childList')r.addedNodes.forEach(function(n){pend.push(n)})});MO.disconnect()}}
function setupMO(){MO=new MutationObserver(function(rs){if(cur===SRC)return;rs.forEach(function(r){if(r.type==='childList')r.addedNodes.forEach(function(n){pend.push(n)});else pend.push(r.target)});clearTimeout(tmr);tmr=setTimeout(function(){var p=pend;pend=[];observerOff();p.forEach(function(n){if(n.isConnected)walk(n,applyNode)});observerOn();pump()},60)});observerOn()}

/* ---------- interface: botão 🌐 + lista de todos os países ---------- */
var css='#elos-i18n{position:fixed;right:12px;bottom:calc(132px + env(safe-area-inset-bottom,0px));text-align:right;z-index:2147483000;font-family:Arial,Helvetica,sans-serif}'+
'#elos-i18n .gb{background:#071a40;color:#ffffff;border:1px solid #e8b84a;border-radius:22px;padding:9px 14px;font-weight:700;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.35);font-size:14px}'+
'#elos-i18n .st{display:inline-block;margin-left:8px;background:#071a40;color:#ffffff;border-radius:14px;padding:5px 10px;font-size:12px;border:1px solid #e8b84a}#elos-i18n .st:empty{display:none}'+
'#elos-i18n .pn{display:none;position:absolute;right:0;text-align:left;bottom:48px;width:min(360px,92vw);max-height:min(70vh,560px);background:#fff;color:#0b1f3a;border:1px solid #e8b84a;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.4);overflow:hidden;flex-direction:column}'+
'#elos-i18n .pn.on{display:flex}#elos-i18n .hd{background:linear-gradient(120deg,#071a40,#0b3a82);color:#ffffff;padding:10px 12px;font-weight:700;font-size:14px}'+
'#elos-i18n input{margin:8px;padding:9px;border:1px solid #d9e2ee;border-radius:6px;font-size:14px;width:calc(100% - 16px);box-sizing:border-box}'+
'#elos-i18n ul{list-style:none;margin:0;padding:0 0 6px;overflow-y:auto;flex:1}#elos-i18n li{padding:8px 12px;cursor:pointer;display:flex;gap:8px;align-items:center;font-size:14px;border-bottom:1px solid #eef3fa}'+
'#elos-i18n li:hover,#elos-i18n li.on{background:#eaf2ff}#elos-i18n li small{color:#5b6b82;margin-left:auto;text-align:right}'+
'#elos-i18n .bn{position:fixed;left:50%;top:12px;transform:translateX(-50%);background:#071a40;color:#ffffff;border:1px solid #e8b84a;border-radius:12px;padding:10px 14px;display:flex;gap:10px;align-items:center;box-shadow:0 6px 24px rgba(0,0,0,.4);font-size:14px;max-width:94vw;flex-wrap:wrap;justify-content:center}'+
'#elos-i18n .bn button{background:#e8b84a;color:#0b1f3a;border:0;border-radius:6px;padding:7px 12px;font-weight:700;cursor:pointer}#elos-i18n .bn button.g{background:transparent;color:#ffffff;border:1px solid #e8b84a}';
var W,BTN,ST,PN,UL,IN;
function status(t){if(ST)ST.textContent=t}
function label(){var c=COUNTRIES.find(function(x){return x.c===curCountry});BTN.textContent='🌐 '+(c?flag(c.c)+' ':'')+langSelf(cur)}
function buildList(q){q=(q||'').toLowerCase();var ui=cur;var rows=COUNTRIES.map(function(x){return {c:x.c,l:x.l,n:dn(ui,'region',x.c)||x.c,ln:langSelf(x.l)}});
  rows.sort(function(a,b){return a.n.localeCompare(b.n,ui)});
  UL.innerHTML='';rows.forEach(function(r){if(q&&(r.n+' '+r.ln+' '+r.c+' '+dn('en','region',r.c)).toLowerCase().indexOf(q)<0)return;var li=document.createElement('li');if(r.c===curCountry)li.className='on';
    li.innerHTML='<span>'+flag(r.c)+'</span><span></span><small></small>';li.children[1].textContent=r.n;li.children[2].textContent=r.ln;li.onclick=function(){pick(r.c,r.l);PN.classList.remove('on')};UL.appendChild(li)})}
function pick(c,l){curCountry=c||'';lsSet('elos_country',curCountry);setLang(l)}
function setLang(l){
  var prev=cur;cur=l||SRC;lsSet('elos_lang',cur);stopped=false;queue=[];queued={};
  window.ELOS_LANG=cur;try{document.dispatchEvent(new CustomEvent('elos-lang',{detail:cur}))}catch(e){}
  var b=base(cur);document.documentElement.lang=cur;document.documentElement.dir=RTL[b]?'rtl':'ltr';
  label();
  if(base(cur)===SRC&&cur!=='pt-PT'){cur=SRC;observerOff();walk(document.body,applyNode);observerOn();status('');return}
  loadShared(cur).then(function(){applyAll()});
}
function banner(l,c){
  var b=document.createElement('div');b.className='bn';
  var nm=langSelf(l);
  b.innerHTML='<span></span><button></button><button class="g">Português</button>';
  b.children[0].textContent='🌐 '+(c?flag(c)+' ':'')+nm+'?';
  b.children[1].textContent='✓ '+nm;
  b.children[1].onclick=function(){b.remove();pick(c,l)};
  b.children[2].onclick=function(){b.remove();lsSet('elos_lang',SRC)};
  W.appendChild(b);
  /* já existe tradução pronta? aplica sem perguntar */
  loadShared(l).then(function(){var d=dictFor(l);if(Object.keys(d).length>20&&b.isConnected){b.remove();pick(c,l)}});
}
function detect(){
  var langs=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||SRC]);
  var l=langs[0]||SRC,reg=(l.split('-')[1]||'').toUpperCase();
  var c='';if(reg&&COUNTRIES.some(function(x){return x.c===reg}))c=reg;
  if(!c){var tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}if(/Sao_Paulo|Fortaleza|Recife|Bahia|Manaus|Belem|Cuiaba|Porto_Velho|Boa_Vista|Rio_Branco|Araguaina|Maceio|Noronha|Santarem|Campo_Grande/.test(tz))c='BR'}
  var map={zh:'zh-CN',no:'nb',pt:(reg==='PT'?'pt-PT':'pt')};
  var b=base(l);var lang=map[b]||(b==='zh'?l:b);
  if(b==='zh'&&/TW|HK|MO|Hant/.test(l))lang=/HK|MO/.test(l)?'zh-HK':'zh-TW';
  return {l:lang,c:c};
}
function init(){window.ELOS_LANG=lsGet('elos_lang')||SRC;
  var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
  W=document.createElement('div');W.id='elos-i18n';W.setAttribute('translate','no');
  W.innerHTML='<div class="pn"><div class="hd">🌐 Elos 360° Global · idioma de cada país</div><input type="search"><ul></ul></div><button class="gb"></button><span class="st"></span>';
  document.body.appendChild(W);PN=W.querySelector('.pn');UL=W.querySelector('ul');IN=W.querySelector('input');BTN=W.querySelector('.gb');ST=W.querySelector('.st');
  IN.placeholder='🔎 País / Country / Pays / País';IN.oninput=function(){buildList(IN.value)};
  BTN.onclick=function(){var on=!PN.classList.contains('on');PN.classList.toggle('on',on);if(on){buildList('');IN.value='';try{IN.focus()}catch(e){}}};
  document.addEventListener('click',function(e){if(!W.contains(e.target))PN.classList.remove('on')});
  setupMO();
  var saved=lsGet('elos_lang'),sc=lsGet('elos_country')||'';
  var det=detect();curCountry=sc||det.c;label();
  if(saved){if(saved!==SRC)setLang(saved);return}
  if(base(det.l)!==SRC||det.l==='pt-PT')banner(det.l,det.c);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
