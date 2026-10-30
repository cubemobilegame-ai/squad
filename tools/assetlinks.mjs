// Tworzy public/.well-known/assetlinks.json – dzięki temu linki squad otwierają się w aplikacji, a nie w przeglądarce.
// Odciski SHA-256 bierze z sekretu ANDROID_SHA256 (kilka rozdziel przecinkiem: klucz przesyłania + klucz z Google Play).
import fs from "fs";
const fps = (process.env.FP || "").split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
const pkg = JSON.parse(fs.readFileSync("android/app.json", "utf8")).packageId;
const out = fps.length ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: fps } }] : [];
fs.mkdirSync("public/.well-known", { recursive: true });
fs.writeFileSync("public/.well-known/assetlinks.json", JSON.stringify(out, null, 2));
console.log(fps.length ? `assetlinks: ${fps.length} odcisk(i) dla ${pkg}` : "assetlinks: brak sekretu ANDROID_SHA256 – pomijam (dodasz po pierwszym buildzie Androida)");
