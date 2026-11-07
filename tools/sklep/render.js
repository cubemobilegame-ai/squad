const {chromium}=require('playwright');const fs=require('fs');(async()=>{const b=await chromium.launch();
const fl=fs.readdirSync('html').filter(f=>f.endsWith('.html'));
for(const f of fl){const [l,...r]=f.replace('.html','').split('-');const name=r.join('-');const fg=name.startsWith('grafika');const p=await b.newPage({viewport:fg?{width:1024,height:500}:{width:1080,height:1920}});
  await p.goto('file://'+process.cwd()+'/html/'+f);await p.waitForTimeout(400);fs.mkdirSync('out/'+l,{recursive:true});await p.screenshot({path:`out/${l}/${name}.png`});await p.close()}
await b.close();console.log('wyrenderowano',fl.length)})();
