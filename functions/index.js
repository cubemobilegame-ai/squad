// SQUAD – funkcje w chmurze (plan Blaze)
// 1) podgląd linków /d/KOD  2) powiadomienia push  3) przypomnienia przed startem  4) sprzątanie po dropach i usuniętych kontach
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated, onDocumentWritten, onDocumentUpdated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const functionsV1 = require("firebase-functions/v1");
const admin = require("firebase-admin");

const REGION = "europe-west1";
setGlobalOptions({ region: REGION, maxInstances: 10 });
admin.initializeApp();
const db = admin.firestore();
const BASE = `https://${process.env.GCLOUD_PROJECT || JSON.parse(process.env.FIREBASE_CONFIG || "{}").projectId}.web.app`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cut = (s, n = 120) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const hhmm = (ts) => ts.toDate().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });

const TX = {
  pl: {
    reply: (n, s, ti) => [`${n}: ${s}`, `odpowiedź w dropie „${ti}”`],
    join: (n, g) => [`👋 ${n} dołącza do ekipy`, `grupa „${g}”`],
    change: (ti, w, p) => [`✏️ Zmiana w dropie „${ti}”`, `nowy plan: ${w} · ${p}`],
    remind: (ti, w, p) => [`⏰ Za 30 min: ${ti}`, `start ${w} · ${p}`],
    crew: (ti) => [`🎉 Ekipa w komplecie!`, `5+ osób wbija na „${ti}”`],
    surprise: "niespodzianka 🎁",
  },
  en: {
    reply: (n, s, ti) => [`${n}: ${s}`, `replied to “${ti}”`],
    join: (n, g) => [`👋 ${n} joined the crew`, `group “${g}”`],
    change: (ti, w, p) => [`✏️ “${ti}” has changed`, `new plan: ${w} · ${p}`],
    remind: (ti, w, p) => [`⏰ In 30 min: ${ti}`, `starts ${w} · ${p}`],
    crew: (ti) => [`🎉 Full crew!`, `5+ people are in for “${ti}”`],
    surprise: "surprise 🎁",
  },
};

// Wysyła powiadomienie do listy użytkowników. kind = chat | rsp | grp | rem | null (zawsze).
async function notify(uids, kind, build, link) {
  for (const uid of [...new Set(uids)].filter(Boolean)) {
    try {
      const u = await db.doc(`users/${uid}`).get();
      if (!u.exists) continue;
      const ud = u.data();
      if (kind && ud.notif && ud.notif[kind] === false) continue;
      const ts = await db.collection(`users/${uid}/tokens`).get();
      if (ts.empty) continue;
      const lang = ud.lang === "en" ? "en" : "pl";
      const [title, body] = build(TX[lang], lang);
      const res = await admin.messaging().sendEachForMulticast({
        tokens: ts.docs.map((d) => d.id),
        notification: { title, body },
        data: { url: link },
        webpush: { fcmOptions: { link: BASE + link }, notification: { icon: "/icon-192.png", badge: "/icon-192.png", tag: link, renotify: true } },
      });
      res.responses.forEach((r, i) => {
        const c = (r.error && r.error.code) || "";
        if (!r.success && /registration-token-not-registered|invalid-registration-token|invalid-argument/.test(c)) ts.docs[i].ref.delete().catch(() => {});
      });
    } catch (e) { console.warn("notify", uid, e.message); }
  }
}
const people = async (path, skip) => (await db.collection(path).get()).docs.filter((p) => p.id !== skip && !p.data().isGuest);

