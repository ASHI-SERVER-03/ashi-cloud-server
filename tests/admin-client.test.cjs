const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element{
 constructor(){this.value='';this.textContent='';this.hidden=false;this.files=[];this.disabled=false;this.children=[];this.events={};}
 set innerHTML(v){this.html=v;this.children=[];if(v.includes('<strong>')){this.strong=new Element();this.small=new Element();}}
 get innerHTML(){return this.html||'';}
 appendChild(v){this.children.push(v);return v;}
 querySelector(s){return s==='strong'?this.strong:this.small;}
 addEventListener(e,f){(this.events[e]||(this.events[e]=[])).push(f);}
 emit(e){for(const f of this.events[e]||[])f();}
}
const html=fs.readFileSync(__dirname+'/../public/admin/index.html','utf8'),elements={};
for(const [,id]of html.matchAll(/id="([^"]+)"/g))elements[id]=new Element();
const local=new Map([['ashi-admin-token','old-token']]),session=new Map();
const storage=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)});
const template={id:'texto-01',name:'VIRAL',type:'text_animation',category:'Textos',version:'1.0.0',style:{fill:'#FFFFFF'},animation:{variant:'pop',duration:0.45},tags:[],published:true};
let expired=false,attempts=0,deletes=0,confirmDelete=false,saved,removed=false,calls=[],revoked=[];
const context={document:{getElementById:id=>elements[id],createElement:()=>new Element()},localStorage:storage(local),sessionStorage:storage(session),window:{addEventListener(){}},location:{href:'https://ashi.test/admin/',origin:'https://ashi.test'},URL:Object.assign(class extends URL {},{createObjectURL:()=> 'blob:preview-test',revokeObjectURL:url=>revoked.push(url)}),FormData:class{append(){}},confirm:()=>confirmDelete,console,
 fetch:async(url,opts)=>{
 calls.push({url,opts});let code=200,data={ok:true};
 if(url.endsWith('/publish'))attempts++;
 if(url.endsWith('/login'))data.token='fresh-token';
 else if(expired&&opts.headers.Authorization!=='Bearer fresh-token'){code=401;data={ok:false,error:'auth_invalid'};}
 else if(url.endsWith('/assets'))data.asset={url:'https://ashi.test/preview.mp4',sha256:'a'.repeat(64)};
 else if(opts.method==='DELETE'){removed=true;deletes++;}
 else if(opts.method==='POST'&&url.endsWith('/templates')){saved=JSON.parse(opts.body);data={ok:true,id:saved.id,revision:2};}
 else if(url.endsWith('/publish'))template.published=JSON.parse(opts.body).publish;
 else data.templates=removed?[]:[template];
 return {ok:code===200,status:code,text:async()=>JSON.stringify(data)};
 }};
const flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
 vm.runInNewContext(fs.readFileSync(__dirname+'/../public/admin/app.js','utf8'),context);await flush();
 assert.equal(local.has('ashi-admin-token'),false);
 elements.grid.children[0].onclick();
 elements['tpl-name'].value='Texto conservado';elements['template-editor'].emit('input');
 assert.equal(elements['preview-name'].textContent,'Texto conservado');
 elements['preview-file'].files=[{name:'preview.mp4',type:'video/mp4'}];elements['preview-file'].emit('change');
 assert.equal(elements['preview-media'].children[0].src,'blob:preview-test');assert.equal(elements['preview-media'].children[0].controls,true);
 await elements['upload-preview'].onclick();await flush();
 assert.equal(elements['preview-media'].children[0].src,'https://ashi.test/preview.mp4');
 await elements.save.onclick();await flush();assert.equal(saved.preview,'https://ashi.test/preview.mp4');
 expired=true;const operation=elements.unpublish.onclick();await flush();
 assert.equal(elements['login-card'].hidden,false);assert.match(elements['login-status'].textContent,/sesión caducó/);assert.equal(elements['tpl-name'].value,'Texto conservado');
 elements.email.value='owner@example.com';elements.password.value='test-password';elements.login.onclick();await flush();await flush();await operation;
 assert.equal(attempts,2);assert.equal(template.published,false);assert.equal(elements.password.value,'');assert.equal(session.get('ashi-admin-token'),'fresh-token');
 elements['delete-template'].onclick();await flush();assert.equal(deletes,0);
 confirmDelete=true;elements['delete-template'].onclick();await flush();await flush();assert.equal(deletes,1);assert.equal(elements.grid.children.length,0);assert.equal(elements.status.textContent,'Plantilla eliminada.');
 elements['new-template'].onclick();elements.publish.onclick();await flush();assert.match(elements.status.textContent,/Primero guarda/);
 assert(revoked.includes('blob:preview-test'));
 console.log('PASS admin client: live media/form preview, preserved upload URLs, re-login with draft and request replay, safe deletion');
})().catch(e=>{console.error(e);process.exitCode=1;});
