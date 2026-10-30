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
  splashScreenFadeOutDuration: 300, enableSiteSettingsShortcut: false, signingKey: { path: "../upload.jks", alias: "squad" },
});
if (typeof m.validate === "function") { const err = m.validate(); if (err) { console.error("Błąd manifestu:", err); process.exit(1); } }
await new TwaGenerator().createTwaProject("build-android", m, new ConsoleLog("squad"));
fs.writeFileSync("build-android/twa-manifest.json", JSON.stringify(m.toJson ? m.toJson() : m, null, 2));
console.log("Projekt Androida gotowy:", app.packageId, m.appVersionName, "(" + m.appVersionCode + ")");
