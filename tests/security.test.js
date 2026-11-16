const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {createServer}=require('node:net');

async function freePort() {
  const server=createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return port;
}

async function launch(t, token) {
  const port=await freePort();
  const dir=mkdtempSync(join(tmpdir(),'auth-regression-'));
  const env={...process.env,PORT:String(port),DB_FILE:join(dir,'test.db'),APP_ENV:'production'};
  delete env.API_TOKEN;
  if(token)env.API_TOKEN=token;
  const child=spawn(process.execPath,['server.js'],{cwd:join(__dirname,'..'),env,stdio:'ignore'});
  t.after(()=>{child.kill();rmSync(dir,{force:true,recursive:true})});
  const base='http://127.0.0.1:'+port;
  for(let attempt=0;attempt<70;attempt++){
    if(child.exitCode!==null)throw Error('Server crashed on startup');
    try{const response=await fetch(base+'/api/health');if(response.ok)return base}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw Error('Timed out waiting for API server');
}

test('production API is private and uses a valid token',async t=>{
  const base=await launch(t,'test-secret-token');
  const unauthorised=await fetch(base+'/api/insights');
  assert.equal(unauthorised.status,401);
  const wrong=await fetch(base+'/api/insights',{headers:{'x-api-token':'wrong'}});
  assert.equal(wrong.status,401);
  const authorised=await fetch(base+'/api/insights',{headers:{'x-api-token':'test-secret-token'}});
  assert.equal(authorised.status,200);
  const unknown=await fetch(base+'/api/not-a-real-route',{headers:{'x-api-token':'test-secret-token'}});
  assert.equal(unknown.status,404);
});

test('production without configured token rejects API access',async t=>{
  const base=await launch(t);
  assert.equal((await fetch(base+'/api/insights')).status,503);
  assert.equal((await fetch(base+'/api/health')).status,200);
});
