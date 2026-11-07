// Squad – automat co ok. 10 minut (GitHub Actions), zamiast funkcji w chmurze (plan darmowy Spark).
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
  pl: { again: (ti, w) => [`🔁 Kolejny termin: ${ti}`, `${w} · odpowiedz IN / OUT`], more: (n) => ` (+${n - 1} wiad.)`, reply: (ti) => `odpowiedzi w dropie „${ti}”`, join: (n, g) => [`👋 ${n} dołącza do ekipy`, `grupa „${g}”`],
    change: (ti, w, p) => [`✏️ Zmiana w dropie „${ti}”`, `nowy plan: ${w} · ${p}`], remind: (ti, w, p) => [`⏰ Za ok. 30 min: ${ti}`, `start ${w} · ${p}`],
    crew: (ti) => [`🎉 Ekipa w komplecie!`, `5+ osób wbija na „${ti}”`], surprise: "niespodzianka 🎁" },
  en: { again: (ti, w) => [`🔁 Next one: ${ti}`, `${w} · reply IN / OUT`], more: (n) => ` (+${n - 1} more)`, reply: (ti) => `replies to “${ti}”`, join: (n, g) => [`👋 ${n} joined the crew`, `group “${g}”`],
    change: (ti, w, p) => [`✏️ “${ti}” has changed`, `new plan: ${w} · ${p}`], remind: (ti, w, p) => [`⏰ In about 30 min: ${ti}`, `starts ${w} · ${p}`],
    crew: (ti) => [`🎉 Full crew!`, `5+ people are in for “${ti}”`], surprise: "surprise 🎁" },
  es: { again: (ti, w) => [`🔁 Próxima fecha: ${ti}`, `${w} · responde IN / OUT`], more: (n) => ` (+${n - 1} mens.)`, reply: (ti) => `respuestas en «${ti}»`, join: (n, g) => [`👋 ${n} se une a la crew`, `grupo «${g}»`],
    change: (ti, w, p) => [`✏️ Cambio en «${ti}»`, `nuevo plan: ${w} · ${p}`], remind: (ti, w, p) => [`⏰ En unos 30 min: ${ti}`, `empieza ${w} · ${p}`],
    crew: (ti) => [`🎉 ¡Crew completa!`, `5+ personas van a «${ti}»`], surprise: "sorpresa 🎁" },
  de: { again: (ti, w) => [`🔁 Nächster Termin: ${ti}`, `${w} · antworte IN / OUT`], more: (n) => ` (+${n - 1} Nachr.)`, reply: (ti) => `Antworten zu „${ti}“`, join: (n, g) => [`👋 ${n} ist jetzt in der Crew`, `Gruppe „${g}“`],
    change: (ti, w, p) => [`✏️ „${ti}“ wurde geändert`, `neuer Plan: ${w} · ${p}`], remind: (ti, w, p) => [`⏰ In ca. 30 Min.: ${ti}`, `Start ${w} · ${p}`],
    crew: (ti) => [`🎉 Crew komplett!`, `5+ Leute sind bei „${ti}“ dabei`], surprise: "Überraschung 🎁" },
  fr: { again: (ti, w) => [`🔁 Prochaine date : ${ti}`, `${w} · réponds IN / OUT`], more: (n) => ` (+${n - 1} msg)`, reply: (ti) => `réponses à « ${ti} »`, join: (n, g) => [`👋 ${n} rejoint la team`, `groupe « ${g} »`],
    change: (ti, w, p) => [`✏️ « ${ti} » a changé`, `nouveau plan : ${w} · ${p}`], remind: (ti, w, p) => [`⏰ Dans 30 min environ : ${ti}`, `début ${w} · ${p}`],
    crew: (ti) => [`🎉 Team au complet !`, `5+ personnes viennent à « ${ti} »`], surprise: "surprise 🎁" },
  it: { again: (ti, w) => [`🔁 Prossima data: ${ti}`, `${w} · rispondi IN / OUT`], more: (n) => ` (+${n - 1} mess.)`, reply: (ti) => `risposte a «${ti}»`, join: (n, g) => [`👋 ${n} entra nella crew`, `gruppo «${g}»`],
    change: (ti, w, p) => [`✏️ «${ti}» è cambiato`, `nuovo piano: ${w} · ${p}`], remind: (ti, w, p) => [`⏰ Tra circa 30 min: ${ti}`, `inizio ${w} · ${p}`],
    crew: (ti) => [`🎉 Crew al completo!`, `5+ persone vanno a «${ti}»`], surprise: "sorpresa 🎁" },
  cs: { again: (ti, w) => [`🔁 Další termín: ${ti}`, `${w} · odpověz IN / OUT`], more: (n) => ` (+${n - 1} zpr.)`, reply: (ti) => `odpovědi na „${ti}“`, join: (n, g) => [`👋 ${n} se přidává k partě`, `skupina „${g}“`],
    change: (ti, w, p) => [`✏️ Změna v „${ti}“`, `nový plán: ${w} · ${p}`], remind: (ti, w, p) => [`⏰ Asi za 30 min: ${ti}`, `začátek ${w} · ${p}`],
    crew: (ti) => [`🎉 Parta je komplet!`, `Na „${ti}“ jde 5+ lidí`], surprise: "překvapení 🎁" },
  uk: { again: (ti, w) => [`🔁 Наступна дата: ${ti}`, `${w} · відповідай IN / OUT`], more: (n) => ` (+${n - 1} пов.)`, reply: (ti) => `відповіді на «${ti}»`, join: (n, g) => [`👋 ${n} приєднується до компанії`, `група «${g}»`],
    change: (ti, w, p) => [`✏️ Зміна в «${ti}»`, `новий план: ${w} · ${p}`], remind: (ti, w, p) => [`⏰ Приблизно за 30 хв: ${ti}`, `початок ${w} · ${p}`],
    crew: (ti) => [`🎉 Компанія в зборі!`, `На «${ti}» іде 5+ людей`], surprise: "сюрприз 🎁" },
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
let sent = 0, failed = 0;
async function notify(uids, kind, build, link) {
  for (const uid of [...new Set(uids)].filter(Boolean)) {
    const u = await user(uid);
    if (!u || !u.toks.length || (kind && u.notif && u.notif[kind] === false)) continue;
    const L = TX[u.lang] ? u.lang : "en", [title, body] = build(TX[L], L);
    const r = await admin.messaging().sendEachForMulticast({
      tokens: u.toks.map((d) => d.id), notification: { title, body }, data: { url: link }, android: { priority: "high", notification: { channelId: "squad", sound: "default", tag: link, defaultVibrateTimings: true } },
      webpush: { fcmOptions: { link: BASE + link }, notification: { icon: "/icon-192.png", badge: "/badge-96.png", tag: link, renotify: true, vibrate: [200, 100, 200], silent: false }, headers: { Urgency: "high", TTL: "86400" } },
    }).catch((e) => { console.warn("FCM", e.message); return { responses: [] }; });
    r.responses.forEach((x, i) => {
      if (x.success) { sent++; return; }
      failed++; console.log("::warning::FCM " + ((x.error && x.error.code) || "") + " " + ((x.error && x.error.message) || "").slice(0, 120));
      if (/not-registered|invalid-registration|invalid-argument/.test((x.error && x.error.code) || "")) u.toks[i].ref.delete().catch(() => {});
    });
  }
}
const people = async (path) => (await db.collection(path).get()).docs;
const group = (arr, key) => arr.reduce((m, x) => (m.set(key(x), [...(m.get(key(x)) || []), x]), m), new Map());

