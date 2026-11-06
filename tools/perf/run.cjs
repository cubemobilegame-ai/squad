// Pomiar: jak szybko otwiera się link-zaproszenie /d/KOD na iPhonie (silnik WebKit, jak Safari).
// Tworzy tymczasowy drop, mierzy kilka zimnych startów, potem drop usuwa.
const admin = require("firebase-admin");
const { webkit, devices } = require("playwright");
admin.initializeApp();
const db = admin.firestore(), TS = admin.firestore.Timestamp;
const SITE = process.env.SITE || "https://squad-64cd5.web.app", RUNS = +(process.env.RUNS || 4);
(async () => {
  const code = "PERF" + Math.random().toString(36).slice(2, 7).toUpperCase(), now = Date.now();
  const ref = db.collection("drops").doc(code);
  await ref.set({ code, hostId: "perf-host", hostNick: "Test", hostAv: 3, hostPh: null, category: "food", title: "Test szybkości", place: "Pizzeria", surprise: false, theme: 3, repeat: null,
    startsAt: TS.fromMillis(now + 2 * 3600e3), expiresAt: TS.fromMillis(now + 26 * 3600e3), createdAt: TS.now() });
  await ref.collection("participants").doc("perf-a").set({ nickname: "Ala", status: "in", av: 5, uid: "perf-a", isGuest: true, updatedAt: TS.now() });
  const res = [];
  try {
    const b = await webkit.launch();
    for (let i = 0; i < RUNS; i++) {
      const c = await b.newContext({ ...devices["iPhone 13"], locale: "pl-PL" });
      const p = await c.newPage(); const t0 = Date.now();
      await p.goto(SITE + "/d/" + code, { waitUntil: "commit" });
      const r = await p.evaluate(() => new Promise((ok) => { const t = performance.now(), o = {};
        const iv = setInterval(() => { const n = Math.round(performance.now());
          if (!o.splash && !document.getElementById("spl")) o.splash = n;
          if (!o.card && document.querySelector("#cb .drop")) o.card = n;
          if (!o.btn && document.querySelector("#tr .rb")) o.btn = n;
          if ((o.card && o.splash) || n > 30000) { clearInterval(iv); ok(o) } }, 25) }));
      res.push(r); console.log(`run ${i + 1}: przyciski ${r.btn} ms · karta dropa ${r.card} ms · koniec ekranu ładowania ${r.splash} ms`);
      await c.close();
    }
    await b.close();
  } finally { await ref.collection("participants").doc("perf-a").delete(); await ref.delete(); }
  const med = (k) => { const a = res.map((x) => x[k] || 30000).sort((x, y) => x - y); return a[Math.floor(a.length / 2)] };
  console.log(`::notice title=Zaproszenie na iPhonie (${SITE})::karta dropa ${med("card")} ms · ekran ładowania znika ${med("splash")} ms (mediana z ${RUNS})`);
  process.exit(0);
})().catch((e) => { console.log("::error::" + e.message); process.exit(1); });
