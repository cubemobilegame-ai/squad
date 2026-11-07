// Surowe zrzuty aplikacji (tryb demo, 8 języków) do grafik Sklepu Play – wersja 2 (nowy wygląd).
// Użycie: node tools/sklep/zrzuty2.cjs http://localhost:8766 out/
const {chromium,devices}=require('playwright');const [BASE,OUT]=process.argv.slice(2);const fs=require('fs');fs.mkdirSync(OUT,{recursive:true});
const LOC={pl:'pl-PL',en:'en-US',es:'es-ES',de:'de-DE',fr:'fr-FR',it:'it-IT',cs:'cs-CZ',uk:'uk-UA'};
const only=process.env.LANGS?process.env.LANGS.split(','):Object.keys(LOC);
(async()=>{const b=await chromium.launch();
for(const l of only){const loc=LOC[l];
  const ctx=async()=>{const c=await b.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},deviceScaleFactor:3,locale:loc,geolocation:{latitude:52.2297,longitude:21.0122},permissions:['geolocation']});
    await c.clock.setFixedTime(new Date('2026-11-07T17:42:00'));
    await c.addInitScript(()=>{try{sessionStorage.setItem('introSeen','1');localStorage.setItem('avatar','5');localStorage.setItem('insShown','1')}catch(e){}});return c};
  const hide=p=>p.addStyleTag({content:'#demo{display:none!important}:root{--dh:0px!important}body.demo .scr{padding-top:calc(56px + env(safe-area-inset-top,0px))!important}body.demo .chs{height:100dvh!important}body.demo .scr.chs{padding-top:0!important}.toast,#toast{display:none!important}'});
  const shot=async(p,n)=>{await p.waitForTimeout(900);await p.evaluate(()=>scrollTo(0,0)).catch(()=>{});await p.waitForTimeout(200);await p.screenshot({path:`${OUT}/${l}-${n}.png`})};
  let c=await ctx(),p=await c.newPage();
  await p.goto(BASE+'/?demo');await p.waitForTimeout(900);await p.click('#demo button:nth-of-type(1)');await p.waitForTimeout(700);await p.check('#age').catch(()=>{});await p.click('#ps').catch(()=>{});await p.waitForTimeout(900);await hide(p);
  await p.evaluate(()=>go('/'));await shot(p,'1');
  await p.evaluate(()=>go('/c/DEMO1'));await p.waitForTimeout(15500);await p.evaluate(()=>window.__chatEnd&&window.__chatEnd());await p.waitForTimeout(600);await p.screenshot({path:`${OUT}/${l}-3.png`});
  await p.evaluate(()=>go('/new'));await p.waitForTimeout(900);await p.click('[data-c="club"]').catch(()=>{});await p.fill('#t',{pl:'Piątek w klubie',en:'Friday at the club',es:'Viernes en el club',de:'Freitag im Club',fr:'Vendredi en boîte',it:'Venerdì in disco',cs:'Pátek v klubu',uk:'Пʼятниця в клубі'}[l]).catch(()=>{});await shot(p,'4');
  await p.evaluate(()=>go('/'));await p.waitForTimeout(700);await p.click('#tb button[data-t="pub"]');await p.waitForTimeout(500);
  await p.selectOption('#by','2004').catch(()=>{});await p.click('#byok').catch(()=>{});await p.waitForTimeout(400);await p.check('#prc').catch(()=>{});await p.click('#prgo').catch(()=>{});await p.waitForTimeout(2200);await shot(p,'5');
  await p.evaluate(()=>go('/chats'));await p.waitForTimeout(1200);await shot(p,'6');
  await c.close();
  c=await ctx();p=await c.newPage();await p.goto(BASE+'/?demo');await p.waitForTimeout(900);await p.click('#demo button:nth-of-type(2)');await p.waitForTimeout(1600);await hide(p);await p.evaluate(()=>{const c=document.getElementById('crew'),r=document.getElementById('rpl');if(c&&r)r.after(c)});await shot(p,'2');await c.close();
  console.log('ok',l)}
await b.close()})();
