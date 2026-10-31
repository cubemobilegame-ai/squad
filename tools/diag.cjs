// Diagnostyka powiadomień: ostatnie zdarzenia serwera (pushlog) i telefony z włączonymi powiadomieniami.
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
(async () => {
  const log = await db.collection("pushlog").orderBy("at", "desc").limit(15).get();
  console.log(`::notice title=Zdarzenia serwera::${log.size}`);
  log.docs.forEach((d) => { const x = d.data(); console.log(`::notice title=${x.at} ${x.kind}::od ${x.from} · wysłane ${x.sent} · odbiorcy ${x.to} · telefony ${x.toks} · ${x.errs || x.err || ""}`); });
  const us = await db.collection("users").get();
  for (const u of us.docs) { const p = u.data(); const tk = (await u.ref.collection("tokens").get()).docs, n = tk.length, kinds = tk.map((d) => d.data().native ? "Android-app" : /iPhone/.test(d.data().ua || "") ? "iPhone" : (d.data().ua || "?").slice(0, 25)).join(", "); console.log(`::notice title=Konto::${p.nick || "?"} (${u.id.slice(0, 8)}) · telefonów ${n}${n ? " (" + kinds + ")" : ""}${p.pushErr ? " · problem: " + p.pushErr : ""}`); }
  const toks = await db.collectionGroup("tokens").get();
  const by = {}; toks.docs.forEach((t) => { const u = t.ref.parent.parent.id; by[u] = (by[u] || 0) + 1; });
  for (const [u, n] of Object.entries(by)) { const p = (await db.doc(`users/${u}`).get()).data() || {}; console.log(`::notice title=Telefon::${p.nick || "?"} (${u.slice(0, 8)}) · tokenów ${n} · język ${p.lang || "?"}`); }
  process.exit(0);
})().catch((e) => { console.log("::error::" + e.message); process.exit(1); });
