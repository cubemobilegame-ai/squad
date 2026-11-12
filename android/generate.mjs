// Generuje projekt Androida (Trusted Web Activity) z aplikacji webowej SQUAD – uruchamiane przez GitHub Actions.
import fs from "fs";
import core from "@bubblewrap/core";
const { TwaManifest, TwaGenerator, ConsoleLog } = core;
const app = JSON.parse(fs.readFileSync("android/app.json", "utf8"));
const web = JSON.parse(fs.readFileSync("public/manifest.json", "utf8"));
const m = TwaManifest.fromWebManifestJson(new URL(`https://${app.host}/manifest.json`), web);
Object.assign(m, {
  packageId: app.packageId, name: app.name, launcherName: app.launcherName, host: app.host, startUrl: "/",
  iconUrl: "http://localhost:8099/icon-512.png", maskableIconUrl: "http://localhost:8099/icon-maskable-512.png",
  appVersionCode: parseInt(process.env.VERSION_CODE || "1", 10), appVersionName: fs.readFileSync("android/version.txt", "utf8").trim(),
  enableNotifications: true, orientation: "portrait", fallbackType: "customtabs", display: "standalone",
  splashScreenFadeOutDuration: 0, minSdkVersion: 24, enableSiteSettingsShortcut: true, signingKey: { path: "../upload.jks", alias: "squad" },
  // lokalizacja dla publicznych dropów: strona używa uprawnienia aplikacji (natywne okienko Androida)
  features: { ...(m.features || {}), locationDelegation: { enabled: true } },
});
if (typeof m.validate === "function") { const err = m.validate(); if (err) { console.error("Błąd manifestu:", err); process.exit(1); } }
await new TwaGenerator().createTwaProject("build-android", m, new ConsoleLog("squad"));

// Nazwy aplikacji w językach (pod ikoną zostaje krótkie „Squad”, pełna nazwa w ustawieniach i ostatnich aplikacjach)
const NAMES = { pl: "Squad – wspólne wypady", en: "Squad – hangouts together", es: "Squad – planes en grupo", de: "Squad – gemeinsam unterwegs",
  fr: "Squad – sorties entre potes", it: "Squad – uscite insieme", cs: "Squad – společné akce", uk: "Squad – спільні зустрічі" };
const resDir = "build-android/app/src/main/res", base = fs.readFileSync(`${resDir}/values/strings.xml`, "utf8");
const keys = [...base.matchAll(/<string name="([^"]+)"[^>]*>([^<]*)<\/string>/g)].filter(([, , v]) => v.trim() === app.name).map(([, k]) => k);
console.log("Klucze nazwy aplikacji:", keys.join(", ") || "(brak)");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/'/g, "\\'");
for (const [l, n] of Object.entries(NAMES)) {
  fs.mkdirSync(`${resDir}/values-${l}`, { recursive: true });
  fs.writeFileSync(`${resDir}/values-${l}/strings.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${keys.map((k) => `  <string name="${k}">${esc(n)}</string>`).join("\n")}\n</resources>\n`);
}

// Bez ikony na ekranie startowym Androida: czarny splash (aplikacja i tak pokazuje własne intro)
const black = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4XmPk5hZiwAeY8MoyMAwTBQAyMQA4OZ42HAAAAABJRU5ErkJggg==", "base64");
for (const d of fs.readdirSync(resDir)) if (d.startsWith("drawable")) for (const f of fs.readdirSync(`${resDir}/${d}`)) if (/^splash\.(png|webp)$/.test(f)) { fs.writeFileSync(`${resDir}/${d}/${f.replace(/\.webp$/, ".png")}`, black); if (f.endsWith(".webp")) fs.unlinkSync(`${resDir}/${d}/${f}`); console.log("splash wyczyszczony:", d); }

