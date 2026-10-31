// SQUAD – natychmiastowe powiadomienia push (Cloudflare Workers, plan darmowy).
// Aplikacja po wysłaniu wiadomości / odpowiedzi IN-LATE-OUT / dołączeniu do grupy / zmianie dropa woła POST /notify.
// Worker sprawdza token logowania Firebase, czyta dane z Firestore i wysyła powiadomienia przez Firebase Cloud Messaging.
// Sekret: FIREBASE_SA (cały plik JSON konta usługi Firebase).

const ORIGINS = ["https://squad-64cd5.web.app", "https://squad-64cd5.firebaseapp.com", "http://localhost:8766"];
const TX = {
  pl: { reply: (ti) => `odpowiedzi w dropie „${ti}”`, join: (n, g) => [`👋 ${n} dołącza do ekipy`, `grupa „${g}”`], change: (ti, w, p) => [`✏️ Zmiana w dropie „${ti}”`, `nowy plan: ${w} · ${p}`], surprise: "niespodzianka 🎁" },
  en: { reply: (ti) => `replies to “${ti}”`, join: (n, g) => [`👋 ${n} joined the crew`, `group “${g}”`], change: (ti, w, p) => [`✏️ “${ti}” has changed`, `new plan: ${w} · ${p}`], surprise: "surprise 🎁" },
  es: { reply: (ti) => `respuestas en «${ti}»`, join: (n, g) => [`👋 ${n} se une a la crew`, `grupo «${g}»`], change: (ti, w, p) => [`✏️ Cambio en «${ti}»`, `nuevo plan: ${w} · ${p}`], surprise: "sorpresa 🎁" },
  de: { reply: (ti) => `Antworten zu „${ti}“`, join: (n, g) => [`👋 ${n} ist jetzt in der Crew`, `Gruppe „${g}“`], change: (ti, w, p) => [`✏️ „${ti}“ wurde geändert`, `neuer Plan: ${w} · ${p}`], surprise: "Überraschung 🎁" },
  fr: { reply: (ti) => `réponses à « ${ti} »`, join: (n, g) => [`👋 ${n} rejoint la team`, `groupe « ${g} »`], change: (ti, w, p) => [`✏️ « ${ti} » a changé`, `nouveau plan : ${w} · ${p}`], surprise: "surprise 🎁" },
  it: { reply: (ti) => `risposte a «${ti}»`, join: (n, g) => [`👋 ${n} entra nella crew`, `gruppo «${g}»`], change: (ti, w, p) => [`✏️ «${ti}» è cambiato`, `nuovo piano: ${w} · ${p}`], surprise: "sorpresa 🎁" },
  cs: { reply: (ti) => `odpovědi na „${ti}“`, join: (n, g) => [`👋 ${n} se přidává k partě`, `skupina „${g}“`], change: (ti, w, p) => [`✏️ Změna v „${ti}“`, `nový plán: ${w} · ${p}`], surprise: "překvapení 🎁" },
  uk: { reply: (ti) => `відповіді на «${ti}»`, join: (n, g) => [`👋 ${n} приєднується до компанії`, `група «${g}»`], change: (ti, w, p) => [`✏️ Зміна в «${ti}»`, `новий план: ${w} · ${p}`], surprise: "сюрприз 🎁" },
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
  // duża ikona = awatar osoby, która napisała (albo logo SQUAD)
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

export default {
  async fetch(req, envRaw, ctx) {
    const origin = req.headers.get("Origin") || "", allow = ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.squad-64cd5\.web\.app$/.test(origin);
    const cors = { "Access-Control-Allow-Origin": allow ? origin : ORIGINS[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Max-Age": "86400" };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
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
        const n = await notify(env, db, [uid], null, () => ["🔔 SQUAD – test", "Powiadomienia działają! ✓"], "/me");
        const r = { sent: n, toks: env.stats.toks, errs: env.stats.errs };
        ctx.waitUntil(logEv(env, { kind: "test", from: uid.slice(0, 8), sent: n, to: 1, toks: env.stats.toks, errs: env.stats.errs.join(" | ") }));
        return json(r, 200, cors);
      }
      ctx.waitUntil(handle(env, uid, body).then((n) => logEv(env, { kind: body.kind, code: body.code, from: uid.slice(0, 8), sent: n || 0, to: env.stats ? env.stats.to : 0, toks: env.stats ? env.stats.toks : 0, errs: env.stats ? env.stats.errs.join(" | ") : "brak odbiorców / odrzucone" })).catch((e) => logEv(env, { kind: body.kind, code: body.code, from: uid.slice(0, 8), err: e.message })));
      return json({ ok: true }, 202, cors);
    } catch (e) { return json({ error: "auth" }, 401, cors); }
  },
};
