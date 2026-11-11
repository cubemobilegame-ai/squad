#!/usr/bin/env python3
"""Pobiera App ID Facebooka z konfiguracji Firebase Auth (konto serwisowe) i dopisuje do fbcfg.json."""
import sys, json, time, base64, subprocess, urllib.request, urllib.parse, tempfile, os
sa = json.load(open(sys.argv[1])); cfgp = sys.argv[2]
b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=")
n = int(time.time())
h = b64(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
p = b64(json.dumps({"iss": sa["client_email"], "scope": "https://www.googleapis.com/auth/cloud-platform", "aud": "https://oauth2.googleapis.com/token", "iat": n, "exp": n + 3000}).encode())
kf = tempfile.NamedTemporaryFile("w", delete=False, suffix=".pem"); kf.write(sa["private_key"]); kf.close()
sig = subprocess.run(["openssl", "dgst", "-sha256", "-sign", kf.name], input=h + b"." + p, capture_output=True, check=True).stdout
os.unlink(kf.name)
jwt = (h + b"." + p + b"." + b64(sig)).decode()
r = urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=urllib.parse.urlencode({"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": jwt}).encode()))
tok = json.load(r)["access_token"]
try:
    r = urllib.request.urlopen(urllib.request.Request("https://identitytoolkit.googleapis.com/admin/v2/projects/%s/defaultSupportedIdpConfigs/facebook.com" % sa["project_id"], headers={"Authorization": "Bearer " + tok}))
    fid = json.load(r).get("clientId", "")
except Exception as e:
    print("Nie udało się pobrać App ID Facebooka:", e); fid = ""
c = json.load(open(cfgp)); c["FB_APP_ID"] = fid; json.dump(c, open(cfgp, "w"))
print("FB App ID:", (fid[:4] + "…") if fid else "BRAK")
