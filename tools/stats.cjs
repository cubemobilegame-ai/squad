// Statystyki: liczba kont (Auth), podział na logowanie i aktywność, liczba dropów i grup. Tylko liczby, bez danych osobowych.
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
(async () => {
  let all = [], tok;
  do { const r = await admin.auth().listUsers(1000, tok); all = all.concat(r.users); tok = r.pageToken; } while (tok);
  const now = Date.now(), d = (n) => now - n * 864e5, ls = (u) => +new Date(u.metadata.lastSignInTime || u.metadata.creationTime);
  const anon = all.filter((u) => !u.providerData.length), reg = all.filter((u) => u.providerData.length);
  const by = {}; reg.forEach((u) => { const p = u.providerData[0].providerId; by[p] = (by[p] || 0) + 1; });
  const cnt = async (c) => (await db.collection(c).count().get()).data().count;
  const act = (n) => all.filter((u) => ls(u) >= d(n)).length, neu = (n) => all.filter((u) => +new Date(u.metadata.creationTime) >= d(n)).length;
  const L = [
    `Konta razem: ${all.length} (zalogowane ${reg.length}, goście ${anon.length})`,
    `Logowanie: ${Object.entries(by).map(([k, v]) => k + " " + v).join(", ") || "-"}`,
    `Nowe: 24h ${neu(1)}, 7 dni ${neu(7)}, 30 dni ${neu(30)}`,
    `Aktywne (ostatnie logowanie): 24h ${act(1)}, 7 dni ${act(7)}, 30 dni ${act(30)}`,
    `Dropy: ${await cnt("drops")}, grupy: ${await cnt("groups")}`,
  ];
  console.log(L.join("\n")); console.log("::notice title=Statystyki::" + L.join("%0A"));
  process.exit(0);
})().catch((e) => { console.log("::error::" + e.message); process.exit(1); });
