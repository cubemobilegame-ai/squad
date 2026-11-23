// Tworzy public/kontakt.html – kopię aplikacji z podglądem linku dla zaproszeń do KONTAKTÓW (/k/…), zamiast podglądu dropa.
import fs from "fs";
let s = fs.readFileSync("public/index.html", "utf8");
const R = [
  [/<title>[^<]*<\/title>/, "<title>Squad – dodaj mnie do kontaktów</title>"],
  [/(<meta property="og:title" content=")[^"]*/, "$1👋 Dodaj mnie do kontaktów w Squad"],
  [/(<meta property="og:description" content=")[^"]*/, "$1Łatwiej zaprosimy się na wypady i do grup. Kliknij i dodaj mnie – bez instalowania."],
  [/zaproszenie-v9\.jpg/g, "zaproszenie-kontakt-v5.jpg"],
  [/(<meta property="og:image:alt" content=")[^"]*/, "$1Squad – zaproszenie do kontaktów"],
];
for (const [a, b] of R) s = s.replace(a, b);
fs.writeFileSync("public/kontakt.html", s);
console.log("kontakt.html gotowe");
