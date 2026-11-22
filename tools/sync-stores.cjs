// Pobrania ze sklepów -> Firestore adm/store (czyta panel /admin). Domyślnie tylko podgląd; zapis z WRITE=1.
// Apple: App Store Connect API (raport sprzedaży DAILY). Google: raporty statystyk z bucketu Play Console (CSV).
const admin = require("firebase-admin"), crypto = require("crypto"), zlib = require("zlib"), cfg = require("./store.json");
admin.initializeApp();
const PKG = "com.cubemobilegames.squad", WRITE = process.env.WRITE === "1", DAYS = +process.env.DAYS || 90;
const iso = (d) => d.toISOString().slice(0, 10), out = [];
const log = (s) => { out.push(s); console.log(s); };

async function apple() {
  const { ASC_KEY_ID: kid, ASC_ISSUER_ID: iss, ASC_KEY_P8: key } = process.env;
  if (!kid || !iss || !key) return log("Apple: brak sekretów ASC_*");
  const b64 = (x) => Buffer.from(x).toString("base64url"), now = Math.floor(Date.now() / 1e3);
  const head = b64(JSON.stringify({ alg: "ES256", kid, typ: "JWT" })) + "." + b64(JSON.stringify({ iss, iat: now, exp: now + 1000, aud: "appstoreconnect-v1" }));
  const jwt = head + "." + crypto.sign("sha256", Buffer.from(head), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
  const daily = {}; let total = 0, err = 0, last = "";
  for (let i = 2; i <= DAYS; i++) {
    const day = iso(new Date(Date.now() - i * 864e5));
    const u = "https://api.appstoreconnect.apple.com/v1/salesReports?" + new URLSearchParams({ "filter[frequency]": "DAILY", "filter[reportType]": "SALES", "filter[reportSubType]": "SUMMARY", "filter[vendorNumber]": cfg.appleVendor, "filter[reportDate]": day, "filter[version]": "1_1" });
    const r = await fetch(u, { headers: { Authorization: "Bearer " + jwt, Accept: "application/a-gzip" } });
    if (r.status === 404) continue; // brak raportu tego dnia
    if (!r.ok) { err++; last = r.status + " " + (await r.text()).slice(0, 160); if (r.status === 401 || r.status === 403) break; continue; }
    const rows = zlib.gunzipSync(Buffer.from(await r.arrayBuffer())).toString("utf8").trim().split("\n"), h = rows[0].split("\t");
    const ix = (n) => h.indexOf(n);
    for (const line of rows.slice(1)) {
      const c = line.split("\t"), type = c[ix("Product Type Identifier")], units = +c[ix("Units")] || 0, title = c[ix("Title")] || "";
      if (/squad/i.test(title) && ["1", "1F", "1T", "F1"].includes(type)) { daily[day] = (daily[day] || 0) + units; total += units; }
    }
  }
  if (err && !total) log("Apple: błąd – " + last); else log(`Apple: pobrania (App Store, ostatnie ${DAYS} dni): ${total}; dni z danymi: ${Object.keys(daily).length}${err ? "; błędy: " + err : ""}`);
  return err && !total ? null : { total, daily };
}

async function google() {
  const { GoogleAuth } = require("google-auth-library");
  const tok = await new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/devstorage.read_only"] }).getAccessToken();
  const H = { Authorization: "Bearer " + tok }, B = cfg.playBucket, daily = {}; let total = 0, files = 0;
  const l = await fetch(`https://storage.googleapis.com/storage/v1/b/${B}/o?prefix=${encodeURIComponent("stats/installs/installs_" + PKG + "_")}&maxResults=200`, { headers: H });
  if (!l.ok) { log("Google: błąd dostępu do bucketu – " + l.status + " " + (await l.text()).slice(0, 200)); return null; }
  for (const o of ((await l.json()).items || []).filter((x) => /_overview\.csv$/.test(x.name))) {
    const r = await fetch(`https://storage.googleapis.com/storage/v1/b/${B}/o/${encodeURIComponent(o.name)}?alt=media`, { headers: H });
    if (!r.ok) continue; files++;
    const buf = Buffer.from(await r.arrayBuffer()), txt = (buf[0] === 0xff && buf[1] === 0xfe ? buf.toString("utf16le") : buf.toString("utf8")).replace(/^﻿/, "");
    const rows = txt.trim().split(/\r?\n/), h = rows[0].split(",").map((x) => x.trim()), di = h.indexOf("Date"), ii = h.indexOf("Daily Device Installs");
    if (di < 0 || ii < 0) { log("Google: nieoczekiwane kolumny: " + h.join("|")); continue; }
    for (const line of rows.slice(1)) { const c = line.split(","), n = +c[ii] || 0; if (n) { daily[c[di]] = (daily[c[di]] || 0) + n; total += n; } }
  }
  log(`Google: instalacje urządzeń (Daily Device Installs), plików: ${files}: ${total}`);
  return files ? { total, daily } : null;
}

(async () => {
  const a = await apple().catch((e) => (log("Apple: wyjątek – " + e.message), null)), g = await google().catch((e) => (log("Google: wyjątek – " + e.message), null));
  if (WRITE && (a || g)) {
    const d = { at: admin.firestore.FieldValue.serverTimestamp() }; if (a) d.ios = a; if (g) d.android = g;
    await admin.firestore().doc("adm/store").set(d, { merge: true }); log("ZAPISANO adm/store");
  } else log("PODGLĄD – nic nie zapisano.");
  console.log("::notice title=Pobrania ze sklepów::" + out.join("%0A")); process.exit(0);
})().catch((e) => { console.log("::error::" + e.message); process.exit(1); });
