const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {docker,sql,photoExists,webRoot,root,base}=require('./driver.cjs');
const report={checks:[]};
const output=path.join(root,'qa/php');fs.mkdirSync(output,{recursive:true});
let browser;
async function check(name,fn){await fn();report.checks.push(name);console.log('PASS '+name);}
async function api(route,options={},status=200) {
  const response=await fetch(base+'/php/'+route,options);
  const text=await response.text();
  assert.equal(response.status,status,route+': '+text.slice(0,500));
  assert.match(response.headers.get('content-type'),/application\/json/);
  assert.match(response.headers.get('cache-control'),/no-store/);
  let data;try{data=JSON.parse(text);}catch{throw Error(route+' did not return JSON: '+text.slice(0,500));}
  assert.equal(data.status,status===200?'success':'error');
  if(status!==200)assert(data.message);
  return data;
}
const post=body=>({method:'POST',body:new URLSearchParams(body)});
const remove=(id,status=200)=>api('delete_garment.php',post({garment_id:String(id)}),status);
const fields={garment_name:'PHP API garment',category:'Top',color_family:'Neutral',color_name:'White',fabric:'Cotton',occasion:'Casual',shelf_location:'Test shelf'};
let jpeg,png,webp;
async function upload(overrides={},photo=jpeg,status=200,filename='photo.jpg',mime='image/jpeg') {
  const body=new FormData();for(const [key,value] of Object.entries({...fields,...overrides}))if(value!==null)body.append(key,value);
  if(photo)body.append('garment_photo',new Blob([photo],{type:mime}),filename);
  return api('upload_garment.php',{method:'POST',body},status);
}
const fileCount=()=>Number(docker(['exec','-T','web','php','-r',`echo count(glob('${webRoot}/uploads/garment_*'));`]));
(async()=>{
  report.runtime={php:docker(['exec','-T','web','php','-r','echo PHP_VERSION;']),mysql:sql('SELECT VERSION();'),sqlMode:sql('SELECT @@sql_mode;')};
  browser=await chromium.launch({executablePath:process.env.CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
  const context=await browser.newContext();const page=await context.newPage();
  [jpeg,png,webp]=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=16;canvas.getContext('2d').fillRect(0,0,16,16);return ['jpeg','png','webp'].map(type=>canvas.toDataURL('image/'+type).split(',')[1]);}).then(images=>images.map(value=>Buffer.from(value,'base64')));

  await check('Seed import, numeric API values, wear totals, all filters and all sorts',async()=>{
    const all=await api('filter_closet.php');assert.equal(all.count,10);assert.equal(all.garments.reduce((sum,g)=>sum+g.wear_count,0),18);assert.equal(all.garments[0].id,10);
    for(const [key,value] of [['occasion','Party'],['category','Top'],['color_family','Cool'],['fabric','Denim']]){
      const result=await api('filter_closet.php?'+new URLSearchParams({[key]:value}));assert(result.count>0);assert(result.garments.every(g=>g[key]===value));
    }
    assert.equal((await api('filter_closet.php?occasion=Party&category=Top&color_family=Cool&fabric=Silk')).garments[0].id,9);
    assert.equal((await api('filter_closet.php?fabric='+encodeURIComponent("' OR 1=1 --"))).count,0);
    assert.equal((await api('filter_closet.php?sort=most_worn')).garments[0].id,1);
    const least=await api('filter_closet.php?sort=least_worn');assert(least.garments.slice(0,3).every(g=>g.wear_count===0));
    const stats=await api('get_analytics.php');assert.equal(stats.most_loved[0].id,1);assert.equal(stats.most_loved[0].total_wears,6);
    assert(stats.recently_worn.every((g,i,a)=>!i||a[i-1].last_worn>=g.last_worn));
  });
  await check('HTTP methods, strict IDs, array input and unsupported content types',async()=>{
    for(const route of ['filter_closet.php','get_analytics.php','item_engine.php?id=1'])await api(route,post({}),405);
    for(const route of ['upload_garment.php','log_wear.php','delete_garment.php'])await api(route,{},405);
    for(const id of ['',0,-1,'1abc','1.5','1e0','01','1 OR 1=1','2147483648']){
      await api('item_engine.php?id='+encodeURIComponent(id),{},400);await api('log_wear.php',post({garment_id:id}),400);await remove(id,400);
    }
    for(const route of ['item_engine.php?id[]=1','filter_closet.php?fabric[]=Cotton','filter_closet.php?sort[]=newest','filter_closet.php?fabric=%FF'])await api(route,{},400);
    for(const route of ['log_wear.php','delete_garment.php']){
      await api(route,post({'garment_id[]':'1'}),400);
      await api(route,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"garment_id":1}'},415);
    }
    await api('log_wear.php',post({garment_id:1,'event_note[]':'test'}),400);
    await api('item_engine.php?id=99999',{},404);await api('log_wear.php',post({garment_id:99999}),404);await remove(99999,404);
  });
  await check('Recommendations: exact occasion, neutral compatibility, fallback and exclusions',async()=>{
    const exact=await api('item_engine.php?id=7');assert(exact.recommendations.some(g=>g.id===4));assert(exact.recommendations.every(g=>g.occasion==='Formal'&&g.id!==7));
    const fallback=await api('item_engine.php?id=1');assert(fallback.recommendations.length>0);assert(fallback.recommendations.every(g=>g.id!==1&&['Bottom','Footwear'].includes(g.category)&&g.match_reason.startsWith('Versatile Match')));
    for(const g of fallback.recommendations)assert(['Neutral','Warm'].includes(g.color_family));
  });
  await check('Required fields, enums, lengths, malformed files and 5 MB upload boundary',async()=>{
    for(const field of Object.keys(fields))await upload({[field]:null},jpeg,400);
    for(const [key,value] of [['category','Other'],['color_family','Other'],['garment_name','x'.repeat(101)],['color_name','x'.repeat(51)],['fabric','x'.repeat(51)],['occasion','x'.repeat(51)],['shelf_location','x'.repeat(101)]])await upload({[key]:value},jpeg,400);
    await upload({garment_name:null,'garment_name[]':'x'},jpeg,400);await upload({},null,400);
    await upload({},Buffer.from('not an image'),400);
    await upload({},Buffer.from([255,216,255,224,0,16,74,70,73,70,0]),400);
    const body=new FormData();for(const [key,value] of Object.entries(fields))body.append(key,value);body.append('garment_photo[]',new Blob([jpeg]),'array.jpg');await api('upload_garment.php',{method:'POST',body},400);
    await upload({},Buffer.concat([jpeg,Buffer.alloc(5*1024*1024+1-jpeg.length)]),413);
    await upload({},Buffer.alloc(7*1024*1024),413);
    const max=await upload({},Buffer.concat([jpeg,Buffer.alloc(5*1024*1024-jpeg.length)]));await remove(max.garment_id);
  });
  await check('JPG, PNG and WebP upload, correct MIME extension, alt text, Unicode and escaping',async()=>{
    for(const [photo,extension,mime] of [[jpeg,'jpg','image/jpeg'],[png,'png','image/png'],[webp,'webp','image/webp']]){
      const result=await upload({garment_name:'<script>alert(1)</script> कपड़ा 👗'},photo,200,'incorrect.txt','text/plain');
      const {item}=await api('item_engine.php?id='+result.garment_id);assert(item.image_path.endsWith('.'+extension));assert(item.alt_text.includes('White'));assert(photoExists(path.basename(item.image_path)));
      const response=await fetch(base+'/'+item.image_path);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),new RegExp(mime));
      await page.goto(base+'/item-details.html?id='+result.garment_id);await page.locator('#detail-container:not([hidden])').waitFor();assert.equal(await page.locator('#detail-name script').count(),0);assert.equal(await page.locator('#detail-name').textContent(),'<script>alert(1)</script> कपड़ा 👗');
      await remove(item.id);assert(!photoExists(path.basename(item.image_path)));
    }
    const result=await upload({garment_name:'👗'.repeat(100),color_name:'क'.repeat(50),fabric:'x'.repeat(50),occasion:'x'.repeat(50),shelf_location:'x'.repeat(100)});
    const {item}=await api('item_engine.php?id='+result.garment_id);assert.equal([...item.garment_name].length,100);assert([...item.alt_text].length<=255);await remove(item.id);
  });
  await check('Wear notes, India date, concurrent writes and deletion atomicity',async()=>{
    const result=await upload();const id=result.garment_id;
    await api('log_wear.php',post({garment_id:id,event_note:'x'.repeat(101)}),400);
    await api('log_wear.php',post({garment_id:id,event_note:'👗'.repeat(100)}));
    await Promise.all(Array.from({length:8},()=>api('log_wear.php',post({garment_id:id,event_note:'  '}))));
    const {item}=await api('item_engine.php?id='+id);assert.equal(item.times_worn,9);assert.equal(item.last_worn,new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
    assert.equal(sql(`SELECT COUNT(*) FROM wear_history WHERE garment_id=${id} AND event_note='Daily Wear'`),'8');
    const results=await Promise.all([1,2].map(()=>fetch(base+'/php/delete_garment.php',post({garment_id:id}))));assert.deepEqual(results.map(r=>r.status).sort(),[200,404]);assert.equal(sql(`SELECT COUNT(*) FROM wear_history WHERE garment_id=${id}`),'0');
  });
  await check('Failed inserts and deletes roll back; uploaded files do not leak',async()=>{
    let count=fileCount();sql("CREATE TRIGGER qa_fail_insert BEFORE INSERT ON garments FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='QA forced failure'");
    try{await upload({},jpeg,500);assert.equal(fileCount(),count);}finally{sql('DROP TRIGGER qa_fail_insert');}
    sql("CREATE TRIGGER qa_fail_delete BEFORE DELETE ON garments FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='QA forced failure'");
    try{await remove(1,500);assert.equal((await api('item_engine.php?id=1')).item.times_worn,6);assert.equal(sql('SELECT COUNT(*) FROM wear_history WHERE garment_id=1'),'6');}finally{sql('DROP TRIGGER qa_fail_delete');}
    sql("CREATE TRIGGER qa_fail_wear BEFORE INSERT ON wear_history FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='QA forced failure'");
    try{await api('log_wear.php',post({garment_id:1}),500);assert.equal((await api('item_engine.php?id=1')).item.times_worn,6);}finally{sql('DROP TRIGGER qa_fail_wear');}
    docker(['exec','-T','web','chmod','0555',webRoot+'/uploads']);
    try{await upload({},jpeg,500);assert.equal(fileCount(),count);}finally{docker(['exec','-T','web','chmod','0755',webRoot+'/uploads']);}
  });
  await check('Database outage returns JSON and browser error states; recovery works',async()=>{
    docker(['stop','db']);
    try{
      for(const route of ['get_analytics.php','filter_closet.php','item_engine.php?id=1'])await api(route,{},503);
      await api('log_wear.php',post({garment_id:1}),503);await remove(1,503);await upload({},jpeg,503);
      await page.goto(base+'/index.html');await page.locator('#dashboard-error:not([hidden])').waitFor();
      await page.goto(base+'/closet.html');await page.locator('#closet-error:not([hidden])').waitFor();assert.equal(await page.locator('.product-card').count(),0);
      await page.goto(base+'/item-details.html?id=1');await page.locator('#error-state:not([hidden])').waitFor();
    }finally{docker(['start','--wait','db']);}
    assert.equal((await api('filter_closet.php')).count,10);
  });
  await check('Deleting a malicious image path cannot remove files outside uploads',async()=>{
    const result=await upload();const id=result.garment_id;const original=(await api('item_engine.php?id='+id)).item.image_path;
    sql(`UPDATE garments SET image_path='../README.md' WHERE id=${id}`);await remove(id);assert(fs.existsSync(path.join(root,'README.md')));assert(photoExists(path.basename(original)));
  });
  report.status='passed';console.log(JSON.stringify(report,null,2));
})().catch(error=>{report.error=error.stack;report.status='failed';console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();fs.writeFileSync(path.join(output,'api-report.json'),JSON.stringify(report,null,2));});
