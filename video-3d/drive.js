const {chromium}=require('playwright'); const fs=require('fs'); const {spawn}=require('child_process');
const mode=process.argv[2];
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:720,height:1280}});
  p.on('console',m=>console.log('[page]',m.text())); p.on('pageerror',e=>console.log('[err]',e.message));
  await p.goto('http://localhost:8123/index.html'); await p.waitForFunction(()=>window.READY===true,null,{timeout:300000});
  const total=await p.evaluate(()=>window.TOTAL); console.log('total',total);
  if(mode==='stills'){ const ts=process.argv.slice(3).map(Number);
    for(const t of ts){ const t0=Date.now(); const d=await p.evaluate(t=>window.renderAt(t),t); fs.writeFileSync(`still_${t}.jpg`,Buffer.from(d.split(',')[1],'base64')); console.log('still',t,Date.now()-t0,'ms'); }
  } else {
    const N=Math.round(total*30); const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-c:v','mjpeg','-r','30','-i','-','-c:v','libx264','-crf','19','-preset','medium','-pix_fmt','yuv420p','video.mp4'],{stdio:['pipe','inherit','inherit']});
    const t0=Date.now();
    for(let i=0;i<N;i++){ const d=await p.evaluate(i=>window.renderFrame(i),i); if(!ff.stdin.write(Buffer.from(d.split(',')[1],'base64'))) await new Promise(r=>ff.stdin.once('drain',r)); if(i%60==0) console.log('frame',i,'/',N,((Date.now()-t0)/1000).toFixed(0)+'s'); }
    ff.stdin.end(); await new Promise(r=>ff.on('close',r)); console.log('done');
  }
  await b.close();
})();
