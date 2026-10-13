(function(){
'use strict';
var token=localStorage.getItem('ashi-admin-token')||'',selected='',current=null;
function el(id){return document.getElementById(id);}
function status(v){el('status').textContent=v||'';}
function headers(){return {'Content-Type':'application/json','Authorization':'Bearer '+token};}
function authHeaders(){return {'Authorization':'Bearer '+token};}
function tags(v){return String(v||'').split(',').map(function(x){return x.trim();}).filter(Boolean);}
function csv(list){return (list||[]).join(', ');}
function validHex(v,fallback){return /^#[0-9a-fA-F]{6}$/.test(v||'')?v:fallback;}
function safeActionFor(type,variant,duration,color,prompt){
 var action='ANIMAR TEXTO',method='execute';
 if(type==='transition_pack')action='APLICAR TRANSICION';
 if(type==='curve_pack')action='TRANSFERIR CURVAS';
 if(type==='caption_style'||type==='highlighted_subtitle')method='applySubtitleStyle';
 return {method:method,data:{action:method==='execute'?action:undefined,variant:variant,duration:duration,color:color,prompt:prompt||'Plantilla segura ASHI'}};
}
function sample(){
 return {id:'mi-transicion-001',name:'Flash Zoom',type:'transition_pack',category:'Transiciones',description:'Transicion rapida para reels.',risk:'medium',version:'1.0.0',minAeVersion:'2022',tags:['transicion','zoom'],preview:'',assetUrl:'',assetSha256:'',style:{font:'Poppins',fill:'#FFFFFF',highlight:'#01D2D6',stroke:'#1E3985'},animation:{variant:'flash_zoom',duration:.35,ease:'expo_out',unit:'selection'},safeAction:{method:'execute',data:{action:'APLICAR TRANSICION',variant:'flash_zoom',duration:.35,color:'#01D2D6',prompt:'Transicion segura ASHI'}},prompt:'Transicion segura para reels.'};
}
function api(path,opts){return fetch(path,opts).then(function(r){return r.text().then(function(t){var j;try{j=t?JSON.parse(t):{};}catch(e){throw new Error('HTTP '+r.status);}if(!r.ok||j.ok===false)throw new Error(j.error||'HTTP '+r.status);return j;});});}
function showAdmin(open){el('login-card').hidden=open;el('admin-card').hidden=!open;el('logout').hidden=!open;}
function toForm(t){
 current=t||sample();selected=current.id||'';
 el('tpl-id').value=current.id||'';el('tpl-name').value=current.name||'';el('tpl-type').value=current.type||'highlighted_subtitle';el('tpl-category').value=current.category||'Subtitulos';
 el('tpl-version').value=current.version||'1.0.0';el('tpl-ae').value=current.minAeVersion||'';el('tpl-risk').value=current.risk||'medium';el('tpl-tags').value=csv(current.tags);
 el('tpl-description').value=current.description||'';el('tpl-font').value=(current.style&&current.style.font)||'';el('tpl-fill').value=(current.style&&current.style.fill)||'#FFFFFF';
 el('tpl-highlight').value=(current.style&&current.style.highlight)||'#FFE16A';el('tpl-stroke').value=(current.style&&current.style.stroke)||'#000000';
 el('tpl-variant').value=(current.animation&&current.animation.variant)||'pop';el('tpl-duration').value=(current.animation&&current.animation.duration)||0.45;
 el('tpl-ease').value=(current.animation&&current.animation.ease)||'smooth';el('tpl-unit').value=(current.animation&&current.animation.unit)||'words';el('tpl-prompt').value=current.prompt||'';
 el('editor').value=JSON.stringify(current,null,2);
}
function fromForm(){
 var base=current||{},type=el('tpl-type').value,variant=el('tpl-variant').value.trim()||'pop',duration=Number(el('tpl-duration').value||0.45),color=validHex(el('tpl-highlight').value,'#FFE16A'),prompt=el('tpl-prompt').value.trim();
 return {
  id:el('tpl-id').value.trim(),name:el('tpl-name').value.trim(),type:type,category:el('tpl-category').value.trim(),description:el('tpl-description').value.trim(),risk:el('tpl-risk').value,version:el('tpl-version').value.trim()||'1.0.0',minAeVersion:el('tpl-ae').value.trim(),tags:tags(el('tpl-tags').value),preview:base.preview||'',assetUrl:base.assetUrl||'',assetSha256:base.assetSha256||'',
  style:{font:el('tpl-font').value.trim(),fill:validHex(el('tpl-fill').value,'#FFFFFF'),highlight:color,stroke:validHex(el('tpl-stroke').value,'#000000')},
  animation:{variant:variant,duration:duration,ease:el('tpl-ease').value.trim()||'smooth',unit:el('tpl-unit').value.trim()||'words'},
  safeAction:safeActionFor(type,variant,duration,color,prompt),prompt:prompt
 };
}
function render(list){var grid=el('grid');grid.innerHTML='';list.forEach(function(t){var b=document.createElement('button');b.className='item';b.innerHTML='<strong></strong><small></small>';b.querySelector('strong').textContent=t.name;b.querySelector('small').textContent=t.type+' · '+t.category+' · '+t.version;b.onclick=function(){toForm(t);};grid.appendChild(b);});}
function refresh(){status('Cargando...');api('/api/v1/admin/templates',{headers:headers()}).then(function(j){render(j.templates);status('Listo: '+j.templates.length+' plantilla(s).');}).catch(function(e){status('Error: '+e.message);});}
function save(){
 var data=fromForm();current=data;el('editor').value=JSON.stringify(data,null,2);
 api('/api/v1/admin/templates',{method:'POST',headers:headers(),body:JSON.stringify(data)}).then(function(j){selected=j.id;status('Guardado '+j.id+' revision '+j.revision);refresh();}).catch(function(e){status('Error: '+e.message);});
}
function upload(kind,inputId){
 if(!selected)return status('Primero guarda la plantilla.');
 var file=el(inputId).files[0];if(!file)return status('Selecciona un archivo.');
 var form=new FormData();form.append('file',file);form.append('kind',kind);
 status('Subiendo '+file.name+'...');
 api('/api/v1/admin/templates/'+encodeURIComponent(selected)+'/assets',{method:'POST',headers:authHeaders(),body:form}).then(function(j){status('Archivo subido: '+j.asset.url);refresh();}).catch(function(e){status('Error: '+e.message);});
}
el('login').onclick=function(){api('/api/v1/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:el('email').value,password:el('password').value})}).then(function(j){token=j.token;localStorage.setItem('ashi-admin-token',token);showAdmin(true);refresh();}).catch(function(e){alert(e.message);});};
el('logout').onclick=function(){token='';localStorage.removeItem('ashi-admin-token');showAdmin(false);};
el('refresh').onclick=refresh;
el('new-template').onclick=function(){toForm(sample());};
el('save').onclick=save;
el('upload-asset').onclick=function(){upload('asset','asset-file');};
el('upload-preview').onclick=function(){upload('preview','preview-file');};
el('editor').onchange=function(){try{toForm(JSON.parse(el('editor').value));status('JSON aplicado al formulario.');}catch(e){status('JSON invalido: '+e.message);}};
el('publish').onclick=function(){if(!selected)return status('Selecciona o guarda una plantilla.');api('/api/v1/admin/templates/'+encodeURIComponent(selected)+'/publish',{method:'POST',headers:headers(),body:JSON.stringify({publish:true})}).then(function(){status('Publicado.');refresh();}).catch(function(e){status('Error: '+e.message);});};
el('unpublish').onclick=function(){if(!selected)return status('Selecciona una plantilla.');api('/api/v1/admin/templates/'+encodeURIComponent(selected)+'/publish',{method:'POST',headers:headers(),body:JSON.stringify({publish:false})}).then(function(){status('Despublicado.');refresh();}).catch(function(e){status('Error: '+e.message);});};
el('stats').onclick=function(){api('/api/v1/admin/stats',{headers:headers()}).then(function(j){status(JSON.stringify(j.downloads,null,2));}).catch(function(e){status('Error: '+e.message);});};
toForm(sample());showAdmin(!!token);if(token)refresh();
})();
