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
print("patch ok")
