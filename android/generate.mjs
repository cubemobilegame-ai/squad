// Generuje projekt Androida (Trusted Web Activity) z aplikacji webowej SQUAD – uruchamiane przez GitHub Actions.
import fs from "fs";
import core from "@bubblewrap/core";
const { TwaManifest, TwaGenerator, ConsoleLog } = core;
const app = JSON.parse(fs.readFileSync("android/app.json", "utf8"));
const web = JSON.parse(fs.readFileSync("public/manifest.json", "utf8"));
const m = TwaManifest.fromWebManifestJson(new URL(`https://${app.host}/manifest.json`), web);
Object.assign(m, {
  packageId: app.packageId, name: app.name, launcherName: app.launcherName, host: app.host, startUrl: "/",
  iconUrl: "http://localhost:8099/icon-512.png", maskableIconUrl: "http://localhost:8099/icon-maskable-512.png",
  appVersionCode: parseInt(process.env.VERSION_CODE || "1", 10), appVersionName: fs.readFileSync("android/version.txt", "utf8").trim(),
  enableNotifications: true, orientation: "portrait", fallbackType: "customtabs", display: "standalone",
  splashScreenFadeOutDuration: 0, minSdkVersion: 24, enableSiteSettingsShortcut: true, signingKey: { path: "../upload.jks", alias: "squad" },
});
if (typeof m.validate === "function") { const err = m.validate(); if (err) { console.error("Błąd manifestu:", err); process.exit(1); } }
await new TwaGenerator().createTwaProject("build-android", m, new ConsoleLog("squad"));

// Nazwy aplikacji w językach (pod ikoną zostaje krótkie „Squad”, pełna nazwa w ustawieniach i ostatnich aplikacjach)
const NAMES = { pl: "Squad – wspólne wypady", en: "Squad – hangouts together", es: "Squad – planes en grupo", de: "Squad – gemeinsam unterwegs",
  fr: "Squad – sorties entre potes", it: "Squad – uscite insieme", cs: "Squad – společné akce", uk: "Squad – спільні зустрічі" };
const resDir = "build-android/app/src/main/res", base = fs.readFileSync(`${resDir}/values/strings.xml`, "utf8");
const keys = [...base.matchAll(/<string name="([^"]+)"[^>]*>([^<]*)<\/string>/g)].filter(([, , v]) => v.trim() === app.name).map(([, k]) => k);
console.log("Klucze nazwy aplikacji:", keys.join(", ") || "(brak)");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/'/g, "\\'");
for (const [l, n] of Object.entries(NAMES)) {
  fs.mkdirSync(`${resDir}/values-${l}`, { recursive: true });
  fs.writeFileSync(`${resDir}/values-${l}/strings.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${keys.map((k) => `  <string name="${k}">${esc(n)}</string>`).join("\n")}\n</resources>\n`);
}

// Bez ikony na ekranie startowym Androida: czarny splash (aplikacja i tak pokazuje własne intro)
const black = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4XmPk5hZiwAeY8MoyMAwTBQAyMQA4OZ42HAAAAABJRU5ErkJggg==", "base64");
for (const d of fs.readdirSync(resDir)) if (d.startsWith("drawable")) for (const f of fs.readdirSync(`${resDir}/${d}`)) if (/^splash\.(png|webp)$/.test(f)) { fs.writeFileSync(`${resDir}/${d}/${f.replace(/\.webp$/, ".png")}`, black); if (f.endsWith(".webp")) fs.unlinkSync(`${resDir}/${d}/${f}`); console.log("splash wyczyszczony:", d); }
fs.writeFileSync("build-android/twa-manifest.json", JSON.stringify(m.toJson ? m.toJson() : m, null, 2));
console.log("Projekt Androida gotowy:", app.packageId, m.appVersionName, "(" + m.appVersionCode + ")");
