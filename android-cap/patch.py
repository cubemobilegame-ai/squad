# Dopasowuje projekt Capacitor (Android): wersja, uprawnienia, linki, kolory, ikony, kanał powiadomień.
import re, sys, os, json
root, proj = sys.argv[1], sys.argv[2]
A = os.path.join(proj, "android", "app")
vc, vn = os.environ["VERSION_CODE"], os.environ["VERSION_NAME"]
g = os.path.join(A, "build.gradle"); s = open(g).read()
s = re.sub(r"versionCode \d+", "versionCode " + vc, s); s = re.sub(r'versionName "[^"]*"', 'versionName "' + vn + '"', s)
open(g, "w").write(s)
m = os.path.join(A, "src/main/AndroidManifest.xml"); x = open(m).read()
perms = ["android.permission.POST_NOTIFICATIONS", "android.permission.VIBRATE", "android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_COARSE_LOCATION"]
for p in perms:
    if p not in x: x = x.replace("</manifest>", '    <uses-permission android:name="%s" />\n</manifest>' % p)
host = json.load(open(os.path.join(root, "android/app.json")))["host"]
link = '''
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="%s" />
            </intent-filter>''' % host
if host not in x: x = re.sub(r"(<activity[^>]*MainActivity[\s\S]*?)(</activity>)", lambda k: k.group(1) + link + "\n        " + k.group(2), x, 1)
x = x.replace("<application", '<application android:usesCleartextTraffic="false"', 1) if "usesCleartextTraffic" not in x else x
if "enableOnBackInvokedCallback" not in x: x = x.replace("<application", '<application android:enableOnBackInvokedCallback="true"', 1)
if "default_notification_channel_id" not in x:
    x = x.replace("</application>", '''    <meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="squad" />
        <meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@drawable/ic_stat_squad" />
        <meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/squad_pink" />
    </application>''')
open(m, "w").write(x)
V = os.path.join(A, "src/main/res/values"); os.makedirs(V, exist_ok=True)
open(os.path.join(V, "squad_colors.xml"), "w").write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="squad_bg">#06060b</color>\n    <color name="squad_pink">#FF4F86</color>\n</resources>\n')
st = os.path.join(V, "styles.xml")
if os.path.exists(st):
    t = open(st).read()
    t = t.replace("<item name=\"android:background\">@null</item>", "<item name=\"android:background\">@color/squad_bg</item>")
    t = re.sub(r'(<style name="AppTheme.NoActionBar"[^>]*>)', r'\1\n        <item name="android:windowBackground">@color/squad_bg</item>\n        <item name="android:statusBarColor">@color/squad_bg</item>\n        <item name="android:navigationBarColor">@color/squad_bg</item>', t, 1)
    # ekran startowy Androida 12+: tło w kolorze aplikacji i bez ikony, żeby od razu przechodził w animację Squad
    t = re.sub(r'(<style name="AppTheme.NoActionBarLaunch"[^>]*>)', r'\1\n        <item name="windowSplashScreenBackground">@color/squad_bg</item>\n        <item name="windowSplashScreenAnimatedIcon">@drawable/squad_splash_blank</item>\n        <item name="android:windowSplashScreenBackground">@color/squad_bg</item>', t, 1)
    open(st, "w").write(t)
    dr = os.path.join(A, "src/main/res/drawable"); os.makedirs(dr, exist_ok=True)
    open(os.path.join(dr, "squad_splash_blank.xml"), "w").write('<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n    <path android:fillColor="#00000000" android:pathData="M0,0h1v1h-1z"/>\n</vector>\n')
# kanał powiadomień "squad" tworzymy w MainActivity (Java)
ma = None
for d, _, fs in os.walk(os.path.join(A, "src/main/java")):
    for f in fs:
        if f == "MainActivity.java": ma = os.path.join(d, f)
