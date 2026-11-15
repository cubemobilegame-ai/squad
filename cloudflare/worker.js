// Squad – natychmiastowe powiadomienia push (Cloudflare Workers, plan darmowy).
// Aplikacja po wysłaniu wiadomości / odpowiedzi IN-LATE-OUT / dołączeniu do grupy / zmianie dropa woła POST /notify.
// Worker sprawdza token logowania Firebase, czyta dane z Firestore i wysyła powiadomienia przez Firebase Cloud Messaging.
// Sekret: FIREBASE_SA (cały plik JSON konta usługi Firebase).

const ORIGINS = ["https://squad-64cd5.web.app", "https://squad-64cd5.firebaseapp.com", "http://localhost:8766"];
const TX = {
  pl: { sos: (n, ti, p) => ["🆘 " + n + " potrzebuje wsparcia", ti + (p ? " · " + p : "")], reveal: (ti, w, p) => ["🎁 Niespodzianka odsłonięta!", `${ti}: ${p} · start ${w}`], album: (ti) => ["📸 Drop wystartował!", `Wrzuć zdjęcie do albumu: ${ti}`], kreq: (n) => [`👋 ${n} chce dodać cię do kontaktów`, "Otwórz Squad, żeby przyjąć"], kacc: (n) => [`🤝 ${n} przyjmuje zaproszenie`, "Jesteście w kontaktach – łatwo zaprosicie się do dropów"], kinv: (n, ti, g) => [`👋 ${n} zaprasza cię ${g ? "do grupy" : "na drop"}`, ti], remind: (ti, w, p) => [`⏰ Za ok. 30 min: ${ti}`, `start ${w} · ${p}`], rjoin: (n) => `⚡ ${n} dołącza`, rleft: (n) => `👋 ${n} się wycofuje`, reply: (ti) => `odpowiedzi w dropie „${ti}”`, join: (n, g) => [`👋 ${n} dołącza do ekipy`, `grupa „${g}”`], change: (ti, w, p) => [`✏️ Zmiana w dropie „${ti}”`, `nowy plan: ${w} · ${p}`], surprise: "niespodzianka 🎁" },
  en: { sos: (n, ti, p) => ["🆘 " + n + " needs support", ti + (p ? " · " + p : "")], reveal: (ti, w, p) => ["🎁 Surprise revealed!", `${ti}: ${p} · starts ${w}`], album: (ti) => ["📸 The drop has started!", `Add a photo to the album: ${ti}`], kreq: (n) => [`👋 ${n} wants to add you`, "Open Squad to accept"], kacc: (n) => [`🤝 ${n} accepted your request`, "You're contacts now – inviting each other is easy"], kinv: (n, ti, g) => [`👋 ${n} invites you ${g ? "to a group" : "to a drop"}`, ti], remind: (ti, w, p) => [`⏰ In about 30 min: ${ti}`, `starts ${w} · ${p}`], rjoin: (n) => `⚡ ${n} is in`, rleft: (n) => `👋 ${n} dropped out`, reply: (ti) => `replies to “${ti}”`, join: (n, g) => [`👋 ${n} joined the crew`, `group “${g}”`], change: (ti, w, p) => [`✏️ “${ti}” has changed`, `new plan: ${w} · ${p}`], surprise: "surprise 🎁" },
  es: { sos: (n, ti, p) => ["🆘 " + n + " necesita apoyo", ti + (p ? " · " + p : "")], reveal: (ti, w, p) => ["🎁 ¡Sorpresa revelada!", `${ti}: ${p} · empieza ${w}`], album: (ti) => ["📸 ¡El drop ha empezado!", `Sube una foto al álbum: ${ti}`], kreq: (n) => [`👋 ${n} quiere añadirte`, "Abre Squad para aceptar"], kacc: (n) => [`🤝 ${n} aceptó tu solicitud`, "Ya sois contactos"], kinv: (n, ti, g) => [`👋 ${n} te invita ${g ? "a un grupo" : "a un drop"}`, ti], remind: (ti, w, p) => [`⏰ En unos 30 min: ${ti}`, `empieza ${w} · ${p}`], rjoin: (n) => `⚡ ${n} se apunta`, rleft: (n) => `👋 ${n} se baja`, reply: (ti) => `respuestas en «${ti}»`, join: (n, g) => [`👋 ${n} se une a la crew`, `grupo «${g}»`], change: (ti, w, p) => [`✏️ Cambio en «${ti}»`, `nuevo plan: ${w} · ${p}`], surprise: "sorpresa 🎁" },
  de: { sos: (n, ti, p) => ["🆘 " + n + " braucht Unterstützung", ti + (p ? " · " + p : "")], reveal: (ti, w, p) => ["🎁 Überraschung enthüllt!", `${ti}: ${p} · Start ${w}`], album: (ti) => ["📸 Der Drop läuft!", `Lade ein Foto ins Album hoch: ${ti}`], kreq: (n) => [`👋 ${n} will dich hinzufügen`, "Öffne Squad zum Annehmen"], kacc: (n) => [`🤝 ${n} hat angenommen`, "Ihr seid jetzt Kontakte"], kinv: (n, ti, g) => [`👋 ${n} lädt dich ${g ? "in eine Gruppe" : "zu einem Drop"} ein`, ti], remind: (ti, w, p) => [`⏰ In ca. 30 Min.: ${ti}`, `Start ${w} · ${p}`], rjoin: (n) => `⚡ ${n} ist dabei`, rleft: (n) => `👋 ${n} ist raus`, reply: (ti) => `Antworten zu „${ti}“`, join: (n, g) => [`👋 ${n} ist jetzt in der Crew`, `Gruppe „${g}“`], change: (ti, w, p) => [`✏️ „${ti}“ wurde geändert`, `neuer Plan: ${w} · ${p}`], surprise: "Überraschung 🎁" },
  fr: { sos: (n, ti, p) => ["🆘 " + n + " a besoin de soutien", ti + (p ? " · " + p : "")], reveal: (ti, w, p) => ["🎁 Surprise dévoilée !", `${ti} : ${p} · début ${w}`], album: (ti) => ["📸 Le drop a commencé !", `Ajoute une photo à l'album : ${ti}`], kreq: (n) => [`👋 ${n} veut t'ajouter`, "Ouvre Squad pour accepter"], kacc: (n) => [`🤝 ${n} a accepté`, "Vous êtes maintenant contacts"], kinv: (n, ti, g) => [`👋 ${n} t'invite ${g ? "dans un groupe" : "à un drop"}`, ti], remind: (ti, w, p) => [`⏰ Dans 30 min environ : ${ti}`, `début ${w} · ${p}`], rjoin: (n) => `⚡ ${n} participe`, rleft: (n) => `👋 ${n} se désiste`, reply: (ti) => `réponses à « ${ti} »`, join: (n, g) => [`👋 ${n} rejoint la team`, `groupe « ${g} »`], change: (ti, w, p) => [`✏️ « ${ti} » a changé`, `nouveau plan : ${w} · ${p}`], surprise: "surprise 🎁" },
  it: { sos: (n, ti, p) => ["🆘 " + n + " ha bisogno di supporto", ti + (p ? " · " + p : "")], reveal: (ti, w, p) => ["🎁 Sorpresa svelata!", `${ti}: ${p} · inizio ${w}`], album: (ti) => ["📸 Il drop è iniziato!", `Aggiungi una foto all'album: ${ti}`], kreq: (n) => [`👋 ${n} vuole aggiungerti`, "Apri Squad per accettare"], kacc: (n) => [`🤝 ${n} ha accettato`, "Ora siete contatti"], kinv: (n, ti, g) => [`👋 ${n} ti invita ${g ? "in un gruppo" : "a un drop"}`, ti], remind: (ti, w, p) => [`⏰ Tra circa 30 min: ${ti}`, `inizio ${w} · ${p}`], rjoin: (n) => `⚡ ${n} partecipa`, rleft: (n) => `👋 ${n} si ritira`, reply: (ti) => `risposte a «${ti}»`, join: (n, g) => [`👋 ${n} entra nella crew`, `gruppo «${g}»`], change: (ti, w, p) => [`✏️ «${ti}» è cambiato`, `nuovo piano: ${w} · ${p}`], surprise: "sorpresa 🎁" },
  cs: { sos: (n, ti, p) => ["🆘 " + n + " potřebuje podporu", ti + (p ? " · " + p : "")], reveal: (ti, w, p) => ["🎁 Překvapení odhaleno!", `${ti}: ${p} · začátek ${w}`], album: (ti) => ["📸 Drop začal!", `Přidej fotku do alba: ${ti}`], kreq: (n) => [`👋 ${n} si tě chce přidat`, "Otevři Squad a přijmi"], kacc: (n) => [`🤝 ${n} přijal(a) žádost`, "Teď jste v kontaktech"], kinv: (n, ti, g) => [`👋 ${n} tě zve ${g ? "do skupiny" : "na drop"}`, ti], remind: (ti, w, p) => [`⏰ Asi za 30 min: ${ti}`, `začátek ${w} · ${p}`], rjoin: (n) => `⚡ ${n} se přidává`, rleft: (n) => `👋 ${n} odpadá`, reply: (ti) => `odpovědi na „${ti}“`, join: (n, g) => [`👋 ${n} se přidává k partě`, `skupina „${g}“`], change: (ti, w, p) => [`✏️ Změna v „${ti}“`, `nový plán: ${w} · ${p}`], surprise: "překvapení 🎁" },
  uk: { sos: (n, ti, p) => ["🆘 " + n + " потрібна підтримка", ti + (p ? " · " + p : "")], reveal: (ti, w, p) => ["🎁 Сюрприз розкрито!", `${ti}: ${p} · початок ${w}`], album: (ti) => ["📸 Дроп розпочався!", `Додай фото в альбом: ${ti}`], kreq: (n) => [`👋 ${n} хоче додати тебе`, "Відкрий Squad, щоб прийняти"], kacc: (n) => [`🤝 ${n} прийняв(ла) запит`, "Тепер ви в контактах"], kinv: (n, ti, g) => [`👋 ${n} запрошує тебе ${g ? "в групу" : "на дроп"}`, ti], remind: (ti, w, p) => [`⏰ Приблизно за 30 хв: ${ti}`, `початок ${w} · ${p}`], rjoin: (n) => `⚡ ${n} приєднується`, rleft: (n) => `👋 ${n} виходить`, reply: (ti) => `відповіді на «${ti}»`, join: (n, g) => [`👋 ${n} приєднується до компанії`, `група «${g}»`], change: (ti, w, p) => [`✏️ Зміна в «${ti}»`, `новий план: ${w} · ${p}`], surprise: "сюрприз 🎁" },
};
const ST = { in: "IN ⚡", out: "OUT" };

