// Encode the locally drawn tutorial with Chromium's MediaRecorder.
// Requires the same Playwright installation as tests/browser.cjs and a running demo server.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
  try{
    const page=await browser.newPage();await page.goto('http://127.0.0.1:8001');
    const result=await page.evaluate(async()=>{
      const mime=['video/mp4;codecs=avc1.42001E','video/mp4','video/webm;codecs=vp9'].find(type=>MediaRecorder.isTypeSupported(type));
      if(!mime)throw Error('No supported video recording format');
      const frames=await Promise.all(Array.from({length:6},(_,i)=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=`/qa/guide-frames/frame-${i}.png`;})));
      const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d');
      let current=0;ctx.drawImage(frames[0],0,0);
      const stream=canvas.captureStream(12);const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1400000});const chunks=[];
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      const completed=new Promise(resolve=>recorder.onstop=resolve);recorder.start();
      const paint=setInterval(()=>ctx.drawImage(frames[current],0,0),1000/12);
      for(const [i,duration] of [4000,4000,5000,5000,5000,5000].entries()){current=i;await new Promise(resolve=>setTimeout(resolve,duration));}
      recorder.stop();clearInterval(paint);await completed;stream.getTracks().forEach(track=>track.stop());
      return {mime,bytes:Array.from(new Uint8Array(await new Blob(chunks,{type:mime}).arrayBuffer()))};
    });
    const extension=result.mime.includes('mp4')?'mp4':'webm';
    const file=path.resolve(__dirname,'..','media',`wardrobe-guide.${extension}`);fs.writeFileSync(file,Buffer.from(result.bytes));
    console.log(JSON.stringify({file,mime:result.mime,bytes:result.bytes.length}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
