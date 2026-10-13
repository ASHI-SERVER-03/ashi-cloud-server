(function(){
'use strict';
var token=localStorage.getItem('ashi-admin-token')||'',selected='';
function el(id){return document.getElementById(id);}
function status(v){el('status').textContent=v||'';}
function headers(){return {'Content-Type':'application/json','Authorization':'Bearer '+token};}
function sample(){
 return {id:'mi-transicion-001',name:'Flash Zoom',type:'transition_pack',category:'Transiciones',description:'Transicion rapida para reels.',risk:'medium',version:'1.0.0',tags:['transicion','zoom'],style:{fill:'#FFFFFF',highlight:'#01D2D6',stroke:'#1E3985'},animation:{variant:'flash_zoom',duration:.35,ease:'expo_out',unit:'selection'},safeAction:{method:'execute',data:{action:'APLICAR TRANSICION',variant:'flash_zoom',duration:.35,color:'#01D2D6',prompt:'Transicion segura ASHI'}}};
}
function api(path,opts){return fetch(path,opts).then(function(r){return r.json().then(function(j){if(!r.ok||j.ok===false)throw new Error(j.error||'HTTP '+r.status);return j;});});}
function showAdmin(open){el('login-card').hidden=open;el('admin-card').hidden=!open;el('logout').hidden=!open;}
function render(list){var grid=el('grid');grid.innerHTML='';list.forEach(function(t){var b=document.createElement('button');b.className='item';b.innerHTML='<strong></strong><small></small>';b.querySelector('strong').textContent=t.name;b.querySelector('small').textContent=t.type+' · '+t.category+' · '+t.version;b.onclick=function(){selected=t.id;el('editor').value=JSON.stringify(t,null,2);};grid.appendChild(b);});}
function refresh(){status('Cargando...');api('/api/v1/admin/templates',{headers:headers()}).then(function(j){render(j.templates);status('Listo: '+j.templates.length+' plantilla(s).');}).catch(function(e){status('Error: '+e.message);});}
el('login').onclick=function(){api('/api/v1/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:el('email').value,password:el('password').value})}).then(function(j){token=j.token;localStorage.setItem('ashi-admin-token',token);showAdmin(true);refresh();}).catch(function(e){alert(e.message);});};
el('logout').onclick=function(){token='';localStorage.removeItem('ashi-admin-token');showAdmin(false);};
el('refresh').onclick=refresh;
el('new-template').onclick=function(){selected='';el('editor').value=JSON.stringify(sample(),null,2);};
el('save').onclick=function(){var data=JSON.parse(el('editor').value);api('/api/v1/admin/templates',{method:'POST',headers:headers(),body:JSON.stringify(data)}).then(function(j){selected=j.id;status('Guardado '+j.id+' revision '+j.revision);refresh();}).catch(function(e){status('Error: '+e.message);});};
el('publish').onclick=function(){if(!selected)return status('Selecciona o guarda una plantilla.');api('/api/v1/admin/templates/'+encodeURIComponent(selected)+'/publish',{method:'POST',headers:headers(),body:JSON.stringify({publish:true})}).then(function(){status('Publicado.');refresh();}).catch(function(e){status('Error: '+e.message);});};
el('unpublish').onclick=function(){if(!selected)return status('Selecciona una plantilla.');api('/api/v1/admin/templates/'+encodeURIComponent(selected)+'/publish',{method:'POST',headers:headers(),body:JSON.stringify({publish:false})}).then(function(){status('Despublicado.');refresh();}).catch(function(e){status('Error: '+e.message);});};
el('stats').onclick=function(){api('/api/v1/admin/stats',{headers:headers()}).then(function(j){status(JSON.stringify(j.downloads,null,2));}).catch(function(e){status('Error: '+e.message);});};
showAdmin(!!token);if(token)refresh();
})();
