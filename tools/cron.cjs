// SQUAD – automat co ok. 10 minut (GitHub Actions), zamiast funkcji w chmurze (plan darmowy Spark).
// 1) powiadomienia push: nowe wiadomości, odpowiedzi IN/LATE/OUT, nowe osoby w grupie, zmiany w dropie, „ekipa w komplecie”
// 2) przypomnienie ok. 30 min przed startem  3) sprzątanie dropów 24 h po starcie
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore(), TS = admin.firestore.Timestamp;
const PROJECT = require(process.env.GOOGLE_APPLICATION_CREDENTIALS).project_id;
const BASE = `https://${PROJECT}.web.app`;
const cut = (s, n = 110) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const hhmm = (ts) => ts.toDate().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });

const TX = {
  pl: { more: (n) => ` (+${n - 1} wiad.)`, reply: (ti) => `odpowiedzi w dropie „${ti}”`, join: (n, g) => [`👋 ${n} dołącza do ekipy`, `grupa „${g}”`],
    change: (ti, w, p) => [`✏️ Zmiana w dropie „${ti}”`, `nowy plan: ${w} · ${p}`], remind: (ti, w, p) => [`⏰ Za ok. 30 min: ${ti}`, `start ${w} · ${p}`],
    crew: (ti) => [`🎉 Ekipa w komplecie!`, `5+ osób wbija na „${ti}”`], surprise: "niespodzianka 🎁" },
  en: { more: (n) => ` (+${n - 1} more)`, reply: (ti) => `replies to “${ti}”`, join: (n, g) => [`👋 ${n} joined the crew`, `group “${g}”`],
    change: (ti, w, p) => [`✏️ “${ti}” has changed`, `new plan: ${w} · ${p}`], remind: (ti, w, p) => [`⏰ In about 30 min: ${ti}`, `starts ${w} · ${p}`],
    crew: (ti) => [`🎉 Full crew!`, `5+ people are in for “${ti}”`], surprise: "surprise 🎁" },
};

const users = new Map();
async function user(uid) {
  if (!users.has(uid)) {
    const u = await db.doc(`users/${uid}`).get();
    const toks = u.exists ? (await db.collection(`users/${uid}/tokens`).get()).docs : [];
    users.set(uid, u.exists ? { ...u.data(), toks } : null);
  }
  return users.get(uid);
}
let sent = 0;
async function notify(uids, kind, build, link) {
  for (const uid of [...new Set(uids)].filter(Boolean)) {
    const u = await user(uid);
    if (!u || !u.toks.length || (kind && u.notif && u.notif[kind] === false)) continue;
    const L = u.lang === "en" ? "en" : "pl", [title, body] = build(TX[L], L);
    const r = await admin.messaging().sendEachForMulticast({
      tokens: u.toks.map((d) => d.id), notification: { title, body }, data: { url: link },
      webpush: { fcmOptions: { link: BASE + link }, notification: { icon: "/icon-192.png", badge: "/icon-192.png", tag: link, renotify: true } },
    }).catch((e) => { console.warn("FCM", e.message); return { responses: [] }; });
    r.responses.forEach((x, i) => {
      if (x.success) sent++;
      else if (/not-registered|invalid-registration|invalid-argument/.test((x.error && x.error.code) || "")) u.toks[i].ref.delete().catch(() => {});
    });
  }
}
const people = async (path) => (await db.collection(path).get()).docs.filter((p) => !p.data().isGuest);
const group = (arr, key) => arr.reduce((m, x) => (m.set(key(x), [...(m.get(key(x)) || []), x]), m), new Map());

