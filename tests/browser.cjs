// Integration and layout checks against a disposable SQLite database.
// Dependencies: playwright and @axe-core/playwright (see README).
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'closetcue-test-'));
const output=process.env.QA_OUTPUT || path.join(root,'qa');fs.mkdirSync(output,{recursive:true});
const port=18081;
const external=!!process.env.TEST_BASE_URL;
const origin=process.env.TEST_BASE_URL || `http://127.0.0.1:${port}`;
const testUploads=path.join(scratch,'uploads');fs.mkdirSync(testUploads);
const server=external ? null : spawn(process.env.PYTHON || 'py',['-3.14',path.join(root,'server.py')],{cwd:root,env:{...process.env,PORT:String(port),CLOSETCUE_DB_PATH:path.join(scratch,'test.db'),CLOSETCUE_UPLOADS_DIR:testUploads},windowsHide:true,stdio:'ignore'});
let browser;const uploaded=[];const report={layouts:[],accessibility:[],flows:[]};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  for(let i=0;i<80;i++){try{await fetch(origin);break;}catch{if(i===79)throw new Error('Test server did not start');await delay(100);}}
  browser=await chromium.launch({executablePath:process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();const consoleErrors=[];
  page.on('pageerror',err=>consoleErrors.push(err.message));
  for(const [name,route,ready] of [['home','index.html','#most-loved-grid .product-card'],['closet','closet.html','#closet-grid .product-card'],['add','add-garment.html','#add-garment-form'],['details','item-details.html?id=1','#detail-container:not([hidden])']]){
    await page.goto(`${origin}/${route}`);await page.locator(ready).first().waitFor();await page.evaluate(()=>document.fonts.ready);
    const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    report.accessibility.push({page:name,violations:results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
    for(const width of [1440,1024,760,390,320]){
      await page.setViewportSize({width,height:1000});
      await page.evaluate(()=>Promise.all([...document.images].filter(img=>img.getAttribute('src')).map(img=>img.decode().catch(()=>{}))));
      const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,brokenImages:[...document.images].filter(img=>!img.naturalWidth && img.getAttribute('src')).map(img=>img.src),fallbacks:document.querySelectorAll('.image-fallback').length}));
      assert(metrics.scroll<=width+1,`${name} overflows at ${width}: ${metrics.scroll}`);
      assert.equal(metrics.brokenImages.length,0,`${name} has broken images`);
      assert.equal(metrics.fallbacks,0,`${name} has missing photos`);
      report.layouts.push({page:name,...metrics});
      if(width===1440 || width===390)await page.screenshot({path:path.join(output,`${name}-${width}.png`),fullPage:true});
    }
    await page.setViewportSize({width:1440,height:1000});
  }
  await page.goto(`${origin}/index.html`);await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').textContent(),'Skip to main content');await page.keyboard.press('Enter');assert.equal(await page.locator(':focus').getAttribute('id'),'main-content');report.flows.push('Keyboard skip link');
  await page.goto(`${origin}/closet.html?sort=most_worn`);await page.waitForFunction(()=>document.querySelector('#closet-grid').getAttribute('aria-busy')==='false');assert.equal(await page.locator('#filter-sort').inputValue(),'most_worn');assert.match(await page.locator('#closet-grid .product-card').first().textContent(),/Crimson/);
  await page.selectOption('#filter-occasion','Party');await page.waitForFunction(()=>document.querySelector('#results-count').textContent.startsWith('2 pieces'));assert.equal(await page.locator('#closet-grid .product-card').count(),2);
  await page.selectOption('#filter-fabric','Denim');await page.locator('#empty-state:not([hidden])').waitFor();assert.equal(await page.locator('#closet-grid .product-card').count(),0);
  await page.click('#clear-filters');await page.waitForFunction(()=>document.querySelector('#results-count').textContent.startsWith('10 pieces'));report.flows.push('URL filters, sort, combined filters, empty state, reset');
  await page.goto(`${origin}/item-details.html?id=1`);await page.locator('#detail-container:not([hidden])').waitFor();const before=Number(await page.locator('#times-worn').textContent());assert((await page.locator('#recommendations-grid .product-card').count())>0);
  await page.fill('#event-note','QA outfit');await page.click('#btn-choose-today');await page.locator('#wear-confirmation:not([hidden])').waitFor();assert.equal(Number(await page.locator('#times-worn').textContent()),before+1);await page.reload();await page.locator('#detail-container:not([hidden])').waitFor();assert.equal(Number(await page.locator('#times-worn').textContent()),before+1);report.flows.push('Recommendations, wear logging, persistence after reload');
  await page.route('**/php/log_wear.php',route=>route.abort());await page.click('#btn-choose-today');await page.locator('#wear-confirmation.error:not([hidden])').waitFor();assert.equal(Number(await page.locator('#times-worn').textContent()),before+1);await page.unroute('**/php/log_wear.php');report.flows.push('Failed wear log does not increment count');
  await page.goto(`${origin}/item-details.html?id=not-a-number`);await page.locator('#error-state:not([hidden])').waitFor();assert(await page.locator('#detail-container').isHidden());
  for(const id of ['invalid','99999']){const response=await context.request.get(`${origin}/php/item_engine.php?id=${id}`);assert([400,404].includes(response.status()));}report.flows.push('Invalid and missing garment handling');
  await page.goto(`${origin}/add-garment.html`);await page.click('button[type="submit"]');await page.locator('#error-container:not([hidden])').waitFor();assert.equal(await page.locator('#error-container li').count(),8);
  const specimen=path.join(root,'uploads/kurta1.jpg');
  await page.setInputFiles('#garment_photo',specimen);await page.locator('#image-preview:not([hidden])').waitFor();
  await page.fill('#garment_name','QA <test> Garment');await page.selectOption('#category','Top');await page.selectOption('#occasion','Casual');await page.fill('#color_name','White');await page.selectOption('#color_family','Neutral');await page.selectOption('#fabric','Cotton');await page.fill('#shelf_location','QA Shelf');
  await page.click('button[type="submit"]');await page.waitForURL('**/closet.html');await page.waitForFunction(()=>document.querySelector('#results-count').textContent.startsWith('11 pieces'));
  const saved=await (await context.request.get(`${origin}/php/filter_closet.php?sort=newest`)).json();
  const record=saved.garments.find(item=>item.garment_name==='QA <test> Garment');assert(record,'Uploaded garment must be saved');uploaded.push(record.image_path);
  assert.equal((await context.request.get(`${origin}/${record.image_path}`)).status(),200,'Uploaded photo must be served');
  assert.match(await page.locator('#closet-grid .product-card').first().textContent(),/QA <test> Garment/);assert.equal(await page.locator('#closet-grid test').count(),0);report.flows.push('Required fields, photo preview, upload, redirect, escaped user content');
  const invalidUpload=await context.request.post(`${origin}/php/upload_garment.php`,{multipart:{garment_name:'Invalid',category:'Top',color_name:'White'}});assert.equal(invalidUpload.status(),400);
  const badPhoto=await context.request.post(`${origin}/php/upload_garment.php`,{multipart:{garment_name:'Invalid',category:'Top',color_name:'White',color_family:'Neutral',fabric:'Cotton',occasion:'Casual',shelf_location:'QA Shelf',garment_photo:{name:'bad.jpg',mimeType:'image/jpeg',buffer:Buffer.from('not an image')}}});assert.equal(badPhoto.status(),400);report.flows.push('Server-side required fields and file type validation');
  await page.goto(`${origin}/index.html`);await page.locator('#most-loved-grid .product-card').first().waitFor();assert.equal(await page.locator('#stat-total').textContent(),'11');
  await page.locator('.transcript summary').click();assert(await page.locator('.transcript').getAttribute('open')!==null);
  await page.waitForFunction(()=>document.querySelector('video').readyState>=1);
  const media=await page.locator('video').evaluate(video=>({duration:video.duration,error:video.error?.message,tracks:video.textTracks.length}));assert(!media.error);assert(media.tracks>0);assert(Number.isFinite(media.duration) && media.duration>=27.5 && media.duration<30,'Tutorial must match the 28-second captions');report.media=media;report.flows.push('Live dashboard totals, 28-second guide, video captions, transcript disclosure');
  assert.deepEqual(consoleErrors,[]);report.consoleErrors=consoleErrors;
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  const violations=report.accessibility.flatMap(page=>page.violations);console.log(JSON.stringify({layoutChecks:report.layouts.length,accessibilityViolations:violations.length,flows:report.flows},null,2));
  assert.equal(violations.length,0,'Accessibility violations; see qa/report.json');
})().catch(error=>{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({...report,error:error.stack},null,2));console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();try{const data=await(await fetch(`${origin}/php/filter_closet.php`)).json();for(const item of data.garments||[])if(item.garment_name==='QA <test> Garment')uploaded.push(item.image_path);}catch{}server?.kill();/* Keep disposable test DB in OS temp for debugging. */});
