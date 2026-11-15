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
    open(st, "w").write(t)
# kanał powiadomień "squad" tworzymy w MainActivity (Java)
ma = None
for d, _, fs in os.walk(os.path.join(A, "src/main/java")):
    for f in fs:
        if f == "MainActivity.java": ma = os.path.join(d, f)
j = open(ma).read()
if "NotificationChannel" not in j:
    j = j.replace("import com.getcapacitor.BridgeActivity;", "import android.app.NotificationChannel;\nimport android.app.NotificationManager;\nimport android.os.Build;\nimport android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;")
    j = re.sub(r"public class MainActivity extends BridgeActivity \{\s*\}", '''public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle b) {
        super.onCreate(b);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel c = new NotificationChannel("squad", "Squad", NotificationManager.IMPORTANCE_HIGH);
            c.enableVibration(true);
            getSystemService(NotificationManager.class).createNotificationChannel(c);
        }
    }
}''', j)
    open(ma, "w").write(j)

# ---------- widżet (3 rozmiary, język systemowy) ----------
import shutil
W = os.path.join(root, "android-cap/widget")
pk = os.path.dirname(ma)
for f in ("SquadWidgetPlugin.java", "SquadWidgetProvider.java"): shutil.copy(os.path.join(W, f), pk)
for d, f in (("layout", "squad_widget.xml"), ("drawable", "squad_widget_bg.xml"), ("xml", "squad_widget_info.xml")):
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
}
def esc(x): return x.replace("&","&amp;").replace("<","&lt;").replace("'","\\'")
for lang in ["en","pl","es","de","fr","it","cs","uk"]:
    d = os.path.join(A, "src/main/res", "values" if lang == "en" else "values-" + lang); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "squad_widget_strings.xml"), "w", encoding="utf-8").write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n' + "".join('    <string name="%s">%s</string>\n' % (k, esc(v[lang])) for k, v in STR.items()) + '</resources>\n')
x = open(m).read()
if "SquadWidgetProvider" not in x:
    x = x.replace("</application>", '''    <receiver android:name=".SquadWidgetProvider" android:exported="false">
            <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/squad_widget_info" />
        </receiver>
    </application>''')
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
    print("minSdk 24:", re.findall(r"minSdkVersion\s*=\s*\d+", v))
print("patch ok")