const RT = (() => { try { return /pushUrl\s*:\s*"https/.test(require("fs").readFileSync(require("path").join(__dirname, "../public/config.js"), "utf8")); } catch { return false; } })();
if (RT) console.log("::notice::Natychmiastowe powiadomienia działają przez Cloudflare – automat wysyła tylko przypomnienia i „ekipa w komplecie”.");
const errs = [];
const step = async (name, fn) => { try { await fn(); } catch (e) { errs.push(name); console.log(`::warning::${name}: ${String(e.message || e).slice(0, 300)}`); } };
(async () => {
  const now = Date.now(), metaRef = db.doc("meta/cron"), meta = (await metaRef.get()).data() || {};
  const since = TS.fromMillis(Math.max(meta.last ? meta.last.toMillis() : now - 15 * 6e4, now - 2 * 36e5));
  const until = TS.fromMillis(now);
  let msgs = [], reps = [], joins = [], edits = [], soon = [], old = [];
  console.log("Okno:", since.toDate().toISOString(), "→", until.toDate().toISOString());

  await step("wiadomości", async () => { if (RT) return;
  // 1a) nowe wiadomości – jedno powiadomienie na czat (ostatnia wiadomość + licznik)
  msgs = (await db.collectionGroup("messages").where("createdAt", ">", since).where("createdAt", "<=", until).get()).docs;
  for (const [chatPath, list] of group(msgs, (d) => d.ref.parent.parent.path)) {
    const chat = (await db.doc(chatPath).get()).data(); if (!chat) continue;
    const isGroup = chatPath.startsWith("groups/"), code = chatPath.split("/")[1], title = isGroup ? chat.name : chat.title;
    const last = list[list.length - 1].data(), authors = new Set(list.map((d) => d.data().authorId));
    const ppl = await people(`${chatPath}/${isGroup ? "members" : "participants"}`);
    const to = ppl.map((p) => p.id).filter((id) => !(authors.size === 1 && authors.has(id)));
    await notify(to, "chat", (T) => [`[${title}] ${last.nickname}`, cut(last.text) + (list.length > 1 ? T.more(list.length) : "")], isGroup ? `/gc/${code}` : `/c/${code}`);
  }

  });
  await step("odpowiedzi", async () => {
  // 1b) odpowiedzi IN / LATE / OUT – zbiorczo do autora dropa + „ekipa w komplecie”
  reps = (await db.collectionGroup("participants").where("updatedAt", ">", since).where("updatedAt", "<=", until).get()).docs;
  for (const [dropPath, list] of group(reps, (d) => d.ref.parent.parent.path)) {
    const ref = db.doc(dropPath), d = (await ref.get()).data(); if (!d) continue;
    const code = ref.id, lines = list.filter((p) => p.id !== d.hostId).map((p) => { const x = p.data(); return `${x.nickname}: ${{ in: "IN ⚡", late: `LATE ${x.etaMin || 15} min`, out: "OUT" }[x.status] || x.status}`; });
    if (lines.length && !RT) await notify([d.hostId], "rsp", (T) => [cut(lines.join(" · "), 90), T.reply(d.title)], `/d/${code}`);
    if (!d.crewNotified) {
      const going = (await ref.collection("participants").get()).docs.filter((p) => p.data().status !== "out");
      if (going.length >= 5) { await ref.update({ crewNotified: true }); await notify(going.map((p) => p.id), "rsp", (T) => T.crew(d.title), `/d/${code}`); }
    }
  }

  });
  await step("grupy", async () => { if (RT) return;
  // 1c) nowe osoby w grupach
  joins = (await db.collectionGroup("members").where("updatedAt", ">", since).where("updatedAt", "<=", until).get()).docs;
  for (const [gPath, list] of group(joins, (d) => d.ref.parent.parent.path)) {
    const g = (await db.doc(gPath).get()).data(); if (!g) continue;
    const newIds = new Set(list.map((m) => m.id)), names = list.map((m) => m.data().nickname).join(", ");
    const to = (await people(`${gPath}/members`)).map((p) => p.id).filter((id) => !newIds.has(id));
    await notify(to, "grp", (T) => T.join(names, g.name), `/g/${gPath.split("/")[1]}`);
  }

  });
  await step("zmiany", async () => { if (RT) return;
  // 1d) zmiany w dropach (edycja godziny / miejsca)
  edits = (await db.collection("drops").where("editedAt", ">", since).get()).docs;
  for (const doc of edits) {
    const d = doc.data(), to = (await people(`drops/${doc.id}/participants`)).filter((p) => p.id !== d.hostId && p.data().status !== "out").map((p) => p.id);
    await notify(to, null, (T) => T.change(d.title, hhmm(d.startsAt), d.surprise ? T.surprise : d.place), `/d/${doc.id}`);
  }

  });
  await step("przypomnienia", async () => {
  // 2) przypomnienia ok. 30 min przed startem
  soon = (await db.collection("drops").where("startsAt", ">=", TS.fromMillis(now + 15 * 6e4)).where("startsAt", "<=", TS.fromMillis(now + 45 * 6e4)).get()).docs;
  for (const doc of soon) {
    const d = doc.data(); if (d.reminded) continue;
    await doc.ref.update({ reminded: true });
    const to = (await people(`drops/${doc.id}/participants`)).filter((p) => ["in", "late"].includes(p.data().status)).map((p) => p.id);
    await notify(to, "rem", (T) => T.remind(d.title, hhmm(d.startsAt), d.surprise ? T.surprise : d.place), `/d/${doc.id}`);
  }

  });
  await step("sprzątanie", async () => {
  // 3) sprzątanie: dropy 24 h po starcie (z odpowiedziami, czatem i albumem)
  old = (await db.collection("drops").where("expiresAt", "<", TS.fromMillis(now)).limit(200).get()).docs;
  for (const doc of old) {
    const d = doc.data(), rep = { w: 7, "2w": 14 }[d.repeat], mon = d.repeat === "m";
    if (!rep && !mon) { await db.recursiveDelete(doc.ref); continue; }
    // drop cykliczny: ten sam link, nowy termin – czyścimy odpowiedzi, czat i album, organizator zostaje
    let next = d.startsAt.toDate();
    do { if (mon) next.setMonth(next.getMonth() + 1); else next = new Date(next.getTime() + rep * 864e5); } while (next.getTime() < now + 30 * 6e4);
    const parts = (await doc.ref.collection("participants").get()).docs, was = parts.filter((p) => p.id !== d.hostId && p.data().status !== "out").map((p) => p.id);
    for (const sub of ["messages", "photos"]) for (const x of (await doc.ref.collection(sub).get()).docs) await db.recursiveDelete(x.ref);
    for (const p of parts) if (p.id !== d.hostId) await p.ref.delete(); else await p.ref.update({ status: "in", readAt: null, typing: null }).catch(() => {});
    await doc.ref.update({ startsAt: TS.fromDate(next), expiresAt: TS.fromMillis(next.getTime() + 864e5), reminded: false, crewNotified: false, round: (d.round || 1) + 1 });
    const w = next.toLocaleString("pl-PL", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });
    await notify([d.hostId, ...was], null, (T) => T.again(d.title, w), `/d/${doc.id}`);
  }

  });
  await metaRef.set({ last: until, at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  const tokCount=(await db.collectionGroup("tokens").count().get().catch(()=>null))?.data().count;
  console.log(`::notice::Wiadomości ${msgs.length} · odpowiedzi ${reps.length} · wysłane push ${sent} · nieudane ${failed} · zapisane telefony (tokeny) ${tokCount ?? "?"}`);
  console.log(`Wiadomości: ${msgs.length}, odpowiedzi: ${reps.length}, dołączenia: ${joins.length}, zmiany: ${edits.length}, przypomnienia: ${soon.length}, usunięte dropy: ${old.length}, wysłane push: ${sent}`);
  if (errs.length === 6) { console.log('::error::Żadna część automatu nie zadziałała'); process.exit(1); }
  process.exit(0);
})().catch((e) => { console.log(`::error::${String(e.message || e).slice(0, 400)}`); process.exit(1); });
