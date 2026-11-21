// Jednorazowe wczytanie istniejących kont do statystyk (kolekcja presence). Domyślnie TYLKO PODGLĄD – zapis dopiero z APPLY=1.
// Nie nadpisuje wpisów, które aplikacja już zapisała. Platforma starszych kont jest nieznana ("unk") i uzupełni się po otwarciu aplikacji.
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore(), APPLY = process.env.APPLY === "1";
(async () => {
  let all = [], tok;
  do { const r = await admin.auth().listUsers(1000, tok); all = all.concat(r.users); tok = r.pageToken; } while (tok);
  const ex = new Set((await db.collection("presence").select().get()).docs.map((d) => d.id));
  const todo = all.filter((u) => !ex.has(u.uid)), now = Date.now(), D = 864e5;
  const t = (s) => +new Date(s), ls = (u) => t(u.metadata.lastSignInTime || u.metadata.creationTime), fs = (u) => t(u.metadata.creationTime);
  const days = {}; todo.forEach((u) => { const k = new Date(fs(u)).toISOString().slice(0, 10); if (now - fs(u) < 30 * D) days[k] = (days[k] || 0) + 1; });
  const L = [`Konta w Firebase: ${all.length}; już w statystykach: ${ex.size}; do wczytania: ${todo.length}`,
    `Z tego goście: ${todo.filter((u) => !u.providerData.length).length}`,
    `Założone w ostatnich 7 dni: ${todo.filter((u) => now - fs(u) < 7 * D).length}, 30 dni: ${todo.filter((u) => now - fs(u) < 30 * D).length}`,
    `Ostatnie logowanie – 24 h: ${todo.filter((u) => now - ls(u) < D).length}, 7 dni: ${todo.filter((u) => now - ls(u) < 7 * D).length}, 30 dni: ${todo.filter((u) => now - ls(u) < 30 * D).length}, starsze: ${todo.filter((u) => now - ls(u) >= 30 * D).length}`,
    `Nowe konta wg dni (30 dni): ${Object.keys(days).sort().map((k) => k + "=" + days[k]).join(", ") || "-"}`];
  if (APPLY) {
    let w = db.batch(), n = 0;
    for (const u of todo) {
      w.create(db.collection("presence").doc(u.uid), { fs: admin.firestore.Timestamp.fromMillis(fs(u)), ls: admin.firestore.Timestamp.fromMillis(Math.max(ls(u), fs(u))), pf: "unk", g: !u.providerData.length, lang: "", v: "" });
      if (++n % 400 === 0) { await w.commit(); w = db.batch(); }
    }
    await w.commit(); L.push(`ZAPISANO: ${todo.length}`);
  } else L.push("PODGLĄD – nic nie zapisano.");
  console.log(L.join("\n")); console.log("::notice title=Wczytanie kont::" + L.join("%0A"));
  process.exit(0);
})().catch((e) => { console.log("::error::" + e.message); process.exit(1); });
