// Jednorazowo: dopisuje pole uid (= id dokumentu) do participants i members, żeby „Moje dropy” działały na każdym urządzeniu.
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
(async () => {
  let n = 0;
  for (const cg of ["participants", "members"]) {
    const s = await db.collectionGroup(cg).get();
    for (const d of s.docs) if (d.data().uid !== d.id) { await d.ref.set({ uid: d.id }, { merge: true }); n++; }
  }
  console.log(`::notice title=Uzupełniono::${n} wpisów`);
  process.exit(0);
})().catch((e) => { console.log("::error::" + e.message); process.exit(1); });
