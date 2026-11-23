from PIL import Image, ImageDraw, ImageFont
import os

base = r"C:\Users\hokke\OneDrive\Dokumenter\deepseek-harness\default-workspace\nhl-android\assets"
os.makedirs(base, exist_ok=True)


def make_icon(size, fg=False, mono=False):
    bg = (11, 15, 20, 255)
    red = (214, 69, 69, 255)
    white = (238, 244, 251, 255)
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0) if (fg or mono) else bg)
    d = ImageDraw.Draw(img)
    # puck
    cx, cy = size // 2, int(size * 0.58)
    rx, ry = int(size * 0.28), int(size * 0.11)
    color = white if mono else red
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=color)
    # text NHL
    text = 'НХЛ'
    try:
        font = ImageFont.truetype('arialbd.ttf', int(size * 0.23))
    except Exception:
        font = ImageFont.load_default()
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((size - tw) // 2, int(size * 0.22)), text, fill=white, font=font)
    # accent line
    uy = int(size * 0.48)
    d.rectangle([int(size * 0.28), uy, int(size * 0.72), uy + max(2, size // 40)], fill=color)
    return img


make_icon(1024).save(os.path.join(base, 'icon.png'))
make_icon(1024).save(os.path.join(base, 'splash-icon.png'))
make_icon(1024, fg=True).save(os.path.join(base, 'android-icon-foreground.png'))
make_icon(1024, mono=True).save(os.path.join(base, 'android-icon-monochrome.png'))
make_icon(64).save(os.path.join(base, 'favicon.png'))
print('ok')