j = open(ma).read()
if "NotificationChannel" not in j:
    j = j.replace("import com.getcapacitor.BridgeActivity;", "import android.app.NotificationChannel;\nimport android.app.NotificationManager;\nimport android.os.Build;\nimport android.os.Bundle;\nimport androidx.activity.BackEventCompat;\nimport androidx.activity.OnBackPressedCallback;\nimport com.getcapacitor.BridgeActivity;")
    j = re.sub(r"public class MainActivity extends BridgeActivity \{\s*\}", '''public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle b) {
        super.onCreate(b);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel c = new NotificationChannel("squad", "Squad", NotificationManager.IMPORTANCE_HIGH);
            c.enableVibration(true);
            getSystemService(NotificationManager.class).createNotificationChannel(c);
        }
        // Android 15+ (edge-to-edge): okno nie zmniejsza się nad klawiaturą, więc czat zostawał pod nią - dosuwamy treść o wysokość klawiatury
        if (Build.VERSION.SDK_INT >= 35) {
            final android.view.View root = findViewById(android.R.id.content);
            androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(root, (v, ins) -> {
                int ime = ins.getInsets(androidx.core.view.WindowInsetsCompat.Type.ime()).bottom;
                v.setPadding(0, 0, 0, ime);
                return ins;
            });
        }
        // cofanie: ignorujemy gest zaczęty od PRAWEJ krawędzi (Android 14+ podaje krawędź); od lewej i przycisk działają
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            int edge = -1;
            @Override public void handleOnBackStarted(BackEventCompat e) { edge = e.getSwipeEdge(); }
            @Override public void handleOnBackCancelled() { edge = -1; }
            @Override public void handleOnBackPressed() {
                int ed = edge; edge = -1;
                if (ed == BackEventCompat.EDGE_RIGHT) return;
                if (getBridge() == null || getBridge().getWebView() == null) { moveTaskToBack(true); return; }
                getBridge().getWebView().evaluateJavascript("(window.__appBack?window.__appBack():'min')", v -> { if (v != null && v.contains("min")) moveTaskToBack(true); });
            }
        });
        final android.view.View dv = getWindow().getDecorView();
        dv.addOnLayoutChangeListener((v, l, tp, r, bt, ol, ot, or2, ob) -> {
            if (Build.VERSION.SDK_INT >= 29) {
                float d = getResources().getDisplayMetrics().density;
                int w = v.getWidth(), h = v.getHeight(), eh = (int) (200 * d), top = Math.max(0, h / 2 - eh / 2);
                v.setSystemGestureExclusionRects(java.util.Collections.singletonList(new android.graphics.Rect(w - (int) (24 * d), top, w, top + eh)));
            }
        });
    }
}''', j)
    open(ma, "w").write(j)

# ---------- widżet (3 rozmiary, język systemowy) ----------
import shutil
W = os.path.join(root, "android-cap/widget")
pk = os.path.dirname(ma)
for f in ("SquadWidgetPlugin.java", "SquadWidgetProvider.java", "SquadWidgetMedium.java", "SquadWidgetLarge.java"): shutil.copy(os.path.join(W, f), pk)
for d, f in (("layout", "squad_widget.xml"), ("drawable", "squad_widget_bg.xml"), ("xml", "squad_widget_info.xml"), ("xml", "squad_widget_info_m.xml"), ("xml", "squad_widget_info_l.xml"), ("drawable-nodpi", "squad_preview_s.png"), ("drawable-nodpi", "squad_preview_m.png"), ("drawable-nodpi", "squad_preview_l.png")):
    o = os.path.join(A, "src/main/res", d); os.makedirs(o, exist_ok=True); shutil.copy(os.path.join(W, f), o)