// 1) Link /d/KOD -> strona z podglądem (tytuł, miejsce, godzina, obrazek kategorii) dla Messengera, WhatsAppa itd.
exports.og = onRequest(async (req, res) => {
  const base = `https://${req.hostname}`;
  let html = await (await fetch(`${base}/index.html`)).text();
  const m = req.path.match(/^\/d\/([A-Za-z0-9]+)/);
  if (m) {
    const s = await db.doc(`drops/${m[1].toUpperCase()}`).get();
    if (s.exists && s.data().expiresAt.toMillis() > Date.now()) {
      const d = s.data();
      const place = d.surprise ? "niespodzianka 🎁" : d.place;
      const title = `${d.title} – jesteś w tym?`;
      const desc = `${place} · start ${hhmm(d.startsAt)} · kliknij IN / LATE / OUT`;
      const tags = `<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${base}/og/${esc(d.category)}.png"><meta property="og:url" content="${base}${esc(req.path)}"><meta name="twitter:card" content="summary_large_image">`;
      html = html.replace(/<meta property="og:[^>]*>\s*/g, "").replace(/<title>.*?<\/title>/, () => `<title>${esc(title)}</title>`).replace("</head>", () => tags + "</head>");
    }
  }
  res.set("Cache-Control", "public, max-age=60, s-maxage=120").send(html);
});

// 2) Nowa wiadomość w czacie dropa / grupy
exports.dropMessage = onDocumentCreated("drops/{code}/messages/{id}", async (e) => {
  const m = e.data && e.data.data(); if (!m) return;
  const d = (await db.doc(`drops/${e.params.code}`).get()).data(); if (!d) return;
  const ids = (await people(`drops/${e.params.code}/participants`, m.authorId)).map((p) => p.id);
  await notify(ids, "chat", () => [`[${d.title}] ${m.nickname}`, cut(m.text)], `/c/${e.params.code}`);
});
exports.groupMessage = onDocumentCreated("groups/{g}/messages/{id}", async (e) => {
  const m = e.data && e.data.data(); if (!m) return;
  const g = (await db.doc(`groups/${e.params.g}`).get()).data(); if (!g) return;
  const ids = (await people(`groups/${e.params.g}/members`, m.authorId)).map((p) => p.id);
  await notify(ids, "chat", () => [`[${g.name}] ${m.nickname}`, cut(m.text)], `/gc/${e.params.g}`);
});

// 3) Odpowiedź IN / LATE / OUT -> autor dropa; 5+ osób -> konfetti-powiadomienie dla wszystkich
exports.dropReply = onDocumentWritten("drops/{code}/participants/{uid}", async (e) => {
  const a = e.data.after.exists ? e.data.after.data() : null, b = e.data.before.exists ? e.data.before.data() : null;
  if (!a || (b && b.status === a.status && b.etaMin === a.etaMin)) return;
  const ref = db.doc(`drops/${e.params.code}`), d = (await ref.get()).data(); if (!d) return;
  if (e.params.uid !== d.hostId) {
    const st = { in: "IN ⚡", late: `LATE (${a.etaMin || 15} min) 🕒`, out: "OUT ✖" }[a.status] || a.status;
    await notify([d.hostId], "rsp", (T) => T.reply(a.nickname, st, d.title), `/d/${e.params.code}`);
  }
  if (!d.crewNotified) {
    const all = await db.collection(`drops/${e.params.code}/participants`).get();
    const going = all.docs.filter((p) => p.data().status !== "out");
    if (going.length >= 5) {
      await ref.update({ crewNotified: true });
      await notify(going.filter((p) => !p.data().isGuest).map((p) => p.id), "rsp", (T) => T.crew(d.title), `/d/${e.params.code}`);
    }
  }
});

// 4) Ktoś dołączył do grupy -> reszta ekipy
exports.groupJoin = onDocumentCreated("groups/{g}/members/{uid}", async (e) => {
  const m = e.data && e.data.data(); if (!m) return;
  const g = (await db.doc(`groups/${e.params.g}`).get()).data(); if (!g) return;
  const ids = (await people(`groups/${e.params.g}/members`, e.params.uid)).map((p) => p.id);
  await notify(ids, "grp", (T) => T.join(m.nickname, g.name), `/g/${e.params.g}`);
});

// 5) Autor zmienił godzinę / miejsce -> wszyscy z dropa (zawsze, bo to ważne)
exports.dropChanged = onDocumentUpdated("drops/{code}", async (e) => {
  const a = e.data.after.data(), b = e.data.before.data();
  if (a.startsAt.toMillis() === b.startsAt.toMillis() && a.place === b.place && a.title === b.title) return;
  const ids = (await people(`drops/${e.params.code}/participants`, a.hostId)).filter((p) => p.data().status !== "out").map((p) => p.id);
  await notify(ids, null, (T) => T.change(a.title, hhmm(a.startsAt), a.surprise ? T.surprise : a.place), `/d/${e.params.code}`);
});

// 6) Przypomnienie ok. 30 min przed startem (sprawdzane co 5 minut)
exports.reminders = onSchedule({ schedule: "every 5 minutes", timeZone: "Europe/Warsaw" }, async () => {
  const now = Date.now(), T = admin.firestore.Timestamp;
  const s = await db.collection("drops").where("startsAt", ">=", T.fromMillis(now + 20 * 6e4)).where("startsAt", "<=", T.fromMillis(now + 35 * 6e4)).get();
  for (const doc of s.docs) {
    const d = doc.data(); if (d.reminded) continue;
    await doc.ref.update({ reminded: true });
    const ids = (await people(`drops/${doc.id}/participants`)).filter((p) => ["in", "late"].includes(p.data().status)).map((p) => p.id);
    await notify(ids, "rem", (X) => X.remind(d.title, hhmm(d.startsAt), d.surprise ? X.surprise : d.place), `/d/${doc.id}`);
  }
});

// 7) Sprzątanie: co godzinę kasuje dropy 24 h po starcie (z odpowiedziami, czatem i albumem)
async function wipeDrop(code) {
  await db.recursiveDelete(db.doc(`drops/${code}`));
  await admin.storage().bucket().deleteFiles({ prefix: `drops/${code}/` }).catch(() => {});
}
exports.cleanup = onSchedule({ schedule: "every 60 minutes" }, async () => {
  const s = await db.collection("drops").where("expiresAt", "<", new Date()).limit(100).get();
  for (const d of s.docs) await wipeDrop(d.id);
});
exports.purge = onDocumentDeleted("drops/{code}", async (e) => { await wipeDrop(e.params.code); });
exports.purgeGroup = onDocumentDeleted("groups/{g}", async (e) => { await db.recursiveDelete(db.doc(`groups/${e.params.g}`)); });

// 8) Usunięte konto -> profil, tokeny, zdjęcie profilowe, wiadomości i zdjęcia z albumów
exports.accountDeleted = functionsV1.region(REGION).auth.user().onDelete(async (user) => {
  const uid = user.uid;
  await db.recursiveDelete(db.doc(`users/${uid}`)).catch(() => {});
  await admin.storage().bucket().file(`avatars/${uid}.jpg`).delete().catch(() => {});
  const msgs = await db.collectionGroup("messages").where("authorId", "==", uid).get().catch(() => ({ docs: [] }));
  for (const m of msgs.docs) await m.ref.delete().catch(() => {});
});
