// Tworzy public/grupa.html – kopię aplikacji z podglądem linku dla zaproszeń do GRUPY (/g/…), zamiast podglądu dropa.
import fs from "fs";
let s = fs.readFileSync("public/index.html", "utf8");
const R = [
  [/<title>[^<]*<\/title>/, "<title>Squad – dołącz do ekipy</title>"],
  [/(<meta property="og:title" content=")[^"]*/, "$1👋 Zaproszenie do ekipy na Squad"],
  [/(<meta property="og:description" content=")[^"]*/, "$1Twoi znajomi mają stałą ekipę z czatem. Kliknij i dołącz – bez instalowania."],
  [/zaproszenie-v5\.jpg/g, "zaproszenie-grupa-v3.jpg"],
  [/(<meta property="og:image:alt" content=")[^"]*/, "$1SQUAD – zaproszenie do ekipy"],
];
for (const [a, b] of R) s = s.replace(a, b);
fs.writeFileSync("public/grupa.html", s);
console.log("grupa.html gotowe");