(async () => {
  const now = Date.now(), metaRef = db.doc("meta/cron"), meta = (await metaRef.get()).data() || {};
  const since = TS.fromMillis(Math.max(meta.last ? meta.last.toMillis() : now - 15 * 6e4, now - 2 * 36e5));
  const until = TS.fromMillis(now);
  console.log("Okno:", since.toDate().toISOString(), "→", until.toDate().toISOString());

  // 1a) nowe wiadomości – jedno powiadomienie na czat (ostatnia wiadomość + licznik)
  const msgs = (await db.collectionGroup("messages").where("createdAt", ">", since).where("createdAt", "<=", until).get()).docs;
  for (const [chatPath, list] of group(msgs, (d) => d.ref.parent.parent.path)) {
    const chat = (await db.doc(chatPath).get()).data(); if (!chat) continue;
    const isGroup = chatPath.startsWith("groups/"), code = chatPath.split("/")[1], title = isGroup ? chat.name : chat.title;
    const last = list[list.length - 1].data(), authors = new Set(list.map((d) => d.data().authorId));
    const ppl = await people(`${chatPath}/${isGroup ? "members" : "participants"}`);
    const to = ppl.map((p) => p.id).filter((id) => !(authors.size === 1 && authors.has(id)));
    await notify(to, "chat", (T) => [`[${title}] ${last.nickname}`, cut(last.text) + (list.length > 1 ? T.more(list.length) : "")], isGroup ? `/gc/${code}` : `/c/${code}`);
  }

  // 1b) odpowiedzi IN / LATE / OUT – zbiorczo do autora dropa + „ekipa w komplecie”
  const reps = (await db.collectionGroup("participants").where("updatedAt", ">", since).where("updatedAt", "<=", until).get()).docs;
  for (const [dropPath, list] of group(reps, (d) => d.ref.parent.parent.path)) {
    const ref = db.doc(dropPath), d = (await ref.get()).data(); if (!d) continue;
    const code = ref.id, lines = list.filter((p) => p.id !== d.hostId).map((p) => { const x = p.data(); return `${x.nickname}: ${{ in: "IN ⚡", late: `LATE ${x.etaMin || 15} min`, out: "OUT" }[x.status] || x.status}`; });
    if (lines.length) await notify([d.hostId], "rsp", (T) => [cut(lines.join(" · "), 90), T.reply(d.title)], `/d/${code}`);
    if (!d.crewNotified) {
      const going = (await ref.collection("participants").get()).docs.filter((p) => p.data().status !== "out");
      if (going.length >= 5) { await ref.update({ crewNotified: true }); await notify(going.filter((p) => !p.data().isGuest).map((p) => p.id), "rsp", (T) => T.crew(d.title), `/d/${code}`); }
    }
  }

  // 1c) nowe osoby w grupach
  const joins = (await db.collectionGroup("members").where("updatedAt", ">", since).where("updatedAt", "<=", until).get()).docs;
  for (const [gPath, list] of group(joins, (d) => d.ref.parent.parent.path)) {
    const g = (await db.doc(gPath).get()).data(); if (!g) continue;
    const newIds = new Set(list.map((m) => m.id)), names = list.map((m) => m.data().nickname).join(", ");
    const to = (await people(`${gPath}/members`)).map((p) => p.id).filter((id) => !newIds.has(id));
    await notify(to, "grp", (T) => T.join(names, g.name), `/g/${gPath.split("/")[1]}`);
  }

  // 1d) zmiany w dropach (edycja godziny / miejsca)
  const edits = (await db.collection("drops").where("editedAt", ">", since).get()).docs;
  for (const doc of edits) {
    const d = doc.data(), to = (await people(`drops/${doc.id}/participants`)).filter((p) => p.id !== d.hostId && p.data().status !== "out").map((p) => p.id);
    await notify(to, null, (T) => T.change(d.title, hhmm(d.startsAt), d.surprise ? T.surprise : d.place), `/d/${doc.id}`);
  }

  // 2) przypomnienia ok. 30 min przed startem
  const soon = (await db.collection("drops").where("startsAt", ">=", TS.fromMillis(now + 15 * 6e4)).where("startsAt", "<=", TS.fromMillis(now + 45 * 6e4)).get()).docs;
  for (const doc of soon) {
    const d = doc.data(); if (d.reminded) continue;
    await doc.ref.update({ reminded: true });
    const to = (await people(`drops/${doc.id}/participants`)).filter((p) => ["in", "late"].includes(p.data().status)).map((p) => p.id);
    await notify(to, "rem", (T) => T.remind(d.title, hhmm(d.startsAt), d.surprise ? T.surprise : d.place), `/d/${doc.id}`);
  }

  // 3) sprzątanie: dropy 24 h po starcie (z odpowiedziami, czatem i albumem)
  const old = (await db.collection("drops").where("expiresAt", "<", TS.fromMillis(now)).limit(200).get()).docs;
  for (const doc of old) await db.recursiveDelete(doc.ref);

  await metaRef.set({ last: until, at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  console.log(`Wiadomości: ${msgs.length}, odpowiedzi: ${reps.length}, dołączenia: ${joins.length}, zmiany: ${edits.length}, przypomnienia: ${soon.length}, usunięte dropy: ${old.length}, wysłane push: ${sent}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
