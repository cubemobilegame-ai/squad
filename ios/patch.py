#!/usr/bin/env python3
"""Dostosowuje wygenerowany przez Capacitor projekt iOS: Info.plist, entitlements, AppDelegate, ikona, projekt Xcode, Podfile."""
import os, re, sys, plistlib, shutil, subprocess, json
R = sys.argv[1]            # katalog repo
B = sys.argv[2]            # katalog budowy (ios-build)
cfg = json.load(open(os.path.join(B, "fbcfg.json")))
A = os.path.join(B, "ios", "App")
APP = os.path.join(A, "App")

# AppDelegate
s = open(os.path.join(R, "ios", "AppDelegate.swift")).read()
for k, v in {"__GOOGLE_APP_ID__": cfg["GOOGLE_APP_ID"], "__GCM_SENDER_ID__": cfg["GCM_SENDER_ID"], "__API_KEY__": cfg["API_KEY"],
             "__PROJECT_ID__": cfg["PROJECT_ID"], "__CLIENT_ID__": cfg.get("CLIENT_ID", ""), "__STORAGE_BUCKET__": cfg.get("STORAGE_BUCKET", "")}.items():
    s = s.replace(k, v)
open(os.path.join(APP, "AppDelegate.swift"), "w").write(s)

# Info.plist
pp = os.path.join(APP, "Info.plist")
d = plistlib.load(open(pp, "rb"))
d["CFBundleDisplayName"] = "Squad"
d["ITSAppUsesNonExemptEncryption"] = False
d["UIBackgroundModes"] = ["remote-notification"]
d["NSSupportsLiveActivities"] = True
d["NSCameraUsageDescription"] = "Squad potrzebuje aparatu, żebyś mógł dodać zdjęcie do albumu wypadu."
d["NSPhotoLibraryUsageDescription"] = "Squad potrzebuje dostępu do zdjęć, żebyś mógł dodać zdjęcie do albumu lub awatara."
d["NSPhotoLibraryAddUsageDescription"] = "Squad zapisuje kolaże z wypadów w Twojej galerii."
d["NSCalendarsUsageDescription"] = "Squad dodaje wydarzenia z dropów do Twojego kalendarza."
d["NSCalendarsFullAccessUsageDescription"] = "Squad dodaje wydarzenia z dropów do Twojego kalendarza."
d["NSCalendarsWriteOnlyAccessUsageDescription"] = "Squad dodaje wydarzenia z dropów do Twojego kalendarza."
d["NSLocationWhenInUseUsageDescription"] = "Lokalizacja pokazuje publiczne dropy w Twojej okolicy."
d["NSLocationAlwaysAndWhenInUseUsageDescription"] = "Lokalizacja pokazuje publiczne dropy w Twojej okolicy."
d["UIRequiredDeviceCapabilities"] = ["arm64"]
d["UISupportedInterfaceOrientations"] = ["UIInterfaceOrientationPortrait"]
d["UISupportedInterfaceOrientations~ipad"] = ["UIInterfaceOrientationPortrait", "UIInterfaceOrientationLandscapeLeft", "UIInterfaceOrientationLandscapeRight", "UIInterfaceOrientationPortraitUpsideDown"]
cid = cfg.get("CLIENT_ID", "")
if cid:
    rev = ".".join(reversed(cid.split(".")))
    d["CFBundleURLTypes"] = [{"CFBundleURLSchemes": [rev]}]
fid = cfg.get("FB_APP_ID", ""); tok = os.environ.get("FB_CLIENT_TOKEN", "")
if not fid or not tok:
    print("BRAK FB_APP_ID / FB_CLIENT_TOKEN"); sys.exit(1)
d["FacebookAppID"] = fid; d["FacebookClientToken"] = tok; d["FacebookDisplayName"] = "Squad"
d["CFBundleURLTypes"] = d.get("CFBundleURLTypes", []) + [{"CFBundleURLSchemes": ["fb" + fid]}]
d["LSApplicationQueriesSchemes"] = ["fbapi", "fb-messenger-share-api", "fbauth2", "fbshareextension"]
plistlib.dump(d, open(pp, "wb"))

# entitlements + projekt
shutil.copy(os.path.join(R, "ios", "App.entitlements"), os.path.join(APP, "App.entitlements"))
shutil.copy(os.path.join(R, "ios", "LaunchScreen.storyboard"), os.path.join(APP, "Base.lproj", "LaunchScreen.storyboard"))
px = os.path.join(A, "App.xcodeproj", "project.pbxproj")
t = open(px).read()
if "CODE_SIGN_ENTITLEMENTS" not in t:
    t = t.replace("ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;", "ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;")
t = re.sub(r"IPHONEOS_DEPLOYMENT_TARGET = [0-9.]+;", "IPHONEOS_DEPLOYMENT_TARGET = 15.0;", t)
t = re.sub(r"TARGETED_DEVICE_FAMILY = \"1,2\";", "TARGETED_DEVICE_FAMILY = 1;", t)
open(px, "w").write(t)

# Podfile: dodatkowy subspec Google
pf = os.path.join(A, "Podfile")
t = open(pf).read()
line = "  pod 'CapacitorFirebaseAuthentication/Google', :path => '../../node_modules/@capacitor-firebase/authentication'\n  pod 'CapacitorFirebaseAuthentication/Facebook', :path => '../../node_modules/@capacitor-firebase/authentication'\n"
if "authentication/Google" not in t:
    t = t.replace("def capacitor_pods\n", "def capacitor_pods\n" + line, 1)
t = re.sub(r"platform :ios, '[0-9.]+'", "platform :ios, '15.0'", t)
open(pf, "w").write(t)
print("patch OK")
