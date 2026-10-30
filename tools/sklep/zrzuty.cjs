// Robi surowe zrzuty aplikacji (tryb demo) w 8 językach – do grafik Sklepu Play.
// Użycie: node tools/sklep/zrzuty.cjs http://localhost:8766 out/
const {chromium,devices}=require('playwright');const [BASE,OUT]=process.argv.slice(2);const fs=require('fs');fs.mkdirSync(OUT,{recursive:true});
const LOC={pl:'pl-PL',en:'en-US',es:'es-ES',de:'de-DE',fr:'fr-FR',it:'it-IT',cs:'cs-CZ',uk:'uk-UA'};
(async()=>{const b=await chromium.launch();
for(const [l,loc] of Object.entries(LOC)){
  const ctx=async()=>{const c=await b.newContext({...devices['iPhone 13'],locale:loc});await c.addInitScript(()=>{try{sessionStorage.setItem('introSeen','1');localStorage.setItem('avatar','5');localStorage.setItem('insShown','1')}catch(e){}});return c};
  const hide=async p=>p.addStyleTag({content:'#demo{display:none!important}.scr{padding-top:calc(16px + env(safe-area-inset-top,0px))!important}'});
  let c=await ctx(),p=await c.newPage();
  await p.goto(BASE+'/?demo');await p.waitForTimeout(700);await p.click('#demo button:nth-of-type(1)');await p.waitForTimeout(600);await p.click('#ps');await p.waitForTimeout(900);await hide(p);
  const shot=async n=>{await p.waitForTimeout(900);await p.screenshot({path:`${OUT}/${l}-${n}.png`})};
  await p.evaluate(()=>go('/'));await shot('1');
  await p.evaluate(()=>go('/c/DEMO1'));await p.waitForTimeout(15500);await shot('3');
  await p.evaluate(()=>go('/me'));await p.waitForTimeout(500);await p.click('#kmk');await p.waitForTimeout(500);await p.click('#kac [data-v="1"]');await p.click('#khr [data-v="5"]');await p.click('#kst [data-v="6"]');await shot('4');
  await p.evaluate(()=>document.querySelectorAll('.sheetbg').forEach(e=>e.remove()));
  await p.evaluate(()=>go('/d/DEMO1'));await p.waitForTimeout(700);await p.click('#sh');await p.waitForTimeout(2600);await shot('5');
  await p.evaluate(()=>document.querySelectorAll('.sheetbg').forEach(e=>e.remove()));
  await p.evaluate(()=>go('/d/DEMO4'));await p.waitForTimeout(1200);await p.click('#col');await p.waitForTimeout(3500);await shot('6');
  await c.close();
  c=await ctx();p=await c.newPage();await p.goto(BASE+'/?demo');await p.waitForTimeout(700);await p.click('#demo button:nth-of-type(2)');await p.waitForTimeout(1200);await hide(p);await shot('2');await c.close();
  console.log('ok',l)}
await b.close()})();