// ---------- narzędzia ----------
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uStr = (s) => b64u(new TextEncoder().encode(s));
const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const cut = (s, n = 110) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const json = (o, st = 200, h = {}) => new Response(JSON.stringify(o), { status: st, headers: { "Content-Type": "application/json", ...h } });

// ---------- weryfikacja tokenu logowania Firebase ----------
let JWKS = null, JWKS_AT = 0;
async function verifyIdToken(tok, pid) {
  const [h, p, sig] = tok.split(".");
  const head = JSON.parse(new TextDecoder().decode(fromB64u(h))), pay = JSON.parse(new TextDecoder().decode(fromB64u(p)));
  const now = Date.now() / 1000;
  if (pay.aud !== pid || pay.iss !== `https://securetoken.google.com/${pid}` || !pay.sub || pay.exp < now - 60 || pay.iat > now + 300) throw new Error("token");
  if (!JWKS || Date.now() - JWKS_AT > 36e5) { JWKS = (await (await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")).json()).keys; JWKS_AT = Date.now(); }
  const jwk = JWKS.find((k) => k.kid === head.kid); if (!jwk) throw new Error("kid");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, fromB64u(sig), new TextEncoder().encode(h + "." + p));
  if (!ok) throw new Error("sig");
  return pay.sub;
}

// ---------- token dostępu konta usługi (Firestore + FCM) ----------
let ACC = null, ACC_EXP = 0;
async function access(sa) {
  if (ACC && Date.now() < ACC_EXP) return ACC;
  const now = Math.floor(Date.now() / 1000);
  const head = b64uStr(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64uStr(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = b64u(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(head + "." + claim)));
  const r = await (await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${head}.${claim}.${sig}` })).json();
  if (!r.access_token) throw new Error("oauth " + JSON.stringify(r).slice(0, 200));
  ACC = r.access_token; ACC_EXP = Date.now() + 50 * 60e3; return ACC;
}

// ---------- Firestore (REST) ----------
const val = (v) => v == null ? null : "stringValue" in v ? v.stringValue : "integerValue" in v ? +v.integerValue : "doubleValue" in v ? v.doubleValue : "booleanValue" in v ? v.booleanValue
  : "timestampValue" in v ? Date.parse(v.timestampValue) : "nullValue" in v ? null : "mapValue" in v ? obj(v.mapValue.fields || {}) : "arrayValue" in v ? (v.arrayValue.values || []).map(val) : null;
const obj = (f) => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, val(v)]));
function fs(env) {
  const base = `https://firestore.googleapis.com/v1/projects/${env.PID}/databases/(default)/documents/`;
  const H = async () => ({ Authorization: "Bearer " + (await access(env.SA)) });
  return {
    get: async (path) => { const r = await fetch(base + path, { headers: await H() }); if (!r.ok) return null; const d = await r.json(); return { ...obj(d.fields), id: d.name.split("/").pop() }; },
    list: async (path) => { const r = await fetch(base + path + "?pageSize=300", { headers: await H() }); if (!r.ok) return []; const d = await r.json(); return (d.documents || []).map((x) => ({ ...obj(x.fields), id: x.name.split("/").pop() })); },
    del: async (path) => { await fetch(base + path, { method: "DELETE", headers: await H() }).catch(() => {}); },
  };
}

// ---------- dziennik (Firestore: pushlog) ----------
async function logEv(env, o) {
  try {
    const fields = Object.fromEntries(Object.entries({ ...o, at: new Date().toISOString() }).map(([k, v]) => [k, typeof v === "number" ? { integerValue: String(v) } : { stringValue: String(v ?? "").slice(0, 500) }]));
    await fetch(`https://firestore.googleapis.com/v1/projects/${env.PID}/databases/(default)/documents/pushlog`, { method: "POST", headers: { Authorization: "Bearer " + (await access(env.SA)), "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
  } catch {}
}

// ---------- wysyłka ----------
async function notify(env, db, uids, kind, build, link, from, muteKey) {
  // duża ikona = awatar osoby, która napisała (albo logo Squad)
  let icon = `https://${env.PID}.web.app/icon-192.png`;
  if (from) { const f = await db.get(`users/${from}`); if (f && f.avUrl) icon = f.avUrl; else if (f && f.avImg) icon = `${env.SELF}/av/${from}?v=${f.avV || 0}`; }
  let sent = 0; const st = env.stats = { to: 0, users: 0, toks: 0, errs: [] };
  await Promise.all([...new Set(uids)].filter(Boolean).map(async (uid) => {
    st.to++; const u = await db.get(`users/${uid}`); if (!u) { st.errs.push("brak profilu " + uid.slice(0, 6)); return; }
    if (kind && u.notif && u.notif[kind] === false) { st.errs.push("wyłączone " + uid.slice(0, 6)); return; }
    if (muteKey && u.muted && u.muted[muteKey]) { st.errs.push("wyciszony czat " + uid.slice(0, 6)); return; }
    const toks = await db.list(`users/${uid}/tokens`); st.users++; if (!toks.length) { st.errs.push("brak tokenu " + uid.slice(0, 6)); return; } st.toks += toks.length;
    const L = TX[u.lang] ? u.lang : "en", [title, body] = build(TX[L], L);
    await Promise.all(toks.map(async (t) => {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${env.PID}/messages:send`, {
        method: "POST", headers: { Authorization: "Bearer " + (await access(env.SA)), "Content-Type": "application/json" },
        body: JSON.stringify(t.ios ? { message: { token: t.id, notification: { title, body }, data: { url: link }, apns: { headers: { "apns-priority": "10" }, payload: { aps: { sound: "default" } } } } } : t.native && t.cap ? { message: { token: t.id, notification: { title, body }, data: { url: link }, android: { priority: "HIGH", ttl: "86400s", notification: { channel_id: "squad", sound: "default", tag: link, color: "#FF4F86", notification_priority: "PRIORITY_HIGH" } } } } : t.native && verGE(t.v, "1.0.7") ? { message: { token: t.id, data: { title, body, url: link, tag: link, icon }, android: { priority: "HIGH", ttl: "86400s" } } } : { message: { token: t.id, notification: { title, body }, data: { url: link }, ...(t.native ? { android: { priority: "HIGH", notification: { channel_id: "squad", sound: "default", tag: link, default_vibrate_timings: true, color: "#FF4F86", icon: "ic_stat_squad", notification_priority: "PRIORITY_HIGH" } } } : {}),
          webpush: { headers: { Urgency: "high", TTL: "86400" }, fcm_options: { link: `https://${env.PID}.web.app${link}` },
            notification: { icon, badge: `https://${env.PID}.web.app/badge-96.png`, tag: link, renotify: true, vibrate: [200, 100, 200], silent: false, timestamp: Date.now() } } } }),
      });
      if (r.ok) { sent++; return; }
      const e = await r.text(); st.errs.push("FCM " + r.status + " " + e.slice(0, 160)); if (/UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT/.test(e)) await db.del(`users/${uid}/tokens/${t.id}`);
    }));
  }));
  return sent;
}
const verGE = (v, min) => { const a = String(v || "0").split(".").map(Number), b = min.split(".").map(Number); for (let i = 0; i < 3; i++) { if ((a[i] || 0) !== b[i]) return (a[i] || 0) > b[i]; } return true; };
const hhmm = (ms) => new Date(ms).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });
const isCode = (s) => typeof s === "string" && /^[A-Za-z0-9_-]{3,40}$/.test(s);

