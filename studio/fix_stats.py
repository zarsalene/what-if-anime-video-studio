from PIL import Image

for f in [408, 1884, 3138, 3510, 3624, 3750]:
    p = 'out/five-minutes/fix-%d.png' % f
    im = Image.open(p).convert('RGB').resize((320, 180))
    px = list(im.getdata())
    n = len(px)
    mean = sum((r + g + b) / 3 for r, g, b in px) / n
    nearblack = sum(1 for r, g, b in px if (r + g + b) / 3 < 10) / n * 100
    bright = sum(1 for r, g, b in px if (r + g + b) / 3 > 200) / n * 100
    print(f, 'mean %5.1f black%% %5.1f bright%% %5.2f' % (mean, nearblack, bright))
