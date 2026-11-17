// Kasuje stare wersje Firebase Hosting (każdy deploy zostawia kopię, przez co rośnie pamięć). Zostawia najnowsze KEEP.
import fs from "fs";import crypto from "crypto";
const KEEP=+(process.env.KEEP||5);
const sa=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,"utf8"));
const b64=o=>Buffer.from(typeof o==="string"?o:JSON.stringify(o)).toString("base64url");
const now=Math.floor(Date.now()/1e3);
const head=b64({alg:"RS256",typ:"JWT"}),body=b64({iss:sa.client_email,scope:"https://www.googleapis.com/auth/cloud-platform",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3000});
const sig=crypto.sign("RSA-SHA256",Buffer.from(head+"."+body),sa.private_key).toString("base64url");
const tr=await (await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion="+head+"."+body+"."+sig})).json();
if(!tr.access_token){console.log("Brak tokenu:",JSON.stringify(tr));process.exit(0)}
const H={Authorization:"Bearer "+tr.access_token};
const site=process.env.SITE||sa.project_id;
const A="https://firebasehosting.googleapis.com/v1beta1/";
let all=[],pt="";
do{const r=await (await fetch(`${A}sites/${site}/versions?pageSize=200${pt?"&pageToken="+pt:""}`,{headers:H})).json();if(r.error){console.log("Lista:",JSON.stringify(r.error));process.exit(0)}all.push(...(r.versions||[]));pt=r.nextPageToken||""}while(pt);
all=all.filter(v=>v.status!=="DELETED").sort((a,b)=>b.createTime.localeCompare(a.createTime));
console.log("Wersji:",all.length,"| zostawiam:",KEEP);
let ok=0,bad=0;
for(const v of all.slice(KEEP)){const r=await fetch(A+v.name,{method:"DELETE",headers:H});if(r.ok)ok++;else{bad++;if(bad<4)console.log("Nie usunięto",v.name,r.status,(await r.text()).slice(0,160))}}
console.log("Usunięto:",ok,"| pominięto:",bad);
