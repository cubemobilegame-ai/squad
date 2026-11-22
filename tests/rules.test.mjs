// Testy reguł Firestore na emulatorze (limity dropów i wiadomości). Uruchamiane w GitHub Actions.
import fs from "fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, writeBatch, serverTimestamp, Timestamp, updateDoc, getDoc, deleteDoc } from "firebase/firestore";

const src = fs.readFileSync("firestore.rules", "utf8");
let fails = 0;
const ok = (n) => console.log("  ✓", n);
const bad = (n, e) => { fails++; console.log("  ✗", n, String(e).slice(0, 200)); };
const check = async (n, p) => { try { await p; ok(n); } catch (e) { bad(n, e); } };
const day = () => +new Date().toISOString().slice(0, 10).replace(/-/g, "");
const old = () => Timestamp.fromMillis(Date.now() - 60000);

async function env(enforce) {
  const rules = enforce ? src : src.replace("function enforce() { return true; }", "function enforce() { return false; }");
  if (!enforce && rules === src) throw new Error("brak enforce()");
  return initializeTestEnvironment({ projectId: "demo-squad-" + (enforce ? "on" : "off"), firestore: { rules, host: "127.0.0.1", port: 8080 } });
}
const G = { firebase: { sign_in_provider: "google.com" } };
const dropData = (u, pub) => ({ code: "abc", hostId: u, title: "Test", ...(pub ? { public: true } : {}), expiresAt: Timestamp.fromMillis(Date.now() + 864e5), startsAt: Timestamp.fromMillis(Date.now() + 36e5) });
async function seed(t, fn) { await t.withSecurityRulesDisabled(async (c) => fn(c.firestore())); }
async function createDrop(db, u, code, pub, lim) {
  const b = writeBatch(db); b.set(doc(db, "drops", code), { ...dropData(u, pub), code });
  b.set(doc(db, "users", u, "lim", "d"), { at: serverTimestamp(), day: day(), n: lim.n, pub: lim.pub }); return b.commit();
}
async function sendMsg(db, u, code) {
  const b = writeBatch(db); b.set(doc(db, "drops", code, "messages", "m" + Math.random().toString(36).slice(2)), { authorId: u, nickname: "x", text: "hej", createdAt: serverTimestamp() });
  b.set(doc(db, "users", u, "lim", "m"), { at: serverTimestamp() }); return b.commit();
}

console.log("— enforce = false (faza 1: tylko liczniki, nic nie blokuje)");
{
  const t = await env(false); await t.clearFirestore();
  await seed(t, async (d) => { await setDoc(doc(d, "users", "u1"), { pub16: true, nickname: "A" }); });
  const db = t.authenticatedContext("u1", G).firestore();
  await check("drop + licznik: OK", assertSucceeds(createDrop(db, "u1", "d1", false, { n: 1, pub: 0 })));
  await check("drop bez licznika: OK (jeszcze nie wymuszamy)", assertSucceeds(setDoc(doc(db, "drops", "d2"), dropData("u1", false))));
  await check("data > 400 dni: ODMOWA", assertFails(setDoc(doc(db, "drops", "d3"), { ...dropData("u1", false), expiresAt: Timestamp.fromMillis(Date.now() + 500 * 864e5) })));
  await seed(t, async (d) => { await setDoc(doc(d, "drops", "d1", "participants", "u1"), { uid: "u1", status: "in", nickname: "A" }); });
  await check("wiadomość + licznik: OK", assertSucceeds(sendMsg(db, "u1", "d1")));
  await check("wiadomość bez licznika: OK", assertSucceeds(setDoc(doc(db, "drops", "d1", "messages", "zz"), { authorId: "u1", nickname: "x", text: "hej", createdAt: serverTimestamp() })));
  await check("licznik z cudzym uid: ODMOWA", assertFails(setDoc(doc(db, "users", "u2", "lim", "m"), { at: serverTimestamp() })));
  await check("licznik z cofniętym n: ODMOWA", (async () => { await seed(t, async (d) => setDoc(doc(d, "users", "u1", "lim", "d"), { at: old(), day: day(), n: 5, pub: 1 })); await assertFails(setDoc(doc(db, "users", "u1", "lim", "d"), { at: serverTimestamp(), day: day(), n: 1, pub: 0 })); })());
  // --- bezpieczeństwo: kształt wiadomości, identyfikatory, uid członka, blokada ponownego dołączenia
  await check("wiadomość z obcym polem r (XSS): ODMOWA", assertFails(setDoc(doc(db, "drops", "d1", "messages", "x1"), { authorId: "u1", nickname: "x", text: "hej", r: { u9: "<img src=x onerror=alert(1)>" }, createdAt: serverTimestamp() })));
  await check("wiadomość z datą klienta zamiast serwera: ODMOWA", assertFails(setDoc(doc(db, "drops", "d1", "messages", "x2"), { authorId: "u1", nickname: "x", text: "hej", createdAt: Timestamp.fromMillis(1) })));
  await check("karta dropa z kodem ze znakami specjalnymi: ODMOWA", assertFails(setDoc(doc(db, "drops", "d1", "messages", "x3"), { authorId: "u1", nickname: "x", text: "🔥 x", drop: { code: "');alert(1);//", title: "t" }, createdAt: serverTimestamp() })));
  await check("karta dropa ze zwykłym kodem: OK", assertSucceeds(setDoc(doc(db, "drops", "d1", "messages", "x4"), { authorId: "u1", nickname: "x", text: "🔥 x", drop: { code: "ABC123", title: "t" }, createdAt: serverTimestamp() })));
  await check("drop z identyfikatorem ze znakami specjalnymi: ODMOWA", assertFails(setDoc(doc(db, "drops", "a'b\"c"), dropData("u1", false))));
  await seed(t, async (d) => { await setDoc(doc(d, "groups", "g1"), { ownerId: "o1", name: "G" }); await setDoc(doc(d, "groups", "g1", "banned", "u2"), { at: 1 }); });
  const db2 = t.authenticatedContext("u2", G).firestore(), db3 = t.authenticatedContext("u3", G).firestore();
  await check("zablokowany nie dołączy ponownie: ODMOWA", assertFails(setDoc(doc(db2, "groups", "g1", "members", "u2"), { nickname: "B", uid: "u2" })));
  await check("inny użytkownik dołącza: OK", assertSucceeds(setDoc(doc(db3, "groups", "g1", "members", "u3"), { nickname: "C", uid: "u3" })));
  await check("członek z cudzym polem uid: ODMOWA", assertFails(setDoc(doc(db3, "groups", "g1", "members", "u3"), { nickname: "C", uid: "u1" })));
  await check("zwykły użytkownik nie zapisuje listy zablokowanych: ODMOWA", assertFails(setDoc(doc(db3, "groups", "g1", "banned", "u9"), { at: 1 })));
  await t.cleanup();
}

