// Run the real Apache/PHP/MySQL suite; only the dedicated QA volumes are reset.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {docker,reset,photos,sql,webRoot,root,base}=require('./driver.cjs');
const output=path.join(root,'qa/php');fs.mkdirSync(output,{recursive:true});
const report={started:new Date().toISOString(),suites:[]};
const run=file=>{
  execFileSync(process.execPath,[path.join(root,file)],{cwd:root,windowsHide:true,stdio:'inherit',env:{...process.env,TEST_BASE_URL:base,QA_OUTPUT:output}});
  report.suites.push(file);
};
(async()=>{
  docker(['up','-d','--build','--wait','--wait-timeout','180'],{stdio:'inherit'});
  photos();
  report.runtime={php:docker(['exec','-T','web','php','-r','echo PHP_VERSION;']),mysql:sql('SELECT VERSION();'),apache:docker(['exec','-T','web','apache2','-v'])};
  report.syntax=[];
  for(const file of fs.readdirSync(path.join(root,'php')).filter(f=>f.endsWith('.php'))) {
    docker(['exec','-T','web','php','-l',webRoot+'/php/'+file]);report.syntax.push(file);
  }
  reset();run('tests/php/api.cjs');
  reset();run('tests/browser.cjs');
  reset();run('tests/deletion.cjs');
  docker(['restart','db','web']);docker(['up','-d','--wait','--wait-timeout','90']);
  assert.equal((await(await fetch(base+'/php/filter_closet.php')).json()).count,0);
  assert.equal(sql('SELECT COUNT(*) FROM wear_history'),'0');
  const analytics=await(await fetch(base+'/php/get_analytics.php')).json();assert.deepEqual(analytics.most_loved,[]);assert.deepEqual(analytics.recently_worn,[]);
  report.emptyWardrobeSurvivesDatabaseRestart=true;
  report.status='passed';
})().catch(error=>{report.status='failed';report.error=error.stack;console.error(error);process.exitCode=1;}).finally(()=>{
  try{fs.writeFileSync(path.join(output,'server.log'),docker(['logs','--no-color','--since',report.started]));}catch{}
  try{docker(['down','--volumes'],{stdio:'inherit'});}catch(error){report.cleanupError=error.message;process.exitCode=1;}
  report.finished=new Date().toISOString();fs.writeFileSync(path.join(output,'runtime-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
});
