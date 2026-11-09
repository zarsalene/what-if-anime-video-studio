from PIL import Image
import json, os

sb = json.load(open('src/films/five-minutes/storyboard.json', encoding='utf-8'))
print('id    kind      mean  black%  red%  bright%')
for s in sb['shots']:
    p = 'out/five-minutes/stills/%s.jpg' % s['id']
    if not os.path.exists(p):
        print(s['id'], 'MISSING FILE')
        continue
    im = Image.open(p).convert('RGB').resize((320, 180))
    px = list(im.getdata())
    n = len(px)
    mean = sum((r + g + b) / 3 for r, g, b in px) / n
    nearblack = sum(1 for r, g, b in px if (r + g + b) / 3 < 10) / n * 100
    red = sum(1 for r, g, b in px if r > 140 and g < 60 and b < 60) / n * 100
    bright = sum(1 for r, g, b in px if (r + g + b) / 3 > 200) / n * 100
    print('%-5s %-8s %5.1f %6.1f %5.2f %6.2f' % (s['id'], s['kind'], mean, nearblack, red, bright))
