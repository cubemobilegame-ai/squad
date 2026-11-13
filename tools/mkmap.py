# Generuje ciemne mozaiki mapy (OSM) do sekcji „publiczne dropy” na stronie wizytówkowej.
# Jednorazowo, uprzejmie wobec serwerów OSM (UA z kontaktem, przerwy). Wynik: landing/map/z10..z13.webp
import math, io, time, os, sys, urllib.request
from PIL import Image, ImageEnhance
LA, LO = 52.2297, 21.0122
UA = "SquadLandingMap/1.0 (cubemobilegame@gmail.com; one-off static render)"
SPAN = 1536  # px „świata” na obraz (przy zoomie z)
def world(z):
    s = 256 * 2 ** z
    return (LO + 180) / 360 * s, (0.5 - math.log((1 + math.sin(math.radians(LA))) / (1 - math.sin(math.radians(LA)))) / (4 * math.pi)) * s
def get(z, x, y):
    n = 2 ** z
    url = f"https://tile.openstreetmap.org/{z}/{x % n}/{y}.png"
    for t in range(4):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30)
            time.sleep(0.25)
            return Image.open(io.BytesIO(r.read())).convert("RGB")
        except Exception as e:
            print("retry", url, e, file=sys.stderr); time.sleep(2 + t * 2)
    raise SystemExit("tile failed " + url)
def dark(im):
    from PIL import ImageOps
    im = ImageOps.invert(im)
    h, s, v = im.convert("HSV").split()
    h = h.point(lambda p: (p + 128) % 256)
    im = Image.merge("HSV", (h, s, v)).convert("RGB")
    im = ImageEnhance.Color(im).enhance(0.55)
    im = ImageEnhance.Brightness(im).enhance(0.9)
    return im
os.makedirs("landing/map", exist_ok=True)
for z, hi in ((10, 0), (11, 0), (12, 1), (13, 1)):
    zz = z + hi
    size = SPAN * 2 ** hi
    px, py = world(zz)
    x0, y0 = int(math.floor((px - size / 2) / 256)), int(math.floor((py - size / 2) / 256))
    x1, y1 = int(math.floor((px + size / 2) / 256)), int(math.floor((py + size / 2) / 256))
    canvas = Image.new("RGB", ((x1 - x0 + 1) * 256, (y1 - y0 + 1) * 256))
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            canvas.paste(get(zz, x, y), ((x - x0) * 256, (y - y0) * 256))
    ox, oy = px - x0 * 256 - size / 2, py - y0 * 256 - size / 2
    im = canvas.crop((round(ox), round(oy), round(ox) + size, round(oy) + size))
    if hi == 0:
        im = im.resize((SPAN * 2, SPAN * 2), Image.LANCZOS)
    im = dark(im)
    im.save(f"landing/map/z{z}.webp", "WEBP", quality=60, method=6)
    print(z, im.size, os.path.getsize(f"landing/map/z{z}.webp"))