STR = {
 "w_now":   {"en":"HAPPENING NOW","pl":"TRWA TERAZ","es":"EN CURSO","de":"LÄUFT JETZT","fr":"EN COURS","it":"IN CORSO","cs":"PROBÍHÁ","uk":"ТРИВАЄ ЗАРАЗ"},
 "w_none":  {"en":"No upcoming drops","pl":"Brak nadchodzących dropów","es":"No hay drops próximos","de":"Keine anstehenden Drops","fr":"Aucun drop à venir","it":"Nessun drop in arrivo","cs":"Žádné nadcházející dropy","uk":"Немає майбутніх дропів"},
 "w_none_hint": {"en":"Create a drop and get the crew ✨","pl":"Stwórz drop i zbierz ekipę ✨","es":"Crea un drop y reúne a la crew ✨","de":"Erstelle einen Drop und hol die Crew ✨","fr":"Crée un drop et rassemble la bande ✨","it":"Crea un drop e raduna la crew ✨","cs":"Vytvoř drop a seber partu ✨","uk":"Створи дроп і збери компанію ✨"},
 "w_host":  {"en":"YOUR DROP","pl":"TWÓJ DROP","es":"TU DROP","de":"DEIN DROP","fr":"TON DROP","it":"IL TUO DROP","cs":"TVŮJ DROP","uk":"ТВІЙ ДРОП"},
 "w_today": {"en":"Today","pl":"Dziś","es":"Hoy","de":"Heute","fr":"Aujourd'hui","it":"Oggi","cs":"Dnes","uk":"Сьогодні"},
 "w_tomorrow": {"en":"Tomorrow","pl":"Jutro","es":"Mañana","de":"Morgen","fr":"Demain","it":"Domani","cs":"Zítra","uk":"Завтра"},
 "w_more":  {"en":"More drops soon","pl":"Więcej dropów wkrótce","es":"Más drops pronto","de":"Bald mehr Drops","fr":"Bientôt d'autres drops","it":"Presto altri drop","cs":"Brzy další dropy","uk":"Скоро більше дропів"},
 "w_desc":  {"en":"Your next drop with a countdown.","pl":"Najbliższy drop z odliczaniem.","es":"Tu próximo drop con cuenta atrás.","de":"Dein nächster Drop mit Countdown.","fr":"Ton prochain drop avec compte à rebours.","it":"Il tuo prossimo drop con conto alla rovescia.","cs":"Tvůj nejbližší drop s odpočtem.","uk":"Твій найближчий дроп із відліком."},
 "w_desc_s": {"en":"Your next drop with a countdown.","pl":"Najbliższy drop z odliczaniem.","es":"Tu próximo drop con cuenta atrás.","de":"Dein nächster Drop mit Countdown.","fr":"Ton prochain drop avec compte à rebours.","it":"Il tuo prossimo drop con conto alla rovescia.","cs":"Tvůj nejbližší drop s odpočtem.","uk":"Твій найближчий дроп із відліком."},
 "w_desc_m": {"en":"Your next drop plus one more.","pl":"Najbliższy drop i jeszcze jeden.","es":"Tu próximo drop y uno más.","de":"Dein nächster Drop und ein weiterer.","fr":"Ton prochain drop et un autre.","it":"Il tuo prossimo drop e un altro.","cs":"Tvůj nejbližší drop a ještě jeden.","uk":"Твій найближчий дроп і ще один."},
 "w_desc_l": {"en":"Your next drop plus three more.","pl":"Najbliższy drop i jeszcze trzy.","es":"Tu próximo drop y tres más.","de":"Dein nächster Drop und drei weitere.","fr":"Ton prochain drop et trois autres.","it":"Il tuo prossimo drop e altri tre.","cs":"Tvůj nejbližší drop a další tři.","uk":"Твій найближчий дроп і ще три."},
 "w_name_s": {"en":"Squad · small","pl":"Squad · mały","es":"Squad · pequeño","de":"Squad · klein","fr":"Squad · petit","it":"Squad · piccolo","cs":"Squad · malý","uk":"Squad · малий"},
 "w_name_m": {"en":"Squad · medium","pl":"Squad · średni","es":"Squad · mediano","de":"Squad · mittel","fr":"Squad · moyen","it":"Squad · medio","cs":"Squad · střední","uk":"Squad · середній"},
 "w_name_l": {"en":"Squad · large","pl":"Squad · duży","es":"Squad · grande","de":"Squad · groß","fr":"Squad · grand","it":"Squad · grande","cs":"Squad · velký","uk":"Squad · великий"},
}
def esc(x): return x.replace("&","&amp;").replace("<","&lt;").replace("'","\\'")
for lang in ["en","pl","es","de","fr","it","cs","uk"]:
    d = os.path.join(A, "src/main/res", "values" if lang == "en" else "values-" + lang); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "squad_widget_strings.xml"), "w", encoding="utf-8").write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n' + "".join('    <string name="%s">%s</string>\n' % (k, esc(v[lang])) for k, v in STR.items()) + '</resources>\n')
