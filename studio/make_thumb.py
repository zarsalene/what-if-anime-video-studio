"""YouTube thumbnail for FIVE MINUTES: a full-res still + title type.
Usage: py make_thumb.py <still.png>
Writes out/five-minutes/thumbnail.jpg (1280x720).
"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

src = sys.argv[1] if len(sys.argv) > 1 else "out/five-minutes/stills/s03.jpg"
SERIF_B = "C:/Windows/Fonts/georgiab.ttf"
SANS_B = "C:/Windows/Fonts/arialbd.ttf"

im = Image.open(src).convert("RGB")
W, H = 1280, 720
# cover-crop to 16:9
r = max(W / im.width, H / im.height)
im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
x = (im.width - W) // 2
y = (im.height - H) // 2
im = im.crop((x, y, x + W, y + H))
im = ImageEnhance.Brightness(im).enhance(1.08)
im = ImageEnhance.Contrast(im).enhance(1.06)

# bottom + top vignette so the type reads
shade = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(shade)
for i in range(300):
    d.rectangle([0, H - i, W, H - i], fill=int(200 * (1 - i / 300)))
for i in range(180):
    d.rectangle([0, i, W, i], fill=int(150 * (1 - i / 180)))
shade = shade.filter(ImageFilter.GaussianBlur(18))
im = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), im, shade.point(lambda v: int(v * 0.75)))

d = ImageDraw.Draw(im)

kicker = ImageFont.truetype(SANS_B, 30)
title = ImageFont.truetype(SERIF_B, 128)
sub = ImageFont.truetype(SANS_B, 26)

k = "YOUR PHONE IS EATING YOUR LIFE"
kw = d.textlength(k, font=kicker)
d.text(((W - kw) / 2, 52), k, font=kicker, fill=(230, 230, 235))

t = "FIVE MINUTES"
tw = d.textlength(t, font=title)
d.text(((W - tw) / 2, H - 220), t, font=title, fill=(244, 241, 234), stroke_width=2, stroke_fill=(10, 10, 12))

s = "AN ANIMATED SHORT FILM"
sw = d.textlength(s, font=sub)
d.text(((W - sw) / 2, H - 66), s, font=sub, fill=(214, 190, 160))

im.save("out/five-minutes/thumbnail.jpg", quality=92)
print("wrote out/five-minutes/thumbnail.jpg")
