// Deletion integration checks. Uses a disposable database and upload directory.
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const {spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'closetcue-delete-'));
const db=path.join(scratch,'test.db');
const uploads=path.join(scratch,'uploads');fs.mkdirSync(uploads);
const external=!!process.env.TEST_BASE_URL;
const php=external ? require('./php/driver.cjs') : null;
const output=process.env.QA_OUTPUT || path.join(root,'qa');
const origin=process.env.TEST_BASE_URL || 'http://127.0.0.1:18082';
const env={...process.env,PORT:'18082',CLOSETCUE_DB_PATH:db,CLOSETCUE_UPLOADS_DIR:uploads};
const report={checks:[],accessibility:[]};
let server,browser;
const python=code=>execFileSync(process.env.PYTHON||'py',['-3.14','-c',code,db],{encoding:'utf8',windowsHide:true}).trim();
async function start(){
  if(!external)server=spawn(process.env.PYTHON||'py',['-3.14',path.join(root,'server.py')],{env,cwd:root,windowsHide:true,stdio:'ignore'});
  for(let i=0;i<80;i++){try{const response=await fetch(origin);if(response.ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
  throw Error('Disposable server did not start');
}
async function stop(){if(external){php.docker(['restart','web']);return;}if(server.exitCode!==null)return;const stopped=new Promise(resolve=>server.once('exit',resolve));server.kill();await stopped;}
async function remove(id){return fetch(origin+'/php/delete_garment.php',{method:'POST',body:new URLSearchParams({garment_id:String(id)})});}
async function closet(){return (await fetch(origin+'/php/filter_closet.php')).json();}
(async()=>{
  await start();
  for(const id of ['',0,-1,'bad','1 OR 1=1','9999999999999999999999'])assert.equal((await remove(id)).status,400);
  assert.equal((await remove(99999)).status,404);
  assert.equal((await fetch(origin+'/php/delete_garment.php?garment_id=1')).status,405);
  assert.equal((await closet()).count,10);
  report.checks.push('Invalid IDs and GET requests cannot delete garments');

  browser=await chromium.launch({executablePath:process.env.CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/item-details.html?id=1');
  await page.locator('#detail-container:not([hidden])').waitFor();
  await page.click('#btn-delete-garment');
  assert.equal(await page.locator(':focus').getAttribute('id'),'cancel-delete');
  assert.equal(await page.locator('#delete-garment-name').textContent(),'Crimson Chikankari Kurta');
  await page.keyboard.press('Shift+Tab');assert.equal(await page.locator(':focus').getAttribute('id'),'confirm-delete');
  await page.keyboard.press('Escape');assert(!(await page.locator('#delete-dialog').isVisible()));
  assert.equal(await page.locator(':focus').getAttribute('id'),'btn-delete-garment');
  await page.click('#btn-delete-garment');await page.click('#cancel-delete');
  assert.equal((await closet()).count,10);report.checks.push('Confirmation, keyboard focus trap, Escape, and Keep garment');

  await page.click('#btn-delete-garment');
  fs.mkdirSync(output,{recursive:true});
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});
    const box=await page.locator('#delete-dialog').boundingBox();assert(box.x>=0 && box.x+box.width<=width);
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    report.accessibility.push({width,violations:result.violations.map(v=>v.id)});assert.equal(result.violations.length,0);
    if(width!==320)await page.screenshot({path:path.join(output,`delete-dialog-${width}.png`)});
  }
  await page.route('**/php/delete_garment.php',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({status:'error',message:'Could not delete this garment. Please try again.'})}));
  await page.click('#confirm-delete');await page.locator('#delete-error:not([hidden])').waitFor();
  assert(await page.locator('#delete-dialog').isVisible());assert(await page.locator('#confirm-delete').isEnabled());
  assert.equal((await closet()).count,10);report.checks.push('Failed deletion keeps the item and allows retry');
  await page.unroute('**/php/delete_garment.php');await page.click('#confirm-delete');
  await page.waitForURL('**/closet.html*');
  await page.waitForFunction(()=>document.querySelector('#results-count').textContent.startsWith('9 pieces'));
  assert.equal(await page.locator('#closet-grid a[href="item-details.html?id=1"]').count(),0);
  assert.match(await page.locator('#toast').textContent(),/Garment deleted/);
  assert.equal((await fetch(origin+'/php/item_engine.php?id=1')).status,404);
  assert.equal(external ? php.sql('SELECT COUNT(*) FROM wear_history WHERE garment_id=1') : python("import sqlite3,sys; print(sqlite3.connect(sys.argv[1]).execute('SELECT COUNT(*) FROM wear_history WHERE garment_id=1').fetchone()[0])"),'0');
  const analytics=await(await fetch(origin+'/php/get_analytics.php')).json();
  assert(![...analytics.most_loved,...analytics.recently_worn].some(item=>item.id===1));
  assert(fs.existsSync(path.join(root,'uploads','kurta1.jpg')));
  report.checks.push('Successful deletion redirects, removes wear history and analytics, and keeps bundled images');

  // Two records sharing a user-uploaded photo must retain it until the last record is deleted.
  const photo=path.join(uploads,'garment_delete_test.jpg');
  if(external)php.docker(['exec','-T','web','cp',php.webRoot+'/uploads/kurta1.jpg',php.webRoot+'/uploads/garment_delete_test.jpg']);
  else fs.copyFileSync(path.join(root,'uploads','kurta1.jpg'),photo);
  const exists=()=>external ? php.photoExists('garment_delete_test.jpg') : fs.existsSync(photo);
  const ids=external ? [0,1].map(()=>Number(php.sql("INSERT INTO garments(garment_name,category,color_family,color_name,fabric,occasion,shelf_location,image_path,alt_text) SELECT 'Deletion QA',category,color_family,color_name,fabric,occasion,shelf_location,'uploads/garment_delete_test.jpg',alt_text FROM garments WHERE id=3; SELECT LAST_INSERT_ID();"))) : JSON.parse(python("import sqlite3,sys,json; c=sqlite3.connect(sys.argv[1]); ids=[]\nfor n in range(2):\n r=c.execute(\"INSERT INTO garments(garment_name,category,color_family,color_name,fabric,occasion,shelf_location,image_path,alt_text) SELECT 'Deletion QA',category,color_family,color_name,fabric,occasion,shelf_location,'uploads/garment_delete_test.jpg',alt_text FROM garments WHERE id=3\"); ids.append(r.lastrowid)\nc.commit(); print(json.dumps(ids))"));
  assert.equal((await remove(ids[0])).status,200);assert(exists());
  assert.equal((await remove(ids[1])).status,200);assert(!exists());
  assert.equal((await remove(ids[1])).status,404);report.checks.push('Shared uploaded photo retained until its final garment is deleted');

  for(const item of (await closet()).garments)assert.equal((await remove(item.id)).status,200);
  assert.equal((await closet()).count,0);
  assert.equal(external ? php.sql('SELECT COUNT(*) FROM wear_history') : python("import sqlite3,sys; print(sqlite3.connect(sys.argv[1]).execute('SELECT COUNT(*) FROM wear_history').fetchone()[0])"),'0');
  await stop();await start();assert.equal((await closet()).count,0);
  await page.goto(origin+'/closet.html');await page.locator('#empty-state:not([hidden])').waitFor();
  report.checks.push('Deleting the last garment leaves an empty wardrobe after server restart');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify(report,null,2));
})().catch(error=>{report.error=error.stack;console.error(error);process.exitCode=1;}).finally(async()=>{
  await browser?.close();if(server)await stop();
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'deletion-report.json'),JSON.stringify(report,null,2));
});
