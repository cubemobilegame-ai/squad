// Diagnostyka kont: dostawca logowania i liczba dropów/grup przy każdym koncie.
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
(async () => {
  const P = (await db.collectionGroup("participants").get()).docs, M = (await db.collectionGroup("members").get()).docs;
  const us = await db.collection("users").get(), out = [];
  for (const u of us.docs) {
    let prov = "?"; try { const a = await admin.auth().getUser(u.id); prov = a.providerData.map((p) => p.providerId + ":" + (p.email || "").replace(/(.{3}).*@/, "$1…@")).join(",") || "anon"; } catch { prov = "brak"; }
    out.push(`${u.data().nick || "?"} (${u.id.slice(0, 8)}) · ${prov} · dropy ${P.filter((d) => d.id === u.id).length} · grupy ${M.filter((d) => d.id === u.id).length}`);
  }
  console.log("::notice title=Konta i logowanie::" + out.join("%0A"));
  process.exit(0);
})().catch((e) => { console.log("::error::" + e.message); process.exit(1); });
