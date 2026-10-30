// Pozwala aplikacji rysować zdjęcia z Firebase Storage na obrazkach do udostępniania (kolaże, zaproszenia).
const admin = require("../functions/node_modules/firebase-admin");
const fs = require("fs");
const bucket = (fs.readFileSync("public/config.js", "utf8").match(/storageBucket:\s*"([^"]+)"/) || [])[1];
admin.initializeApp();
admin.storage().bucket(bucket).setCorsConfiguration([{ origin: ["*"], method: ["GET"], responseHeader: ["Content-Type"], maxAgeSeconds: 3600 }])
  .then(() => console.log("CORS ustawiony dla", bucket))
  .catch((e) => { console.log("::warning::Nie udało się ustawić CORS dla", bucket, "–", e.message); });
