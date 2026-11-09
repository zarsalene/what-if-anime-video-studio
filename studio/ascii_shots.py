from PIL import Image

chars = ' .:-=+*#%@'

def show(p, w=76, h=30):
    im = Image.open(p).convert('L')
    print('==', p, 'size', im.size)
    im = im.resize((w, h))
    for y in range(h):
        print(''.join(chars[min(9, im.getpixel((x, y)) * 10 // 256)] for x in range(w)))

for p in ['out/five-minutes/fix-3624.png', 'out/five-minutes/fix-1884.png', 'out/five-minutes/fix-3750.png']:
    show(p)
