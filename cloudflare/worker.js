// Squad – natychmiastowe powiadomienia push (Cloudflare Workers, plan darmowy).
// Aplikacja po wysłaniu wiadomości / odpowiedzi IN-LATE-OUT / dołączeniu do grupy / zmianie dropa woła POST /notify.
// Worker sprawdza token logowania Firebase, czyta dane z Firestore i wysyła powiadomienia przez Firebase Cloud Messaging.
// Sekret: FIREBASE_SA (cały plik JSON konta usługi Firebase).

const ORIGINS = ["https://squad-64cd5.web.app", "https://squad-64cd5.firebaseapp.com", "http://localhost:8766"];
const TX = {
  pl: { kreq: (n) => [`👋 ${n} chce dodać cię do kontaktów`, "Otwórz Squad, żeby przyjąć"], kacc: (n) => [`🤝 ${n} przyjmuje zaproszenie`, "Jesteście w kontaktach – łatwo zaprosicie się do dropów"], kinv: (n, ti, g) => [`👋 ${n} zaprasza cię ${g ? "do grupy" : "na drop"}`, ti], remind: (ti, w, p) => [`⏰ Za ok. 30 min: ${ti}`, `start ${w} · ${p}`], reply: (ti) => `odpowiedzi w dropie „${ti}”`, join: (n, g) => [`👋 ${n} dołącza do ekipy`, `grupa „${g}”`], change: (ti, w, p) => [`✏️ Zmiana w dropie „${ti}”`, `nowy plan: ${w} · ${p}`], surprise: "niespodzianka 🎁" },
  en: { kreq: (n) => [`👋 ${n} wants to add you`, "Open Squad to accept"], kacc: (n) => [`🤝 ${n} accepted your request`, "You're contacts now – inviting each other is easy"], kinv: (n, ti, g) => [`👋 ${n} invites you ${g ? "to a group" : "to a drop"}`, ti], remind: (ti, w, p) => [`⏰ In about 30 min: ${ti}`, `starts ${w} · ${p}`], reply: (ti) => `replies to “${ti}”`, join: (n, g) => [`👋 ${n} joined the crew`, `group “${g}”`], change: (ti, w, p) => [`✏️ “${ti}” has changed`, `new plan: ${w} · ${p}`], surprise: "surprise 🎁" },
  es: { kreq: (n) => [`👋 ${n} quiere añadirte`, "Abre Squad para aceptar"], kacc: (n) => [`🤝 ${n} aceptó tu solicitud`, "Ya sois contactos"], kinv: (n, ti, g) => [`👋 ${n} te invita ${g ? "a un grupo" : "a un drop"}`, ti], remind: (ti, w, p) => [`⏰ En unos 30 min: ${ti}`, `empieza ${w} · ${p}`], reply: (ti) => `respuestas en «${ti}»`, join: (n, g) => [`👋 ${n} se une a la crew`, `grupo «${g}»`], change: (ti, w, p) => [`✏️ Cambio en «${ti}»`, `nuevo plan: ${w} · ${p}`], surprise: "sorpresa 🎁" },
  de: { kreq: (n) => [`👋 ${n} will dich hinzufügen`, "Öffne Squad zum Annehmen"], kacc: (n) => [`🤝 ${n} hat angenommen`, "Ihr seid jetzt Kontakte"], kinv: (n, ti, g) => [`👋 ${n} lädt dich ${g ? "in eine Gruppe" : "zu einem Drop"} ein`, ti], remind: (ti, w, p) => [`⏰ In ca. 30 Min.: ${ti}`, `Start ${w} · ${p}`], reply: (ti) => `Antworten zu „${ti}“`, join: (n, g) => [`👋 ${n} ist jetzt in der Crew`, `Gruppe „${g}“`], change: (ti, w, p) => [`✏️ „${ti}“ wurde geändert`, `neuer Plan: ${w} · ${p}`], surprise: "Überraschung 🎁" },
  fr: { kreq: (n) => [`👋 ${n} veut t'ajouter`, "Ouvre Squad pour accepter"], kacc: (n) => [`🤝 ${n} a accepté`, "Vous êtes maintenant contacts"], kinv: (n, ti, g) => [`👋 ${n} t'invite ${g ? "dans un groupe" : "à un drop"}`, ti], remind: (ti, w, p) => [`⏰ Dans 30 min environ : ${ti}`, `début ${w} · ${p}`], reply: (ti) => `réponses à « ${ti} »`, join: (n, g) => [`👋 ${n} rejoint la team`, `groupe « ${g} »`], change: (ti, w, p) => [`✏️ « ${ti} » a changé`, `nouveau plan : ${w} · ${p}`], surprise: "surprise 🎁" },
  it: { kreq: (n) => [`👋 ${n} vuole aggiungerti`, "Apri Squad per accettare"], kacc: (n) => [`🤝 ${n} ha accettato`, "Ora siete contatti"], kinv: (n, ti, g) => [`👋 ${n} ti invita ${g ? "in un gruppo" : "a un drop"}`, ti], remind: (ti, w, p) => [`⏰ Tra circa 30 min: ${ti}`, `inizio ${w} · ${p}`], reply: (ti) => `risposte a «${ti}»`, join: (n, g) => [`👋 ${n} entra nella crew`, `gruppo «${g}»`], change: (ti, w, p) => [`✏️ «${ti}» è cambiato`, `nuovo piano: ${w} · ${p}`], surprise: "sorpresa 🎁" },
  cs: { kreq: (n) => [`👋 ${n} si tě chce přidat`, "Otevři Squad a přijmi"], kacc: (n) => [`🤝 ${n} přijal(a) žádost`, "Teď jste v kontaktech"], kinv: (n, ti, g) => [`👋 ${n} tě zve ${g ? "do skupiny" : "na drop"}`, ti], remind: (ti, w, p) => [`⏰ Asi za 30 min: ${ti}`, `začátek ${w} · ${p}`], reply: (ti) => `odpovědi na „${ti}“`, join: (n, g) => [`👋 ${n} se přidává k partě`, `skupina „${g}“`], change: (ti, w, p) => [`✏️ Změna v „${ti}“`, `nový plán: ${w} · ${p}`], surprise: "překvapení 🎁" },
  uk: { kreq: (n) => [`👋 ${n} хоче додати тебе`, "Відкрий Squad, щоб прийняти"], kacc: (n) => [`🤝 ${n} прийняв(ла) запит`, "Тепер ви в контактах"], kinv: (n, ti, g) => [`👋 ${n} запрошує тебе ${g ? "в групу" : "на дроп"}`, ti], remind: (ti, w, p) => [`⏰ Приблизно за 30 хв: ${ti}`, `початок ${w} · ${p}`], reply: (ti) => `відповіді на «${ti}»`, join: (n, g) => [`👋 ${n} приєднується до компанії`, `група «${g}»`], change: (ti, w, p) => [`✏️ Зміна в «${ti}»`, `новий план: ${w} · ${p}`], surprise: "сюрприз 🎁" },
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
    get: async (path) => { const r = await fetch(base + path, { headers: await H() }); if (!r.ok) return null; const d = await r.json(); return { id: d.name.split("/").pop(), ...obj(d.fields) }; },
    list: async (path) => { const r = await fetch(base + path + "?pageSize=300", { headers: await H() }); if (!r.ok) return []; const d = await r.json(); return (d.documents || []).map((x) => ({ id: x.name.split("/").pop(), ...obj(x.fields) })); },
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
async function notify(env, db, uids, kind, build, link, from) {
  // duża ikona = awatar osoby, która napisała (albo logo Squad)
  let icon = `https://${env.PID}.web.app/icon-192.png`;
  if (from) { const f = await db.get(`users/${from}`); if (f && f.avUrl) icon = f.avUrl; else if (f && f.avImg) icon = `${env.SELF}/av/${from}?v=${f.avV || 0}`; }
  let sent = 0; const st = env.stats = { to: 0, users: 0, toks: 0, errs: [] };
  await Promise.all([...new Set(uids)].filter(Boolean).map(async (uid) => {
    st.to++; const u = await db.get(`users/${uid}`); if (!u) { st.errs.push("brak profilu " + uid.slice(0, 6)); return; }
    if (kind && u.notif && u.notif[kind] === false) { st.errs.push("wyłączone " + uid.slice(0, 6)); return; }
    const toks = await db.list(`users/${uid}/tokens`); st.users++; if (!toks.length) { st.errs.push("brak tokenu " + uid.slice(0, 6)); return; } st.toks += toks.length;
    const L = TX[u.lang] ? u.lang : "en", [title, body] = build(TX[L], L);
    await Promise.all(toks.map(async (t) => {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${env.PID}/messages:send`, {
        method: "POST", headers: { Authorization: "Bearer " + (await access(env.SA)), "Content-Type": "application/json" },
        body: JSON.stringify(t.native && verGE(t.v, "1.0.7") ? { message: { token: t.id, data: { title, body, url: link, tag: link, icon }, android: { priority: "HIGH", ttl: "86400s" } } } : { message: { token: t.id, notification: { title, body }, data: { url: link }, ...(t.native ? { android: { priority: "HIGH", notification: { channel_id: "squad", sound: "default", tag: link, default_vibrate_timings: true, color: "#FF4F86", icon: "ic_stat_squad", notification_priority: "PRIORITY_HIGH" } } } : {}),
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
    return notify(env, db, ppl.map((p) => p.id), "chat", () => [`${m.nickname} · ${title}`, cut(m.text, 140)], G ? `/gc/${b.code}` : `/c/${b.code}`, uid);
  }
  if (b.kind === "rsp" && isCode(b.code)) {                            // odpowiedź IN / LATE / OUT -> autor dropa
    const d = await db.get(`drops/${b.code}`), p = await db.get(`drops/${b.code}/participants/${uid}`);
    if (!d || !p || d.hostId === uid) return 0;
    const st = p.status === "late" ? `LATE ${p.etaMin || 15} min` : ST[p.status] || p.status;
    return notify(env, db, [d.hostId], "rsp", (T) => [`${p.nickname}: ${st}`, T.reply(d.title)], `/d/${b.code}`, uid);
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
  if (b.kind === "edit" && isCode(b.code)) {                           // autor zmienił godzinę / miejsce
    const d = await db.get(`drops/${b.code}`); if (!d || d.hostId !== uid) return 0;
    const ppl = (await db.list(`drops/${b.code}/participants`)).filter((p) => p.id !== uid && p.status !== "out");
    return notify(env, db, ppl.map((p) => p.id), null, (T) => T.change(d.title, hhmm(d.startsAt), d.surprise ? T.surprise : d.place), `/d/${b.code}`, uid);
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
    n += await notify(env, db, to, "rem", (T) => T.remind(d.title, hhmm(d.startsAt), d.surprise ? T.surprise : d.place), `/d/${id}`);
  }
  if (n) await logEv(env, { kind: "rem", sent: n });
}

export default {
  async scheduled(ev, envRaw, ctx) { ctx.waitUntil(reminders(envRaw).catch((e) => logEv({ SA: JSON.parse(envRaw.FIREBASE_SA), PID: JSON.parse(envRaw.FIREBASE_SA).project_id }, { kind: "rem", err: e.message }))); },
  async fetch(req, envRaw, ctx) {
    const origin = req.headers.get("Origin") || "", allow = ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.squad-64cd5\.web\.app$/.test(origin);
    const cors = { "Access-Control-Allow-Origin": allow ? origin : ORIGINS[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Max-Age": "86400" };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/ics") return ics(url.searchParams);
    if (req.method === "GET" && url.pathname.startsWith("/av/")) return avatar(envRaw, url.pathname.slice(4));
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
