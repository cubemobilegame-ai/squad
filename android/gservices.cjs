// google-services.json dla aplikacji Android: z odpowiedzi firebase-tools (sdk.txt) albo złożony z public/config.js.
const fs = require("fs"), id = process.argv[2], out = "build-android/app/google-services.json";
const t = fs.existsSync("sdk.txt") ? fs.readFileSync("sdk.txt", "utf8") : "", i = t.indexOf("{"), j = t.lastIndexOf("}");
try { const g = JSON.parse(t.slice(i, j + 1)); if (g.project_info) { fs.writeFileSync(out, JSON.stringify(g, null, 2)); console.log("::notice title=google-services.json::pobrany z Firebase"); process.exit(0); } } catch {}
const c = fs.readFileSync("public/config.js", "utf8"), g = (k) => (c.match(new RegExp(k + '\\s*:\\s*"([^"]+)"')) || [])[1];
const pkg = require("../android/app.json").packageId;
fs.writeFileSync(out, JSON.stringify({ project_info: { project_number: g("messagingSenderId"), project_id: g("projectId"), storage_bucket: g("projectId") + ".appspot.com" },
  client: [{ client_info: { mobilesdk_app_id: id, android_client_info: { package_name: pkg } }, oauth_client: [], api_key: [{ current_key: g("apiKey") }], services: { appinvite_service: { other_platform_oauth_client: [] } } }],
  configuration_version: "1" }, null, 2));
console.log("::notice title=google-services.json::złożony z config.js (sdkconfig: " + t.slice(0, 160).replace(/\n/g, " ") + ")");