console.log("— enforce = true (faza 2: limity wymuszane)");
{
  const t = await env(true); await t.clearFirestore();
  await seed(t, async (d) => { await setDoc(doc(d, "users", "u1"), { pub16: true, nickname: "A" }); });
  const db = t.authenticatedContext("u1", G).firestore();
  await check("drop bez licznika: ODMOWA", assertFails(setDoc(doc(db, "drops", "e0"), dropData("u1", false))));
  await check("pierwszy drop z licznikiem: OK", assertSucceeds(createDrop(db, "u1", "e1", false, { n: 1, pub: 0 })));
  await check("drugi drop od razu (cooldown 10 s): ODMOWA", assertFails(createDrop(db, "u1", "e2", false, { n: 2, pub: 0 })));
  await seed(t, async (d) => setDoc(doc(d, "users", "u1", "lim", "d"), { at: old(), day: day(), n: 2, pub: 2 }));
  await check("trzeci publiczny: OK", assertSucceeds(createDrop(db, "u1", "e3", true, { n: 3, pub: 3 })));
  await seed(t, async (d) => setDoc(doc(d, "users", "u1", "lim", "d"), { at: old(), day: day(), n: 3, pub: 3 }));
  await check("czwarty publiczny: ODMOWA", assertFails(createDrop(db, "u1", "e4", true, { n: 4, pub: 4 })));
  await check("zwykły drop przy pub=3: OK", assertSucceeds(createDrop(db, "u1", "e5", false, { n: 4, pub: 3 })));
  await seed(t, async (d) => setDoc(doc(d, "users", "u1", "lim", "d"), { at: old(), day: day(), n: 20, pub: 0 }));
  await check("21. drop dnia: ODMOWA", assertFails(createDrop(db, "u1", "e6", false, { n: 21, pub: 0 })));
  await check("licznik zaniżony (oszustwo): ODMOWA", (async () => { await seed(t, async (d) => setDoc(doc(d, "users", "u1", "lim", "d"), { at: old(), day: day(), n: 20, pub: 0 })); await assertFails(createDrop(db, "u1", "e7", false, { n: 1, pub: 0 })); })());
  await seed(t, async (d) => { await setDoc(doc(d, "drops", "f1"), { ...dropData("u1", false), code: "f1" }); await setDoc(doc(d, "users", "u1", "lim", "d"), { at: old(), day: day(), n: 3, pub: 2 }); });
  const flip = (lim) => { const b = writeBatch(db); b.update(doc(db, "drops", "f1"), { public: true }); if (lim) b.set(doc(db, "users", "u1", "lim", "d"), { at: serverTimestamp(), day: day(), n: 3, pub: lim }); return b.commit(); };
  await check("zmiana na publiczny bez licznika: ODMOWA", assertFails(flip(null)));
  await check("zmiana na publiczny z licznikiem (3. z 3): OK", assertSucceeds(flip(3)));
  await seed(t, async (d) => { await setDoc(doc(d, "drops", "f2"), { ...dropData("u1", false), code: "f2" }); await setDoc(doc(d, "users", "u1", "lim", "d"), { at: old(), day: day(), n: 3, pub: 3 }); });
  await check("zmiana na publiczny przy pub=3: ODMOWA", assertFails((async () => { const b = writeBatch(db); b.update(doc(db, "drops", "f2"), { public: true }); b.set(doc(db, "users", "u1", "lim", "d"), { at: serverTimestamp(), day: day(), n: 3, pub: 4 }); await b.commit(); })()));
  await check("zwykła edycja (bez zmiany na publiczny): OK", assertSucceeds(updateDoc(doc(db, "drops", "f2"), { hostAv: 3 })));
  await seed(t, async (d) => { await setDoc(doc(d, "drops", "e1", "participants", "u1"), { uid: "u1", status: "in", nickname: "A" }); await setDoc(doc(d, "users", "u1", "lim", "m"), { at: old() }); });
  await check("wiadomość z licznikiem: OK", assertSucceeds(sendMsg(db, "u1", "e1")));
  await check("druga wiadomość od razu (limit 1/s): ODMOWA", assertFails(sendMsg(db, "u1", "e1")));
  await check("wiadomość bez licznika: ODMOWA", assertFails(setDoc(doc(db, "drops", "e1", "messages", "qq"), { authorId: "u1", nickname: "x", text: "hej", createdAt: serverTimestamp() })));
  await t.cleanup();
}
// ---- statystyki dla twórcy (presence / act / adm) ----
{
  const t = await env(true); await t.clearFirestore();
  const u1 = t.authenticatedContext("u1", G).firestore(), u2 = t.authenticatedContext("u2", G).firestore();
  const adm = t.authenticatedContext("a1", { email: "cubemobilegame@gmail.com", email_verified: true, firebase: { sign_in_provider: "google.com" } }).firestore();
  const fake = t.authenticatedContext("a2", { email: "cubemobilegame@gmail.com", email_verified: false, firebase: { sign_in_provider: "password" } }).firestore();
  const P = { pf: "ios", g: false, lang: "pl", v: "1.1.0" };
  await check("ust: własny wpis (create): OK", assertSucceeds(setDoc(doc(u1, "ust", "u1"), { ...P, fs: serverTimestamp(), ls: serverTimestamp() })));
  await check("ust: cudzy wpis: ODMOWA", assertFails(setDoc(doc(u1, "ust", "u2"), { ...P, fs: serverTimestamp(), ls: serverTimestamp() })));
  await check("ust: update ls: OK", assertSucceeds(updateDoc(doc(u1, "ust", "u1"), { ...P, ls: serverTimestamp() })));
  await check("ust: zmiana fs: ODMOWA", assertFails(setDoc(doc(u1, "ust", "u1"), { ...P, fs: serverTimestamp(), ls: serverTimestamp() })));
  await check("ust: obca platforma: ODMOWA", assertFails(updateDoc(doc(u1, "ust", "u1"), { ...P, pf: "tv", ls: serverTimestamp() })));
  await check("ust: dodatkowe pole: ODMOWA", assertFails(updateDoc(doc(u1, "ust", "u1"), { ...P, x: 1, ls: serverTimestamp() })));
  await check("ust: odczyt przez zwykłego użytkownika: ODMOWA", assertFails(getDoc(doc(u2, "ust", "u1"))));
  await check("ust: odczyt przez właściciela: ODMOWA", assertFails(getDoc(doc(u1, "ust", "u1"))));
  await check("ust: odczyt przez admina: OK", assertSucceeds(getDoc(doc(adm, "ust", "u1"))));
  await check("ust: odczyt przez nieweryfikowany e-mail: ODMOWA", assertFails(getDoc(doc(fake, "ust", "u1"))));
  await check("act: własny dzień: OK", assertSucceeds(setDoc(doc(u1, "act", "u1_2026-11-21"), { u: "u1", d: "2026-11-21", pf: "android" })));
  await check("act: złe id: ODMOWA", assertFails(setDoc(doc(u1, "act", "u2_2026-11-21"), { u: "u1", d: "2026-11-21", pf: "android" })));
  await check("act: update (nadpisanie): ODMOWA", assertFails(setDoc(doc(u1, "act", "u1_2026-11-21"), { u: "u1", d: "2026-11-21", pf: "ios" })));
  await check("act: usunięcie własnego: OK", assertSucceeds(deleteDoc(doc(u1, "act", "u1_2026-11-21"))));
  await check("adm: zapis tylko admin", assertFails(setDoc(doc(u1, "adm", "downloads"), { ios: 5 })));
  await check("adm: zapis admina: OK", assertSucceeds(setDoc(doc(adm, "adm", "downloads"), { ios: 5 })));
  await t.cleanup();
}
console.log(fails ? `\nBŁĘDY: ${fails}` : "\nWSZYSTKO OK");
process.exit(fails ? 1 : 0);
