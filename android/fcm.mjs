// Natywne powiadomienia Androida (Firebase Cloud Messaging w aplikacji) – dokłada do projektu TWA:
// google-services.json, bibliotekę firebase-messaging i LauncherActivity, który pobiera token FCM
// i przekazuje go stronie (?fcm=…), a po kliknięciu w powiadomienie otwiera właściwy czat / drop.
import fs from "fs";
const app = JSON.parse(fs.readFileSync("android/app.json", "utf8"));
const B = "build-android", gs = `${B}/app/google-services.json`;
if (!fs.existsSync(gs)) { console.log("::warning::Brak google-services.json – aplikacja bez natywnych powiadomień"); process.exit(0); }

// 1) Gradle: wtyczka Google Services + Firebase Messaging
const rootG = fs.existsSync(`${B}/build.gradle`) ? `${B}/build.gradle` : null;
if (rootG) {
  let r = fs.readFileSync(rootG, "utf8");
  if (!r.includes("google-services")) r = r.replace(/(buildscript\s*\{[\s\S]*?dependencies\s*\{)/, "$1\n        classpath 'com.google.gms:google-services:4.4.2'");
  fs.writeFileSync(rootG, r);
}
const appG = `${B}/app/build.gradle`;
let a = fs.readFileSync(appG, "utf8");
if (!a.includes("firebase-messaging")) a = a.replace(/dependencies\s*\{/, "dependencies {\n    implementation platform('com.google.firebase:firebase-bom:33.5.1')\n    implementation 'com.google.firebase:firebase-messaging'");
if (!a.includes("com.google.gms.google-services")) a += "\napply plugin: 'com.google.gms.google-services'\n";
fs.writeFileSync(appG, a);

// 2) Manifest: domyślny kanał i kolor powiadomień
const mf = `${B}/app/src/main/AndroidManifest.xml`;
let m = fs.readFileSync(mf, "utf8");
if (!m.includes("default_notification_channel_id")) m = m.replace(/<application([^>]*)>/, `<application$1>
        <meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="squad" />
        <meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/squadAccent" />
        <meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@drawable/ic_stat_squad" />`);
fs.writeFileSync(mf, m);
fs.mkdirSync(`${B}/app/src/main/res/values`, { recursive: true });
fs.writeFileSync(`${B}/app/src/main/res/values/squad_colors.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="squadAccent">#FF4F86</color></resources>\n`);
fs.mkdirSync(`${B}/app/src/main/res/drawable`, { recursive: true });
fs.writeFileSync(`${B}/app/src/main/res/drawable/ic_stat_squad.xml`, `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
  <path android:fillColor="#FFFFFFFF" android:pathData="M7,9.5a3,3 0,1 0,0.01 0zM17,9.5a3,3 0,1 0,0.01 0zM12,7a3.5,3.5 0,1 0,0.01 0zM2,19c0,-3 2.5,-5 5,-5c1.3,0 2.4,0.4 3.2,1.1C10.4,14.4 11.2,14 12,14s1.6,0.4 1.8,1.1C14.6,14.4 15.7,14 17,14c2.5,0 5,2 5,5v1H2z"/>
</vector>\n`);

// 3) LauncherActivity: zgoda (Android 13+), token FCM -> strona, kliknięcie powiadomienia -> właściwy adres
const pkgDir = `${B}/app/src/main/java/${app.packageId.replace(/\./g, "/")}`;
fs.writeFileSync(`${pkgDir}/LauncherActivity.java`, `package ${app.packageId};

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import com.google.firebase.messaging.FirebaseMessaging;

public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    private static final String PERM = "android.permission.POST_NOTIFICATIONS";
    private boolean waitPerm = false, waitTok = false, launched = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SharedPreferences sp = getSharedPreferences("squad", MODE_PRIVATE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel("squad") == null) {
                NotificationChannel ch = new NotificationChannel("squad", "SQUAD", NotificationManager.IMPORTANCE_HIGH);
                ch.enableVibration(true);
                nm.createNotificationChannel(ch);
            }
        }
        waitPerm = Build.VERSION.SDK_INT >= 33 && savedInstanceState == null
            && checkSelfPermission(PERM) != PackageManager.PERMISSION_GRANTED
            && !sp.getBoolean("pushAsked", false);
        waitTok = savedInstanceState == null && sp.getString("fcm", null) == null;
        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(t -> {
                if (t.isSuccessful() && t.getResult() != null) sp.edit().putString("fcm", t.getResult()).remove("fcmErr").apply(); else sp.edit().putString("fcmErr", String.valueOf(t.getException())).apply();
                if (waitTok) { waitTok = false; go(); }
            });
        } catch (Exception e) { waitTok = false; sp.edit().putString("fcmErr", String.valueOf(e)).apply(); }
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        else setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        if (waitPerm) { sp.edit().putBoolean("pushAsked", true).apply(); requestPermissions(new String[]{PERM}, 7); }
        if (waitTok) new Handler(Looper.getMainLooper()).postDelayed(() -> { if (waitTok) { waitTok = false; go(); } }, 2500);
    }

    private void go() { if (!waitPerm && !waitTok && !launched && !shouldLaunchImmediately0()) { launched = true; launchTwa(); } }
    private boolean shouldLaunchImmediately0() { return false; }

    @Override
    protected boolean shouldLaunchImmediately() { boolean now = !waitPerm && !waitTok; if (now) launched = true; return now; }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code == 7 && waitPerm) { waitPerm = false; go(); }
    }

    private String ver() { try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return "?"; } }

    @Override
    protected Uri getLaunchingUrl() {
        Uri u = super.getLaunchingUrl();
        String path = getIntent() != null ? getIntent().getStringExtra("url") : null;
        if (path != null && path.startsWith("/")) u = Uri.parse("https://${app.host}" + path);
        String tok = getSharedPreferences("squad", MODE_PRIVATE).getString("fcm", null);
        String err = getSharedPreferences("squad", MODE_PRIVATE).getString("fcmErr", null);
        if (u != null) {
            Uri.Builder b = u.buildUpon().appendQueryParameter("av", ver());
            if (tok != null) b.appendQueryParameter("fcm", tok);
            else if (err != null) b.appendQueryParameter("fcmerr", err.length() > 150 ? err.substring(0, 150) : err);
            u = b.build();
        }
        return u;
    }
}
`);
console.log("Natywne powiadomienia FCM: dodane");