x = open(m).read()
if "SquadWidgetLarge" not in x:
    x = re.sub(r'\s*<receiver android:name="\.SquadWidget[A-Za-z]*"[\s\S]*?</receiver>', "", x)
    rc = ""
    for cls, info, lab in ((".SquadWidgetProvider", "squad_widget_info", "w_name_s"), (".SquadWidgetMedium", "squad_widget_info_m", "w_name_m"), (".SquadWidgetLarge", "squad_widget_info_l", "w_name_l")):
        rc += '''    <receiver android:name="%s" android:label="@string/%s" android:exported="false">
            <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/%s" />
        </receiver>
    ''' % (cls, lab, info)
    x = x.replace("</application>", rc + "</application>")
    open(m, "w").write(x)
j = open(ma).read()
if "registerPlugin" not in j:
    j = j.replace("super.onCreate(b);", "registerPlugin(SquadWidgetPlugin.class);\n        super.onCreate(b);", 1)
    open(ma, "w").write(j)

# ---------- Facebook (opcjonalnie: tylko gdy znamy App ID) ----------
fb = {}
try: fb = json.load(open(os.path.join(root, "cap/fbcfg.json")))
except Exception: pass
fid, ftok = fb.get("FB_APP_ID", ""), os.environ.get("FB_CLIENT_TOKEN", "")
if fid and ftok:
    open(os.path.join(V, "squad_facebook.xml"), "w").write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="facebook_app_id">%s</string>\n    <string name="fb_login_protocol_scheme">fb%s</string>\n    <string name="facebook_client_token">%s</string>\n</resources>\n' % (fid, fid, ftok))
    x = open(m).read()
    if "com.facebook.sdk.ApplicationId" not in x:
        x = x.replace("</application>", '''    <meta-data android:name="com.facebook.sdk.ApplicationId" android:value="@string/facebook_app_id" />
        <meta-data android:name="com.facebook.sdk.ClientToken" android:value="@string/facebook_client_token" />
        <activity android:name="com.facebook.CustomTabActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="@string/fb_login_protocol_scheme" />
            </intent-filter>
        </activity>
    </application>''')
        open(m, "w").write(x)
    vg = os.path.join(proj, "android", "variables.gradle")
    if os.path.exists(vg):
        v = open(vg).read()
        if "rgcfaIncludeFacebook" not in v:
            v = v.replace("ext {", "ext {\n    rgcfaIncludeFacebook = true\n    rgcfaFacebookSdkVersion = '17.0.2'", 1); open(vg, "w").write(v)
    print("facebook ok", fid[:4] + "…")
else: print("facebook: brak App ID lub tokenu – pomijam")

# Google Play (Automatyczna ochrona) wymaga minSdk >= 24
vg = os.path.join(proj, "android", "variables.gradle")
if os.path.exists(vg):
    v = open(vg).read(); v = re.sub(r"minSdkVersion\s*=\s*\d+", "minSdkVersion = 24", v); open(vg, "w").write(v)
    v = re.sub(r"targetSdkVersion\s*=\s*\d+", "targetSdkVersion = 36", v); open(vg, "w").write(v)
    print("minSdk 24 / targetSdk 36:", re.findall(r"(?:minSdkVersion|targetSdkVersion|compileSdkVersion)\s*=\s*\d+", v))

# Identyfikator reklam: Squad nie pokazuje reklam – usuwamy uprawnienie AD_ID (Facebook SDK mógł je dołożyć) i wyłączamy zbieranie przez Facebook SDK
x = open(m).read()
if "xmlns:tools" not in x: x = x.replace("<manifest ", '<manifest xmlns:tools="http://schemas.android.com/tools" ', 1)
if "permission.AD_ID" not in x:
    x = x.replace("</manifest>", '    <uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />\n</manifest>')
if "AdvertiserIDCollectionEnabled" not in x:
    x = x.replace("</application>", '''    <meta-data android:name="com.facebook.sdk.AdvertiserIDCollectionEnabled" android:value="false" />
        <meta-data android:name="com.facebook.sdk.AutoLogAppEventsEnabled" android:value="false" />
        <meta-data android:name="com.facebook.sdk.AutoInitEnabled" android:value="true" />
    </application>''')
open(m, "w").write(x)
print("AD_ID usuniete")
print("patch ok")
