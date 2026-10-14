(function(){
'use strict';
// Sessions stay in this tab; migrate and remove the older persistent token.
var token=sessionStorage.getItem('ashi-admin-token')||localStorage.getItem('ashi-admin-token')||'';
localStorage.removeItem('ashi-admin-token');
if(token)sessionStorage.setItem('ashi-admin-token',token);
var selected='',current=null,pending=[],busy=false,localPreview='',mediaKey='';
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
function sample(){return {id:'plantilla-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),name:'Nueva plantilla',type:'text_animation',category:'Textos',risk:'medium',version:'1.0.0',minAeVersion:'2022',tags:[],preview:'',assetUrl:'',assetSha256:'',style:{font:'Poppins',fill:'#FFFFFF',highlight:'#01D2D6',stroke:'#000000'},animation:{variant:'pop',duration:.45,ease:'smooth',unit:'words'},prompt:''};}
function api(path,opts,retried){
 opts=opts||{};
 var loginRequest=path==='/api/v1/admin/login';
 if(!loginRequest){opts.headers=Object.assign({},opts.headers||{}, {'Authorization':'Bearer '+token});}
 return fetch(path,opts).then(function(r){return r.text().then(function(t){
  var j;try{j=t?JSON.parse(t):{};}catch(e){throw new Error('El servidor respondió HTTP '+r.status+'. Intenta de nuevo.');}
  if(r.status===401&&!loginRequest){
   token='';sessionStorage.removeItem('ashi-admin-token');
   showAdmin(false);
   el('login-status').textContent='Tu sesión caducó o dejó de ser válida. Inicia sesión de nuevo; el formulario se conserva.';
   if(retried)throw new Error('No se pudo validar la nueva sesión. Vuelve a iniciar sesión.');
   return new Promise(function(resolve,reject){pending.push({path:path,opts:opts,resolve:resolve,reject:reject});});
  }
  if(!r.ok||j.ok===false){
   var messages={invalid_credentials:'Email o contraseña incorrectos.',invalid_login:'Revisa tu email y contraseña.',admin_forbidden:'Esta cuenta no tiene permiso de propietario.',not_found:'La plantilla ya no está disponible.',validation_failed:'Revisa los campos de la plantilla.',file_type_not_allowed:'Este tipo de archivo no está permitido.',asset_storage_requires_s3:'Sin almacenamiento S3/R2, el archivo puede tener hasta 25 MB.'};
   throw new Error(messages[j.error]||'No se pudo completar la operación (HTTP '+r.status+').');
  }
  return j;
 });});
}
function showAdmin(open){el('login-card').hidden=open;el('admin-card').hidden=!open;el('logout').hidden=!open;}
function clearLocalPreview(){if(localPreview)URL.revokeObjectURL(localPreview);localPreview='';el('preview-file').value='';el('asset-file').value='';}
function toForm(t,saved){
 clearLocalPreview();current=t||sample();selected=saved?current.id:'';
 el('tpl-id').value=current.id||'';el('tpl-name').value=current.name||'';el('tpl-type').value=current.type||'highlighted_subtitle';el('tpl-category').value=current.category||'Subtitulos';
 el('tpl-version').value=current.version||'1.0.0';el('tpl-ae').value=current.minAeVersion||'';el('tpl-risk').value=current.risk||'medium';el('tpl-tags').value=csv(current.tags);
 el('tpl-description').value=current.description||'';el('tpl-font').value=(current.style&&current.style.font)||'';el('tpl-fill').value=(current.style&&current.style.fill)||'#FFFFFF';
 el('tpl-highlight').value=(current.style&&current.style.highlight)||'#FFE16A';el('tpl-stroke').value=(current.style&&current.style.stroke)||'#000000';
 el('tpl-variant').value=(current.animation&&current.animation.variant)||'pop';el('tpl-duration').value=(current.animation&&current.animation.duration)||0.45;
 el('tpl-ease').value=(current.animation&&current.animation.ease)||'smooth';el('tpl-unit').value=(current.animation&&current.animation.unit)||'words';el('tpl-prompt').value=current.prompt||'';
 el('editor').value=JSON.stringify(current,null,2);updatePreview();
}
function fromForm(){
 var base=current||{},type=el('tpl-type').value,variant=el('tpl-variant').value.trim()||'pop',duration=Number(el('tpl-duration').value||0.45),color=validHex(el('tpl-highlight').value,'#FFE16A'),prompt=el('tpl-prompt').value.trim();
 return {id:el('tpl-id').value.trim(),name:el('tpl-name').value.trim(),type:type,category:el('tpl-category').value.trim(),description:el('tpl-description').value.trim(),risk:el('tpl-risk').value,version:el('tpl-version').value.trim()||'1.0.0',minAeVersion:el('tpl-ae').value.trim(),tags:tags(el('tpl-tags').value),preview:base.preview||'',assetUrl:base.assetUrl||'',assetSha256:base.assetSha256||'',style:{font:el('tpl-font').value.trim(),fill:validHex(el('tpl-fill').value,'#FFFFFF'),highlight:color,stroke:validHex(el('tpl-stroke').value,'#000000')},animation:{variant:variant,duration:duration,ease:el('tpl-ease').value.trim()||'smooth',unit:el('tpl-unit').value.trim()||'words'},safeAction:safeActionFor(type,variant,duration,color,prompt),prompt:prompt};
}
function safeMediaURL(value){
 try{var u=new URL(value,location.href);if(u.protocol==='https:'||u.origin===location.origin&&u.protocol==='http:')return u.href;}catch(e){}
 return '';
}
function updatePreview(){
 var t=fromForm();el('preview-name').textContent=t.name||'Nombre de la plantilla';el('preview-category').textContent=t.category+' · '+t.version;
 el('preview-description').textContent=t.description;
 var tagBox=el('preview-tags');tagBox.innerHTML='';t.tags.slice(0,5).forEach(function(tag){var span=document.createElement('span');span.textContent=tag;tagBox.appendChild(span);});
 el('preview-publication').textContent=selected?(current.published?'Publicada: visible para los usuarios.':'Borrador: todavía no aparece en ASHI.'):'Nueva plantilla: guarda antes de publicar.';
 el('preview-file-note').textContent=localPreview?'Preview local: aún no se ha subido.':(t.preview?'Preview guardado en el servidor.':'Selecciona una imagen o un MP4 en Preview imagen/video.');
 var src=localPreview||safeMediaURL(t.preview),file=el('preview-file').files[0];
 var video=localPreview?file&&(/\.(mp4|mov)$/i.test(file.name)||/^video\//.test(file.type)):/\.(mp4|mov)(?:[?#]|$)/i.test(src);
 var key=src+'|'+video;if(key===mediaKey)return;mediaKey=key;
 var box=el('preview-media');box.innerHTML='';
 if(!src){var empty=document.createElement('span');empty.textContent='Sin preview';box.appendChild(empty);return;}
 var media=document.createElement(video?'video':'img');media.src=src;
 if(video){media.controls=true;media.muted=true;media.loop=true;media.playsInline=true;media.preload='metadata';}else media.alt='Previsualización de '+t.name;
 media.onerror=function(){box.innerHTML='';var note=document.createElement('span');note.textContent='No se pudo reproducir el preview. Usa MP4 H.264 o una imagen PNG/JPG.';box.appendChild(note);};
 box.appendChild(media);
}
function render(list){var grid=el('grid');grid.innerHTML='';list.forEach(function(t){var b=document.createElement('button');b.className='item';b.innerHTML='<strong></strong><small></small>';b.querySelector('strong').textContent=t.name;b.querySelector('small').textContent=t.category+' · '+t.version+' · '+(t.published?'Publicada':'Borrador');b.onclick=function(){if(!busy)toForm(t,true);};grid.appendChild(b);});}
function refresh(message){return api('/api/v1/admin/templates',{headers:headers()}).then(function(j){render(j.templates);status(message||'Listo: '+j.templates.length+' plantilla(s).');return j;});}
function setBusy(value){busy=value;['save','publish','unpublish','delete-template','upload-asset','upload-preview','new-template'].forEach(function(id){el(id).disabled=value;});}
function run(action){if(busy)return;setBusy(true);return Promise.resolve().then(action).catch(function(e){status(e.message);}).finally(function(){setBusy(false);});}
function requireSelected(){if(!selected||el('tpl-id').value.trim()!==selected)throw new Error('Primero guarda o selecciona la plantilla.');}
function save(){return run(function(){var data=fromForm();el('editor').value=JSON.stringify(data,null,2);return api('/api/v1/admin/templates',{method:'POST',headers:headers(),body:JSON.stringify(data)}).then(function(j){data.published=current&&current.id===data.id&&current.published;current=data;selected=j.id;updatePreview();return refresh('Guardado '+j.id+' · revisión '+j.revision);});});}
function upload(kind,inputId){return run(function(){requireSelected();var id=selected,file=el(inputId).files[0];if(!file)throw new Error('Selecciona un archivo.');var form=new FormData();form.append('file',file);form.append('kind',kind);status('Subiendo '+file.name+'...');return api('/api/v1/admin/templates/'+encodeURIComponent(id)+'/assets',{method:'POST',headers:authHeaders(),body:form}).then(function(j){
 if(kind==='preview'){current.preview=j.asset.url;if(localPreview)URL.revokeObjectURL(localPreview);localPreview='';}else{current.assetUrl=j.asset.url;current.assetSha256=j.asset.sha256;}
 updatePreview();return refresh(kind==='preview'?'Preview subido.':'Archivo de plantilla subido.');
});});}
function publish(value){return run(function(){requireSelected();return api('/api/v1/admin/templates/'+encodeURIComponent(selected)+'/publish',{method:'POST',headers:headers(),body:JSON.stringify({publish:value})}).then(function(){current.published=value;updatePreview();return refresh(value?'Publicada: ya disponible en ASHI.':'Despublicada: oculta en la biblioteca.');});});}
el('login').onclick=function(){
 if(el('login').disabled)return;el('login').disabled=true;el('login-status').textContent='Validando acceso...';
 api('/api/v1/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:el('email').value,password:el('password').value})}).then(function(j){
 token=j.token;sessionStorage.setItem('ashi-admin-token',token);el('password').value='';el('login-status').textContent='';showAdmin(true);
 var queue=pending.splice(0);if(queue.length){status('Sesión recuperada. Completando la operación...');queue.forEach(function(task){api(task.path,task.opts,true).then(task.resolve,task.reject);});}else return refresh();
 }).catch(function(e){el('login-status').textContent=e.message;}).finally(function(){el('login').disabled=false;});
};
el('logout').onclick=function(){token='';sessionStorage.removeItem('ashi-admin-token');pending.splice(0).forEach(function(task){task.reject(new Error('Operación cancelada al cerrar sesión.'));});showAdmin(false);};
el('refresh').onclick=function(){refresh().catch(function(e){status(e.message);});};
el('new-template').onclick=function(){toForm(sample(),false);status('Nueva plantilla.');};
el('save').onclick=save;el('upload-asset').onclick=function(){upload('asset','asset-file');};el('upload-preview').onclick=function(){upload('preview','preview-file');};
el('editor').onchange=function(){try{var oldId=selected;toForm(JSON.parse(el('editor').value),false);if(current.id===oldId)selected=oldId;updatePreview();status('JSON aplicado al formulario.');}catch(e){status('JSON inválido: '+e.message);}};
el('publish').onclick=function(){publish(true);};el('unpublish').onclick=function(){publish(false);};
el('delete-template').onclick=function(){
 if(busy)return;try{requireSelected();}catch(e){return status(e.message);}
 if(!confirm('¿Eliminar "'+current.name+'" de la biblioteca? Dejará de aparecer para los usuarios. Las copias ya descargadas no se eliminan.'))return;
 run(function(){return api('/api/v1/admin/templates/'+encodeURIComponent(selected),{method:'DELETE',headers:headers()}).then(function(){toForm(sample(),false);return refresh('Plantilla eliminada.');});});
};
el('stats').onclick=function(){api('/api/v1/admin/stats',{headers:headers()}).then(function(j){status(JSON.stringify(j.downloads,null,2));}).catch(function(e){status(e.message);});};
el('template-editor').addEventListener('input',updatePreview);
el('template-editor').addEventListener('change',updatePreview);
el('preview-file').addEventListener('change',function(){if(localPreview)URL.revokeObjectURL(localPreview);localPreview='';var file=el('preview-file').files[0];if(file&&/\.(jpg|jpeg|png|webp|mp4|mov)$/i.test(file.name))localPreview=URL.createObjectURL(file);updatePreview();});
window.addEventListener('beforeunload',function(){if(localPreview)URL.revokeObjectURL(localPreview);});
toForm(sample(),false);showAdmin(!!token);if(token)refresh().catch(function(e){status(e.message);});
})();
