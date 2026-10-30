// Ustawia ekran „przerwa techniczna” / „awaria” w aplikacji (dokument meta/status).
const admin = require("firebase-admin");
admin.initializeApp();
const t = process.env.TRYB || "", ref = admin.firestore().doc("meta/status");
const mode = t.startsWith("przerwa") ? "przerwa" : t.startsWith("awaria") ? "awaria" : null;
(async () => {
  if (!mode) { await ref.delete(); console.log("Aplikacja działa normalnie – ekran wyłączony."); }
  else { await ref.set({ mode, msg: process.env.MSG || null, until: process.env.UNTIL || null, at: admin.firestore.FieldValue.serverTimestamp() }); console.log("Włączono ekran:", mode); }
  process.exit(0);
})().catch((e) => { console.log("::error::" + e.message); process.exit(1); });