async function handle(env, uid, b) {
  const db = fs(env);
  if (b.kind === "msg" && isCode(b.code) && isCode(b.id)) {           // nowa wiadomość w czacie dropa albo grupy
    const G = !!b.group, root = G ? `groups/${b.code}` : `drops/${b.code}`;
    const m = await db.get(`${root}/messages/${b.id}`); if (!m || m.authorId !== uid) return 0;
    const chat = await db.get(root); if (!chat) return 0;
    const ppl = (await db.list(`${root}/${G ? "members" : "participants"}`)).filter((p) => p.id !== uid);
    const title = G ? chat.name : chat.title;
    return notify(env, db, ppl.map((p) => p.id), "chat", () => [`${m.nickname} · ${title}`, cut(m.text, 140)], G ? `/gc/${b.code}` : `/c/${b.code}`, uid, (G ? "g_" : "") + b.code);
  }
  if (b.kind === "rsp" && isCode(b.code)) {                            // odpowiedź IN / LATE / OUT -> autor dropa i reszta ekipy
    const d = await db.get(`drops/${b.code}`), p = await db.get(`drops/${b.code}/participants/${uid}`);
    if (!d || !p) return 0;
    const isIn = (x) => x === "in" || x === "late", prev = typeof b.prev === "string" ? b.prev : "";
    const st = p.status === "late" ? `LATE ${p.etaMin || 15} min` : ST[p.status] || p.status;
    // kogo powiadomić: organizator + osoby, które są IN / LATE (poza autorem akcji)
    const crew = (await db.list(`drops/${b.code}/participants`)).filter((x) => x.id !== uid && isIn(x.status)).map((x) => x.id);
    const to = [...new Set([d.hostId, ...crew])].filter((x) => x && x !== uid);
    if (isIn(p.status) && !isIn(prev)) return notify(env, db, to, "rsp", (T) => [p.status === "late" ? `${p.nickname}: ${st}` : T.rjoin(p.nickname), d.title], `/d/${b.code}`, uid, b.code);
    if (p.status === "out" && isIn(prev)) return notify(env, db, to, "rsp", (T) => [T.rleft(p.nickname), d.title], `/d/${b.code}`, uid, b.code);
    if (d.hostId === uid) return 0;
    return notify(env, db, [d.hostId], "rsp", (T) => [`${p.nickname}: ${st}`, T.reply(d.title)], `/d/${b.code}`, uid, b.code);   // zmiana IN<->LATE / odrzucone zaproszenie -> tylko organizator
  }
  if (b.kind === "join" && isCode(b.code)) {                           // nowa osoba w grupie
    const g = await db.get(`groups/${b.code}`), me = await db.get(`groups/${b.code}/members/${uid}`); if (!g || !me) return 0;
    const ppl = (await db.list(`groups/${b.code}/members`)).filter((p) => p.id !== uid);
    return notify(env, db, ppl.map((p) => p.id), "grp", (T) => T.join(me.nickname, g.name), `/g/${b.code}`, uid);
  }
  if (b.kind === "report" && typeof b.id === "string" && /^[A-Za-z0-9]{10,40}$/.test(b.id)) {   // zgłoszenie -> e-mail do administratora
    const r = await db.get(`reports/${b.id}`); if (!r || r.reporterId !== uid || r.mailed) return 0;
    const R = { hate: "Hejt / nękanie", sex: "Treści seksualne", vio: "Przemoc", danger: "Niebezpieczne / nielegalne", spam: "Spam / oszustwo", other: "Inne" };
    const T = { message: "wiadomość na czacie", drop: "drop", group: "grupa", photo: "zdjęcie w albumie" };
    const where = r.code ? (r.chat === "group" || r.target === "group" ? `https://${env.PID}.web.app/g/${r.code}` : `https://${env.PID}.web.app/d/${r.code}`) : "-";
    const res = await fetch("https://formsubmit.co/ajax/cubemobilegame@gmail.com", { method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Origin: `https://${env.PID}.web.app`, Referer: `https://${env.PID}.web.app/` },
      body: JSON.stringify({ _subject: `Squad – nowe zgłoszenie: ${R[r.reason] || r.reason}`, _template: "table", _captcha: "false",
        "Powód": R[r.reason] || r.reason, "Co zgłoszono": T[r.target] || r.target || "-", "Gdzie": where,
        "Szczegóły (Firebase)": `https://console.firebase.google.com/project/${env.PID}/firestore/data/~2Freports~2F${b.id}`,
        "Czas": new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" }) }) });
    const txt = await res.text().catch(() => ""); env.stats = { to: 1, toks: 0, errs: res.ok ? [] : ["mail " + res.status + " " + txt.slice(0, 120)] };
    return res.ok ? 1 : 0;
  }
  const isUid = (x) => typeof x === "string" && /^[A-Za-z0-9]{10,40}$/.test(x);
  if (b.kind === "creq" && isUid(b.to)) {                              // zaproszenie do kontaktów
    const r = await db.get(`creq/${uid}_${b.to}`); if (!r) return 0;
    return notify(env, db, [b.to], null, (T) => T.kreq(r.nickname), "/k", uid);
  }
  if (b.kind === "cacc" && isUid(b.to)) {                              // przyjęte zaproszenie do kontaktów
    const c = await db.get(`users/${b.to}/contacts/${uid}`); if (!c) return 0;
    return notify(env, db, [b.to], null, (T) => T.kacc(c.nickname), "/k", uid);
  }
  if (b.kind === "inv" && Array.isArray(b.to) && isCode(b.code) && (b.k === "d" || b.k === "g")) {   // zaproszenie z kontaktów na drop / do grupy
    const ok = []; let iv = null;
    for (const x of b.to.slice(0, 50)) { if (!isUid(x)) continue; const i = await db.get(`users/${x}/invites/${b.k}_${b.code}`); if (i && i.from === uid) { ok.push(x); iv = i; } }
    if (!iv) return 0;
    return notify(env, db, ok, null, (T) => T.kinv(iv.nickname, iv.title, b.k === "g"), `/${b.k}/${b.code}`, uid);
  }
  if (b.kind === "sos" && b.a && typeof b.a === "object") {            // przycisk bezpieczeństwa -> zaufane osoby (alert musi istnieć, od nadawcy, świeży)
    const ok = []; let al = null;
    for (const [x, aid] of Object.entries(b.a).slice(0, 3)) {
      if (!isUid(x) || typeof aid !== "string" || !/^[A-Za-z0-9]{10,40}$/.test(aid)) continue;
      const a = await db.get(`users/${x}/alerts/${aid}`);
      if (a && a.from === uid && a.kind === "sos" && Date.now() - Number(a.at || 0) < 120000) { ok.push(x); al = a; }
    }
    if (!al) return 0;
    return notify(env, db, ok, null, (T) => T.sos(String(al.nick || "Squad").slice(0, 40), String(al.title || "").slice(0, 80), String(al.place || "").slice(0, 80)), al.code ? `/d/${al.code}` : "/", uid);
  }
  if (b.kind === "edit" && isCode(b.code)) {                           // autor zmienił godzinę / miejsce
    const d = await db.get(`drops/${b.code}`); if (!d || d.hostId !== uid) return 0;
    const ppl = (await db.list(`drops/${b.code}/participants`)).filter((p) => p.id !== uid && p.status !== "out");
    return notify(env, db, ppl.map((p) => p.id), null, (T) => T.change(d.title, hhmm(d.startsAt), d.surprise && d.startsAt - Date.now() > 36e5 ? T.surprise : d.place), `/d/${b.code}`, uid);
  }
  return 0;
}

// awatar do powiadomień: /av/<uid> -> PNG zapisany przez aplikację w users/<uid>.avImg
async function avatar(envRaw, uid) {
  try {
    if (!/^[A-Za-z0-9]{10,40}$/.test(uid)) return new Response("", { status: 404 });
    const SA = JSON.parse(envRaw.FIREBASE_SA), u = await fs({ SA, PID: SA.project_id }).get(`users/${uid}`);
    const m = u && typeof u.avImg === "string" && u.avImg.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
    if (!m) return Response.redirect(`https://${SA.project_id}.web.app/icon-192.png`, 302);
    const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    return new Response(bin, { headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=604800" } });
  } catch { return new Response("", { status: 500 }); }
}

// "Dodaj do kalendarza" dla iPhone'a (aplikacja z ekranu początkowego nie otwiera plików z pamięci)
function ics(q) {
  const s = +q.get("s"), e = +q.get("e") || s + 7200000; if (!s || s < 1.5e12 || s > 4e12) return new Response("bad", { status: 400 });
  const z = (x) => new Date(x).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""), f = (x, n = 300) => String(x || "").slice(0, n).replace(/[\\;,]/g, (m) => "\\" + m).replace(/[\r\n]+/g, " ");
  const u = /^https:\/\/[a-z0-9.-]+\/[A-Za-z0-9/_-]*$/.test(q.get("u") || "") ? q.get("u") : "";
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Squad//PL", "METHOD:PUBLISH", "BEGIN:VEVENT", `UID:${s}-${Math.abs([...(u + q.get("t")).slice(0, 80)].reduce((h, c) => h * 31 + c.charCodeAt(0) | 0, 7))}@squad`, "DTSTAMP:" + z(Date.now()), "DTSTART:" + z(s), "DTEND:" + z(e),
    "SUMMARY:" + f(q.get("t"), 120), "LOCATION:" + f(q.get("l"), 200), "DESCRIPTION:" + f(q.get("d"), 300), ...(u ? ["URL:" + u] : []), "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:" + f(q.get("t"), 120), "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="squad-drop.ics"', "Cache-Control": "no-store" } });
}


// ---------- przypomnienia ok. 30 min przed startem (Cloudflare Cron co 5 min – GitHub Actions bywa spóźniony o godziny) ----------
async function reminders(envRaw) {
  const SA = JSON.parse(envRaw.FIREBASE_SA), env = { SA, PID: SA.project_id, SELF: "https://squad-push.workers.dev" }, db = fs(env);
  const now = Date.now(), H = { Authorization: "Bearer " + (await access(SA)), "Content-Type": "application/json" };
  const base = `https://firestore.googleapis.com/v1/projects/${env.PID}/databases/(default)/documents`;
  const q = { structuredQuery: { from: [{ collectionId: "drops" }], where: { compositeFilter: { op: "AND", filters: [
    { fieldFilter: { field: { fieldPath: "startsAt" }, op: "GREATER_THAN_OR_EQUAL", value: { timestampValue: new Date(now + 5 * 6e4).toISOString() } } },
    { fieldFilter: { field: { fieldPath: "startsAt" }, op: "LESS_THAN_OR_EQUAL", value: { timestampValue: new Date(now + 40 * 6e4).toISOString() } } }] } }, limit: 200 } };
  const rows = await (await fetch(base + ":runQuery", { method: "POST", headers: H, body: JSON.stringify(q) })).json();
  let n = 0;
  for (const r of rows || []) {
    if (!r.document) continue; const id = r.document.name.split("/").pop(), d = obj(r.document.fields);
    if (d.reminded) continue;
    // najpierw znacznik (z warunkiem aktualnej wersji dokumentu), żeby nie wysłać dwa razy razem z automatem z GitHuba
    const up = await fetch(`${base}/drops/${id}?updateMask.fieldPaths=reminded&currentDocument.updateTime=${encodeURIComponent(r.document.updateTime)}`, { method: "PATCH", headers: H, body: JSON.stringify({ fields: { reminded: { booleanValue: true } } }) });
    if (!up.ok) continue;
    const to = (await db.list(`drops/${id}/participants`)).filter((p) => p.status === "in" || p.status === "late").map((p) => p.id);
    n += await notify(env, db, to, "rem", (T) => T.remind(d.title, hhmm(d.startsAt), d.place), `/d/${id}`);
  }
  // album: tuż po starcie dropu – zaproszenie do wrzucenia zdjęcia
  const q2 = { structuredQuery: { from: [{ collectionId: "drops" }], where: { compositeFilter: { op: "AND", filters: [
    { fieldFilter: { field: { fieldPath: "startsAt" }, op: "GREATER_THAN_OR_EQUAL", value: { timestampValue: new Date(now - 20 * 6e4).toISOString() } } },
    { fieldFilter: { field: { fieldPath: "startsAt" }, op: "LESS_THAN_OR_EQUAL", value: { timestampValue: new Date(now).toISOString() } } }] } }, limit: 200 } };
  const rows2 = await (await fetch(base + ":runQuery", { method: "POST", headers: H, body: JSON.stringify(q2) })).json();
  for (const r of rows2 || []) {
    if (!r.document) continue; const id = r.document.name.split("/").pop(), d = obj(r.document.fields);
    if (d.albumPing) continue;
    const up = await fetch(`${base}/drops/${id}?updateMask.fieldPaths=albumPing&currentDocument.updateTime=${encodeURIComponent(r.document.updateTime)}`, { method: "PATCH", headers: H, body: JSON.stringify({ fields: { albumPing: { booleanValue: true } } }) });
    if (!up.ok) continue;
    const to = (await db.list(`drops/${id}/participants`)).filter((p) => p.status === "in" || p.status === "late").map((p) => p.id);
    n += await notify(env, db, to, "rem", (T) => T.album(d.title), `/d/${id}`);
  }
  // niespodzianka: godzinę przed startem miejsce jest odsłaniane – powiadomienie (klient pokazuje je od tej samej chwili)
  const q3 = { structuredQuery: { from: [{ collectionId: "drops" }], where: { compositeFilter: { op: "AND", filters: [
    { fieldFilter: { field: { fieldPath: "startsAt" }, op: "GREATER_THAN" , value: { timestampValue: new Date(now).toISOString() } } },
    { fieldFilter: { field: { fieldPath: "startsAt" }, op: "LESS_THAN_OR_EQUAL", value: { timestampValue: new Date(now + 60 * 6e4).toISOString() } } }] } }, limit: 200 } };
  const rows3 = await (await fetch(base + ":runQuery", { method: "POST", headers: H, body: JSON.stringify(q3) })).json();
  for (const r of rows3 || []) {
    if (!r.document) continue; const id = r.document.name.split("/").pop(), d = obj(r.document.fields);
    if (!d.surprise || d.revealPing) continue;
    const up = await fetch(`${base}/drops/${id}?updateMask.fieldPaths=revealPing&currentDocument.updateTime=${encodeURIComponent(r.document.updateTime)}`, { method: "PATCH", headers: H, body: JSON.stringify({ fields: { revealPing: { booleanValue: true } } }) });
    if (!up.ok) continue;
    const to = (await db.list(`drops/${id}/participants`)).filter((p) => p.status === "in" || p.status === "late").map((p) => p.id).filter((x) => x !== d.hostId);
    n += await notify(env, db, to, "rem", (T) => T.reveal(d.title, hhmm(d.startsAt), d.place), `/d/${id}#map`);
  }
  if (n) await logEv(env, { kind: "rem", sent: n });
}

// ---------- e-mail w dniu premiery do osób zapisanych na stronie getsquad.web.app (Brevo; sekret BREVO_KEY) ----------
const MAIL = {
  pl: { s: "Squad jest już dostępny! 🎉", h: "Zbierz ekipę. Wbijajcie razem.", p: "Obiecaliśmy, że napiszemy raz, w dniu premiery. Squad już działa – jeden link i odpowiedź IN, LATE albo OUT. Znajomi nie muszą nic instalować.",
    a: "Pobierz na Androida", w: "Otwórz w przeglądarce (iPhone: Udostępnij → Do ekranu początkowego)", f: "To jedyna wiadomość, jaką od nas dostaniesz – wysłaliśmy ją, bo zapisałeś(-aś) się na getsquad.web.app. Twój adres e-mail usuwamy zaraz po wysyłce. Pytania: cubemobilegame@gmail.com" },
  en: { s: "Squad is live! 🎉", h: "Get your crew together. Show up together.", p: "We promised to write once, on launch day. Squad is live – one link and an IN, LATE or OUT reply. Friends don’t need to install anything.",
    a: "Get it on Android", w: "Open in your browser (iPhone: Share → Add to Home Screen)", f: "This is the only message you’ll get from us – you signed up at getsquad.web.app. We delete your e-mail address right after sending. Questions: cubemobilegame@gmail.com" },
};
const mailHtml = (T) => `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:28px;background:#0b0b12;color:#fff;border-radius:20px"><div style="font-size:30px;font-weight:900;letter-spacing:-1px">Squad <span style="color:#FF4F86">✦</span></div><h1 style="font-size:24px;margin:22px 0 10px">${T.h}</h1><p style="color:#c8c8d4;line-height:1.55;font-size:16px">${T.p}</p><p style="margin:24px 0 10px"><a href="https://play.google.com/store/apps/details?id=com.cubemobilegames.squad" style="background:#FF4F86;color:#fff;text-decoration:none;padding:14px 22px;border-radius:99px;font-weight:700;display:inline-block">${T.a}</a></p><p style="margin:6px 0 22px"><a href="https://squad-64cd5.web.app" style="color:#ff9bbd;font-size:15px">${T.w}</a></p><p style="color:#8a8a99;font-size:12px;line-height:1.5">${T.f}</p></div>`;

async function launchMail(envRaw) {
  const at = Date.parse(envRaw.LAUNCH_AT || ""), now = Date.now();
  if (!envRaw.BREVO_KEY || !at || now < at || now > at + 14 * 864e5) return;           // jeszcze nie czas / brak klucza / okno 14 dni minęło
  const SA = JSON.parse(envRaw.FIREBASE_SA), PID = SA.project_id, tok = await access(SA);
  const H = { Authorization: "Bearer " + tok, "Content-Type": "application/json" };
  const base = `https://firestore.googleapis.com/v1/projects/${PID}/databases/(default)/documents`;
  const r = await fetch(`${base}/waitlist?pageSize=60`, { headers: H }); if (!r.ok) return;
  const docs = (await r.json()).documents || []; let ok = 0, bad = 0;
  for (const d of docs) {
    const id = d.name.split("/").pop(), v = obj(d.fields); if (v.sent === true || !v.email) continue;
    // zajmij wpis (warunek aktualnej wersji) – dwa równoległe uruchomienia nie wyślą dwa razy
    const claim = await fetch(`${base}/waitlist/${id}?updateMask.fieldPaths=sent&currentDocument.updateTime=${encodeURIComponent(d.updateTime)}`, { method: "PATCH", headers: H, body: JSON.stringify({ fields: { sent: { booleanValue: true } } }) });
    if (!claim.ok) continue;
    const T = MAIL[v.lang] || MAIL.pl;
    const res = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": envRaw.BREVO_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sender: { name: "Squad", email: envRaw.MAIL_FROM || "cubemobilegame@gmail.com" }, to: [{ email: v.email }], replyTo: { email: "cubemobilegame@gmail.com" }, subject: T.s, htmlContent: mailHtml(T) }) });
    if (res.ok) { ok++; await fetch(`${base}/waitlist/${id}`, { method: "DELETE", headers: H }).catch(() => {}); }   // po wysyłce adres usuwamy
    else { bad++; await fetch(`${base}/waitlist/${id}?updateMask.fieldPaths=sent`, { method: "PATCH", headers: H, body: JSON.stringify({ fields: { sent: { booleanValue: false } } }) }).catch(() => {}); }
  }
  if (ok || bad) await logEv({ SA, PID }, { kind: "launchmail", sent: ok, errs: bad ? bad + " nieudanych (limit Brevo/błąd)" : "" });
}

export default {
  async scheduled(ev, envRaw, ctx) { ctx.waitUntil(launchMail(envRaw).catch(() => {})); ctx.waitUntil(reminders(envRaw).catch((e) => logEv({ SA: JSON.parse(envRaw.FIREBASE_SA), PID: JSON.parse(envRaw.FIREBASE_SA).project_id }, { kind: "rem", err: e.message }))); },
  async fetch(req, envRaw, ctx) {
    const origin = req.headers.get("Origin") || "", allow = ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.squad-64cd5\.web\.app$/.test(origin);
    const cors = { "Access-Control-Allow-Origin": allow ? origin : ORIGINS[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Max-Age": "86400" };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/ics") return ics(url.searchParams);
    if (req.method === "GET" && url.pathname.startsWith("/av/")) return avatar(envRaw, url.pathname.slice(4));
    if (req.method === "GET" && url.pathname === "/geo") { const c = req.cf || {}; return json(c.latitude ? { la: +c.latitude, lo: +c.longitude } : {}, 200, cors); }
    if (req.method === "GET") return json({ ok: true, app: "squad-push" }, 200, cors);
    if (req.method !== "POST" || url.pathname !== "/notify") return json({ error: "not found" }, 404, cors);
    let env;
    try { const SA = JSON.parse(envRaw.FIREBASE_SA); env = { SA, PID: SA.project_id, SELF: url.origin }; } catch { return json({ error: "config" }, 500, cors); }
    try {
      const tok = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      const uid = await verifyIdToken(tok, env.PID);
      const body = await req.json();
      if (body.kind === "test") {
        const db = fs(env);
        const n = await notify(env, db, [uid], null, () => ["🔔 Squad – test", "Powiadomienia działają! ✓"], "/me");
        const r = { sent: n, toks: env.stats.toks, errs: env.stats.errs };
        ctx.waitUntil(logEv(env, { kind: "test", from: uid.slice(0, 8), sent: n, to: 1, toks: env.stats.toks, errs: env.stats.errs.join(" | ") }));
        return json(r, 200, cors);
      }
      ctx.waitUntil(handle(env, uid, body).then((n) => logEv(env, { kind: body.kind, code: body.code, from: uid.slice(0, 8), sent: n || 0, to: env.stats ? env.stats.to : 0, toks: env.stats ? env.stats.toks : 0, errs: env.stats ? env.stats.errs.join(" | ") : "brak odbiorców / odrzucone" })).catch((e) => logEv(env, { kind: body.kind, code: body.code, from: uid.slice(0, 8), err: e.message })));
      return json({ ok: true }, 202, cors);
    } catch (e) { return json({ error: "auth" }, 401, cors); }
  },
};
