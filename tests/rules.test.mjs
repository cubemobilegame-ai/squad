// Testy reguł Firestore na emulatorze (limity dropów i wiadomości). Uruchamiane w GitHub Actions.
import fs from "fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, writeBatch, serverTimestamp, Timestamp, updateDoc, getDoc } from "firebase/firestore";

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
  await seed(t, async (d) => { await setDoc(doc(d, "drops", "e1", "participants", "u1"), { uid: "u1", status: "in", nickname: "A" }); await setDoc(doc(d, "users", "u1", "lim", "m"), { at: old() }); });
  await check("wiadomość z licznikiem: OK", assertSucceeds(sendMsg(db, "u1", "e1")));
  await check("druga wiadomość od razu (limit 1/s): ODMOWA", assertFails(sendMsg(db, "u1", "e1")));
  await check("wiadomość bez licznika: ODMOWA", assertFails(setDoc(doc(db, "drops", "e1", "messages", "qq"), { authorId: "u1", nickname: "x", text: "hej", createdAt: serverTimestamp() })));
  await t.cleanup();
}
console.log(fails ? `\nBŁĘDY: ${fails}` : "\nWSZYSTKO OK");
process.exit(fails ? 1 : 0);
