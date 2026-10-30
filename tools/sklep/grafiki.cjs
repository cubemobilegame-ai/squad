// Składa grafiki do Sklepu Play: 6 zrzutów 1080×1920 + grafika 1024×500 dla każdego języka.
// Użycie (serwer w katalogu repo): node tools/sklep/grafiki.cjs http://localhost:8767 <katalog_surowych_zrzutów> sklep/play
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');const [BASE,RAW,OUT]=process.argv.slice(2);
const TX=JSON.parse(fs.readFileSync(path.join(__dirname,'teksty.json'),'utf8'));
(async()=>{const b=await chromium.launch();
for(const l of Object.keys(TX)){const dir=path.join(OUT,l);fs.mkdirSync(dir,{recursive:true});
  for(let i=1;i<=6;i++){const p=await b.newPage({viewport:{width:1080,height:1920}});const img='data:image/png;base64,'+fs.readFileSync(path.join(RAW,`${l}-${i}.png`)).toString('base64');
    await p.goto(`${BASE}/tools/sklep/szablon.html?i=${i}&t=${encodeURIComponent(JSON.stringify(TX[l].s[i-1]))}`);await p.evaluate(u=>{document.getElementById('sc').style.backgroundImage=`url(${u})`},img);
    await p.waitForTimeout(700);await p.screenshot({path:path.join(dir,`zrzut-${i}.png`)});await p.close()}
  const p=await b.newPage({viewport:{width:1024,height:500}});await p.goto(`${BASE}/tools/sklep/szablon.html?f=1&i=1&t=${encodeURIComponent(JSON.stringify(TX[l].f))}`);await p.waitForTimeout(700);await p.screenshot({path:path.join(dir,'grafika-1024x500.png')});await p.close();
  console.log('ok',l)}
await b.close()})();
