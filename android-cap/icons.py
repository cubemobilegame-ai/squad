# Ikony launchera z public/icon-512.png i icon-maskable-512.png (Pillow)
import sys, os
from PIL import Image
root, proj = sys.argv[1], sys.argv[2]
R = os.path.join(proj, "android/app/src/main/res")
full = Image.open(os.path.join(root, "public/icon-512.png")).convert("RGBA")
mask = Image.open(os.path.join(root, "public/icon-maskable-512.png")).convert("RGBA")
for d, px in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    o = os.path.join(R, "mipmap-" + d); os.makedirs(o, exist_ok=True)
    for n in ("ic_launcher.png", "ic_launcher_round.png"): full.resize((px, px), Image.LANCZOS).save(os.path.join(o, n))
    fg = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}[d]
    mask.resize((fg, fg), Image.LANCZOS).save(os.path.join(o, "ic_launcher_foreground.png"))
a = os.path.join(R, "mipmap-anydpi-v26")
if os.path.isdir(a):
    for f in os.listdir(a): os.remove(os.path.join(a, f))
print("icons ok")

d = os.path.join(R, "drawable"); os.makedirs(d, exist_ok=True)
Image.open(os.path.join(root, "public/badge-96.png")).convert("RGBA").resize((96, 96), Image.LANCZOS).save(os.path.join(d, "ic_stat_squad.png"))
