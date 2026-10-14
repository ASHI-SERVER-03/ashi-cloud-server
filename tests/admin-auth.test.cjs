const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function load(file,globals){let code=fs.readFileSync(path.resolve(__dirname,'../'+file),'utf8').replace(/^import .*;$/gm,'').replace(/export /g,'');const ctx=vm.createContext(globals);vm.runInContext(code,ctx);return ctx;}
(async()=>{
 let mode='ok',dbCalls=0;
 const c=load('src/auth.js',{jwt:{verify(){if(mode==='expired'){const e=new Error();e.name='TokenExpiredError';throw e;}if(mode==='invalid')throw new Error();return {sub:'owner-id'};}},config:{jwtSecret:'unit-test-only'},query:async()=>{dbCalls++;if(mode==='db')throw new Error('db unavailable');return {rows:mode==='disabled'?[]:[{id:'owner-id',email:'owner@example.com',role:mode==='viewer'?'viewer':'owner'}]};}});
 async function request(value='Bearer test-token'){const res={status(code){this.code=code;return this;},json(body){this.body=body;return this;}};const req={headers:{authorization:value}};let next=false;await c.requireAdmin(req,res,error=>{next=error||true;});return {res,req,next};}
 assert.equal((await request('')).res.body.error,'auth_required');
 mode='expired';assert.equal((await request()).res.body.error,'auth_expired');
 mode='invalid';assert.equal((await request()).res.body.error,'auth_invalid');assert.equal(dbCalls,0);
 mode='viewer';assert.equal((await request()).res.code,403);
 mode='disabled';assert.equal((await request()).res.code,403);
 mode='ok';assert.equal((await request()).next,true);
 mode='db';assert((await request()).next instanceof Error,'Database errors must reach Express, not become auth_invalid');
 let calls=[],found=true;const routes={};
 load('src/routes/admin.js',{express:{Router:()=>({post(url,...handlers){routes[url]=handlers;},get(){},patch(){},delete(url,...handlers){routes[url]=handlers;}})},multer:Object.assign(()=>({single:()=>()=>{}}),{memoryStorage:()=>({})}),config:{maxUploadMb:25},requireAdmin(){},transaction:async fn=>fn({query:async(sql,params)=>{calls.push({sql,params});return {rowCount:found?1:0};}})});
 const handler=routes['/api/v1/admin/templates/:id'][1];
 async function remove(){const res={status(n){this.code=n;return this;},json(v){this.body=v;return this;}};await handler({params:{id:'test-id'},admin:{email:'owner'},ip:'127.0.0.1'},res,e=>{throw e;});return res;}
 assert.equal((await remove()).body.deleted,true);assert.equal(calls.length,2);assert(calls[0].sql.includes('published_at=null'));assert(calls[1].sql.includes('audit_logs'));
 found=false;calls=[];assert.equal((await remove()).code,404);assert.equal(calls.length,1);
 found=true;calls=[];
 const publish=routes['/api/v1/admin/templates/:id/publish'][1];
 const response={json(v){this.body=v;return this;}};
 await publish({params:{id:'test-id'},body:{publish:false},admin:{email:'owner'},ip:'127.0.0.1'},response,e=>{throw e;});
 assert.equal(response.body.published,false);assert.equal(calls[0].params[1],null);assert.equal(calls[1].params[1],'template.unpublish');
 console.log('PASS admin auth: expired/invalid/missing tokens, owner-only authorization, DB error handling, audited soft delete');
})().catch(e=>{console.error(e);process.exitCode=1;});
