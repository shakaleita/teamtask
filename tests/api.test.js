const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createServer } = require('node:net');
async function freePort() {
  const srv = createServer();
  await new Promise(resolve => srv.listen(0, '127.0.0.1', resolve));
  const port = srv.address().port;
  await new Promise(resolve => srv.close(resolve));
  return port;
}
async function start() {
  const dir = mkdtempSync(join(tmpdir(), 'portfolio-api-'));
  const port = await freePort();
  const child = spawn(process.execPath, ['server.js'], { cwd: join(__dirname, '..'), env: {...process.env, PORT: String(port), DB_FILE: join(dir, 'test.db')}, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  for (let i=0; i<80; i++) {
    if (child.exitCode !== null) throw Error('Server terminated early');
    try { const r=await fetch(base + '/api/members'); if(r.ok) return {child,dir,base}; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  child.kill(); rmSync(dir, {recursive:true,force:true});
  throw Error('Timed out waiting for application');
}
async function json(base,path,method='GET',data) {
 const r=await fetch(base+path,{method,headers:{'content-type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
 return [r.status,await r.json()];
}
test('real API: create, list, and reject invalid input', async t => {
 const {child,dir,base}=await start();
 t.after(()=>{child.kill();rmSync(dir,{recursive:true,force:true})});
 const [badStatus]=await json(base,'/api/members','POST',{});
 assert.equal(badStatus,400);
 const [createStatus]=await json(base,'/api/members','POST',{"name": "Alex Morgan"});
 assert.equal(createStatus,200);
 const [listStatus,items]=await json(base,'/api/members');
 assert.equal(listStatus,200);assert.equal(items.length,1);
 const [secondStatus]=await json(base,'/api/tasks','POST',{"title": "Review deliverables", "priority": "high"});
 assert.equal(secondStatus,200);
 const [,secondItems]=await json(base,'/api/tasks');
 assert.equal(secondItems.length,1);
});


test('CSV export endpoint: documented, read-only, safely cached', async t => {
  const {child,dir,base}=await start();
  t.after(()=>{child.kill();rmSync(dir,{recursive:true,force:true})});
  const response=await fetch(base+'/api/export/tasks.csv');
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/text\/csv/i);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const contents=await response.text();
  assert.ok(contents.includes('"id"'));
});