// Android 13+: natywna prośba o powiadomienia przy pierwszym uruchomieniu (systemowe okienko „Zezwolić…?”), potem start aplikacji
const pkgDir = `build-android/app/src/main/java/${app.packageId.replace(/\./g, "/")}`;
fs.writeFileSync(`${pkgDir}/LauncherActivity.java`, `package ${app.packageId};

import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;

public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    private static final String PERM = "android.permission.POST_NOTIFICATIONS";
    private boolean asking = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        asking = Build.VERSION.SDK_INT >= 33 && savedInstanceState == null
            && checkSelfPermission(PERM) != PackageManager.PERMISSION_GRANTED
            && !getSharedPreferences("squad", MODE_PRIVATE).getBoolean("pushAsked", false);
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        else setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        if (asking) {
            getSharedPreferences("squad", MODE_PRIVATE).edit().putBoolean("pushAsked", true).apply();
            requestPermissions(new String[]{PERM}, 7);
        }
    }

    // Id instalacji: SharedPreferences znikają przy odinstalowaniu, więc strona wie, że to nowa instalacja i wylogowuje starą sesję
    @Override
    protected android.net.Uri getLaunchingUrl() {
        android.net.Uri u = super.getLaunchingUrl();
        android.content.SharedPreferences p = getSharedPreferences("squad", MODE_PRIVATE);
        String id = p.getString("installId", null);
        if (id == null) { id = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 12); p.edit().putString("installId", id).apply(); }
        return u.buildUpon().appendQueryParameter("inst", id).build();
    }

    @Override
    protected boolean shouldLaunchImmediately() { return !asking; }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code == 7 && asking) { asking = false; launchTwa(); }
    }
}
`);
const mf = "build-android/app/src/main/AndroidManifest.xml";
let mx = fs.readFileSync(mf, "utf8");
if (!mx.includes("android.permission.POST_NOTIFICATIONS")) { mx = mx.replace(/<application/, '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n    <application'); fs.writeFileSync(mf, mx); }
console.log("Natywna prośba o powiadomienia: dodana");
// Przycisk „Włącz powiadomienia” na stronie -> squadapp://push -> natywne okienko zgody albo ustawienia powiadomień SQUAD
fs.writeFileSync(`${pkgDir}/PushPermActivity.java`, `package ${app.packageId};

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;

public class PushPermActivity extends Activity {
    private static final String PERM = "android.permission.POST_NOTIFICATIONS";

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(PERM) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{PERM}, 8);
            return;
        }
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null && !nm.areNotificationsEnabled()) openSettings();
        finish();
    }

    private void openSettings() {
        try {
            Intent i = new Intent("android.settings.APP_NOTIFICATION_SETTINGS");
            i.putExtra("android.provider.extra.APP_PACKAGE", getPackageName());
            i.putExtra("app_package", getPackageName());
            i.putExtra("app_uid", getApplicationInfo().uid);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            try {
                Intent i = new Intent("android.settings.APPLICATION_DETAILS_SETTINGS", android.net.Uri.parse("package:" + getPackageName()));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
            } catch (Exception ignored) {}
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
        if (!ok && Build.VERSION.SDK_INT >= 33 && !shouldShowRequestPermissionRationale(PERM)) openSettings();
        finish();
    }
}
`);
{ let m2 = fs.readFileSync(mf, "utf8");
  m2 = m2.replace(/<\/application>/, `    <activity android:name=".PushPermActivity" android:exported="true" android:excludeFromRecents="true" android:theme="@android:style/Theme.Translucent.NoTitleBar">
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="squadapp" android:host="push" />
            </intent-filter>
        </activity>
    </application>`);
  fs.writeFileSync(mf, m2); console.log("PushPermActivity: dodana"); }

fs.writeFileSync("build-android/twa-manifest.json", JSON.stringify(m.toJson ? m.toJson() : m, null, 2));
console.log("Projekt Androida gotowy:", app.packageId, m.appVersionName, "(" + m.appVersionCode + ")");
