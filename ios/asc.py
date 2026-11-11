#!/usr/bin/env python3
"""Przygotowanie konta Apple przez App Store Connect API: uprawnienia App ID + (jednorazowo) urządzenie wymagane do podpisywania automatycznego."""
import os, sys, json, time, base64, subprocess, urllib.request, urllib.error

ISS, KID, P8, BID = os.environ["ASC_ISSUER_ID"], os.environ["ASC_KEY_ID"], sys.argv[1], os.environ.get("BUNDLE_ID", "com.cubemobilegames.squad")
b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=")

def der_to_raw(sig):
    assert sig[0] == 0x30
    i = 2 if sig[1] < 0x80 else 2 + (sig[1] & 0x7f)
    out = b""
    for _ in range(2):
        assert sig[i] == 0x02
        ln = sig[i + 1]; v = sig[i + 2:i + 2 + ln]; i += 2 + ln
        v = v.lstrip(b"\x00"); out += v.rjust(32, b"\x00")
    return out

def jwt():
    h = b64(json.dumps({"alg": "ES256", "kid": KID, "typ": "JWT"}).encode())
    n = int(time.time())
    p = b64(json.dumps({"iss": ISS, "iat": n, "exp": n + 900, "aud": "appstoreconnect-v1"}).encode())
    sig = subprocess.run(["openssl", "dgst", "-sha256", "-sign", P8], input=h + b"." + p, capture_output=True, check=True).stdout
    return (h + b"." + p + b"." + b64(der_to_raw(sig))).decode()

def api(method, path, body=None):
    r = urllib.request.Request("https://api.appstoreconnect.apple.com" + path, method=method,
        data=json.dumps(body).encode() if body else None, headers={"Authorization": "Bearer " + jwt(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r) as f:
            t = f.read(); return json.loads(t) if t else {}
    except urllib.error.HTTPError as e:
        return {"_err": e.code, "_body": e.read().decode()[:600]}

r = api("GET", f"/v1/bundleIds?filter[identifier]={BID}&filter[platform]=IOS")
if "_err" in r: print("bundleIds:", r); sys.exit(1)
ids = [x for x in r["data"] if x["attributes"]["identifier"] == BID]
if not ids:
    r = api("POST", "/v1/bundleIds", {"data": {"type": "bundleIds", "attributes": {"identifier": BID, "name": "Squad", "platform": "IOS"}}})
    if "_err" in r: print("create bundleId:", r); sys.exit(1)
    bid = r["data"]["id"]
else:
    bid = ids[0]["id"]
print("bundleId resource:", bid)

for cap, settings in [("PUSH_NOTIFICATIONS", None), ("ASSOCIATED_DOMAINS", None),
                      ("APPLE_ID_AUTH", [{"key": "APPLE_ID_AUTH_APP_CONSENT", "options": [{"key": "PRIMARY_APP_CONSENT"}]}])]:
    attrs = {"capabilityType": cap}
    if settings: attrs["settings"] = settings
    r = api("POST", "/v1/bundleIdCapabilities", {"data": {"type": "bundleIdCapabilities", "attributes": attrs,
            "relationships": {"bundleId": {"data": {"type": "bundleIds", "id": bid}}}}})
    print(cap, "->", "ok" if "_err" not in r else (r["_err"], r["_body"][:200]))

r = api("GET", "/v1/devices?filter[platform]=IOS&limit=5")
n = len(r.get("data", [])) if "_err" not in r else -1
print("zarejestrowane urządzenia:", n)
if n == 0:
    r = api("POST", "/v1/devices", {"data": {"type": "devices", "attributes": {"name": "Squad CI", "platform": "IOS", "udid": "00008110-001A2B3C4D5E6F70"}}})
    print("rejestracja urządzenia:", "ok" if "_err" not in r else (r["_err"], r["_body"][:300]))
