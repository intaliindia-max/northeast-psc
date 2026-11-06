from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, white
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from PIL import Image
import sys

URL = sys.argv[1] if len(sys.argv) > 1 else "https://northeastpsc.co.in/maths-by-amarjeet-sir/"
OUT = sys.argv[2] if len(sys.argv) > 2 else "dist/APSSB Maths Practice by Amarjeet Sir - brochure.pdf"
IMG = "site_img/"
pdfmetrics.registerFont(TTFont("Sans", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("Sans-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily("Sans", normal="Sans", bold="Sans-Bold")

W, H = A4
M = 36
PINK, BLUE, INK, SOFT = HexColor("#c0336b"), HexColor("#2340a6"), HexColor("#1b1d2b"), HexColor("#565a70")
LINE, WASH, PAGE = HexColor("#efcddb"), HexColor("#fbf0f5"), HexColor("#eef0f5")

def cover_image(c, path, x, y, w, h, radius=0):
    im = Image.open(path).convert("RGB")
    tw, th = w, h
    r = tw / th
    if im.width / im.height > r:
        nw = int(im.height * r); left = (im.width - nw) // 2; im = im.crop((left, 0, left + nw, im.height))
    else:
        nh = int(im.width / r); top = (im.height - nh) // 2; im = im.crop((0, top, im.width, top + nh))
    import tempfile
    scale = min(1.0, (w * 2.2) / im.width)
    if scale < 1: im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False).name
    im.save(tmp, "JPEG", quality=80, optimize=True)
    if radius:
        c.saveState(); p = c.beginPath(); p.roundRect(x, y, w, h, radius); c.clipPath(p, stroke=0, fill=0)
    c.drawImage(tmp, x, y, w, h)
    if radius: c.restoreState()

def fit_image(c, path, x, y, h):
    im = Image.open(path); w = h * im.width / im.height
    c.drawImage(ImageReader(path), x, y, w, h, mask="auto")
    return w

def circle_image(c, path, cx, cy, d):
    c.saveState(); p = c.beginPath(); p.circle(cx, cy, d / 2); c.clipPath(p, stroke=0, fill=0)
    c.drawImage(ImageReader(path), cx - d / 2, cy - d / 2, d, d); c.restoreState()
    c.setStrokeColor(PINK); c.setLineWidth(1.6); c.circle(cx, cy, d / 2)

def para(c, text, x, ytop, w, size, color=INK, leading=None, bold=False):
    st = ParagraphStyle("p", fontName="Sans-Bold" if bold else "Sans", fontSize=size, leading=leading or size * 1.38, textColor=color)
    p = Paragraph(text, st); _, h = p.wrap(w, 1000); p.drawOn(c, x, ytop - h); return ytop - h

def qr(c, x, y, size):
    wdg = QrCodeWidget(URL); wdg.barLevel = "M"
    b = wdg.getBounds(); bw, bh = b[2] - b[0], b[3] - b[1]
    d = Drawing(size, size, transform=[size / bw, 0, 0, size / bh, 0, 0]); d.add(wdg)
    renderPDF.draw(d, c, x, y)
    c.linkURL(URL, (x, y, x + size, y + size), relative=0)

def bubble(c, x, y, r=6):
    c.setFillColor(BLUE); c.setStrokeColor(BLUE); c.circle(x, y, r, stroke=1, fill=1)

def header(c):
    fit_image(c, IMG + "logo-full.png", M - 4, H - 30 - 46, 46)
    c.setFillColor(PINK); c.setFont("Sans-Bold", 11); c.drawRightString(W - M, H - 30 - 20, "APSSB Maths Practice by Amarjeet Sir")
    c.setFillColor(SOFT); c.setFont("Sans", 9); c.drawRightString(W - M, H - 30 - 34, "Northeast PSC, Arunachal Pradesh")

c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle("APSSB Maths Practice by Amarjeet Sir"); c.setAuthor("Northeast PSC"); c.setSubject("Free APSSB Maths practice with step-by-step solutions")

# ---------- Page 1 ----------
header(c)
top = H - 86
cover_image(c, IMG + "hero-class.jpg", 0, top - 236, W, 236)
y = top - 236 - 44
c.setFillColor(INK); c.setFont("Sans-Bold", 34); c.drawString(M, y, "APSSB Maths Practice")
circle_image(c, IMG + "amarjeet-sir-face.jpg", M + 21, y - 40, 42)
c.setFillColor(PINK); c.setFont("Sans-Bold", 17); c.drawString(M + 52, y - 36, "by Amarjeet Sir")
c.setFillColor(SOFT); c.setFont("Sans", 9.5); c.drawString(M + 52, y - 50, "Maths faculty, Northeast PSC")
y = para(c, "<b>2,236 questions with step-by-step solutions</b>: every question of the Basic Mathematics Practice Book and 536 APSSB previous year questions, in 231 quizzes. Free to practise on your phone.",
         M, y - 72, W - 2 * M, 12, INK)
# features (left) and QR card (right)
ftop = y - 18
c.setFillColor(INK); c.setFont("Sans-Bold", 13.5); c.drawString(M, ftop - 4, "What you get")
items = ["17 topics, from Number System to Statistics", "231 quizzes of 10 questions each", "1,700 book questions and 536 APSSB PYQs",
         "Score and a step-by-step solution after every quiz", "Free PYQ classes on YouTube, topic by topic", "Works on any phone, and your progress is saved"]
fy = ftop - 30
for it in items:
    bubble(c, M + 6, fy + 3.5)
    c.setFillColor(INK); c.setFont("Sans", 10.5); c.drawString(M + 20, fy, it)
    fy -= 24
qx, qw = W - M - 178, 178
qtop = ftop + 8
qbottom = fy + 6
c.setStrokeColor(PINK); c.setLineWidth(1.6); c.setFillColor(white); c.roundRect(qx, qbottom, qw, qtop - qbottom, 10, stroke=1, fill=1)
qsize = 118
qr(c, qx + (qw - qsize) / 2, qtop - 10 - qsize, qsize)
c.setFillColor(INK); c.setFont("Sans-Bold", 11.5); c.drawCentredString(qx + qw / 2, qtop - 10 - qsize - 16, "Scan to start practising")
c.setFillColor(SOFT); c.setFont("Sans", 8.5); c.drawCentredString(qx + qw / 2, qtop - 10 - qsize - 30, "or tap here to open the link")
c.linkURL(URL, (qx, qbottom, qx + qw, qtop), relative=0)
# stats strip
sy, sh = 92, 50
c.setStrokeColor(PINK); c.setLineWidth(1.4); c.roundRect(M, sy, W - 2 * M, sh, 8, stroke=1, fill=0)
stats = [("10,000+", "students mentored"), ("1,000+", "selections"), ("120+", "batches completed"), ("2,000+", "Google reviews")]
cw = (W - 2 * M) / 4
for i, (n, l) in enumerate(stats):
    x = M + i * cw
    if i: c.line(x, sy, x, sy + sh)
    c.setFillColor(INK); c.setFont("Sans-Bold", 17); c.drawString(x + 12, sy + 26, n)
    c.setFillColor(PINK); c.setFont("Sans", 9); c.drawString(x + 12, sy + 11, l)
c.setFillColor(BLUE); c.setFont("Sans-Bold", 13); c.drawString(M, 52, "Call or WhatsApp: 60095 26445")
c.setFillColor(SOFT); c.setFont("Sans", 9.5); c.drawRightString(W - M, 52, "Telegram: t.me/Northeast_PSC")
c.showPage()

# ---------- Page 2 ----------
header(c)
c.setFillColor(INK); c.setFont("Sans-Bold", 21); c.drawString(M, H - 112, "Our selections")
by = H - 124
bh = (W - 2 * M) * 456 / 1200
cover_image(c, IMG + "selections-banner.jpg", M, by - bh, W - 2 * M, bh, radius=8)
YEARS = [("2026", [("350+", "Uniform Services"), ("40+", "CHSL", "2nd and 4th rank"), ("30+", "CGL")]),
         ("2025", [("100+", "CSL"), ("50+", "Non Ministerial"), ("20+", "Head Constable (TCL)"), ("20+", "MTS (TCL)"), ("10+", "CHSL")]),
         ("2024", [("65+", "CSL"), ("60+", "Non Ministerial"), ("40+", "Head Constable"), ("25", "CGL", "2 in top 10"), ("20+", "Stenographer", "3 in top 10"), ("15+", "CHSL")]),
         ("2023", [("140+", "CSL"), ("20+", "CHSL")])]
ht = by - bh - 10
avail = W - 2 * M - 74
def item_w(it):
    w = pdfmetrics.stringWidth(it[0], "Sans-Bold", 11.5) + 4 + pdfmetrics.stringWidth(it[1], "Sans", 9.5)
    if len(it) > 2: w += pdfmetrics.stringWidth(" (" + it[2] + ")", "Sans", 8.5)
    return w + 16
layout = []
for yr, items in YEARS:
    lines, cur = [[]], 0
    for it in items:
        w = item_w(it)
        if lines[-1] and cur + w > avail: lines.append([]); cur = 0
        lines[-1].append(it); cur += w
    layout.append((yr, lines))
row_h = [8 + 15 * len(l) + 3 for _, l in layout]
box_h = sum(row_h)
c.setStrokeColor(PINK); c.setLineWidth(1.2); c.roundRect(M, ht - box_h, W - 2 * M, box_h, 8, stroke=1, fill=0)
c.line(M + 60, ht - box_h, M + 60, ht)
y0 = ht
for (yr, lines), h in zip(layout, row_h):
    if y0 != ht: c.setStrokeColor(PINK); c.line(M, y0, W - M, y0)
    c.setFillColor(PINK); c.setFont("Sans-Bold", 12.5); c.drawString(M + 12, y0 - 8 - 11.5, yr)
    ly = y0 - 8 - 11.5
    for line in lines:
        x = M + 72
        for it in line:
            c.setFillColor(INK); c.setFont("Sans-Bold", 11.5); c.drawString(x, ly, it[0]); x += pdfmetrics.stringWidth(it[0], "Sans-Bold", 11.5) + 4
            c.setFillColor(SOFT); c.setFont("Sans", 9.5); c.drawString(x, ly + 0.5, it[1]); x += pdfmetrics.stringWidth(it[1], "Sans", 9.5)
            if len(it) > 2:
                c.setFillColor(PINK); c.setFont("Sans", 8.5); t = " (" + it[2] + ")"; c.drawString(x, ly + 0.5, t); x += pdfmetrics.stringWidth(t, "Sans", 8.5)
            x += 16
        ly -= 15
    y0 -= h
rh = box_h / 4
# batches and books
lab0 = "APSSB Uniform Services topper: "
c.setFillColor(PINK); c.setFont("Sans-Bold", 9.5); c.drawString(M, ht - 4 * rh - 16, lab0.strip())
c.setFillColor(INK); c.setFont("Sans", 9.5); c.drawString(M + pdfmetrics.stringWidth(lab0, "Sans-Bold", 9.5), ht - 4 * rh - 16, "Bujum Negia Dignium (Overall Rank 2, APST Rank 1)")
lab = "APSSB CHSL 2026 toppers: "
c.setFillColor(PINK); c.setFont("Sans-Bold", 9.5); c.drawString(M, ht - 4 * rh - 30, lab.strip())
c.setFillColor(INK); c.setFont("Sans", 9.5); c.drawString(M + pdfmetrics.stringWidth(lab, "Sans-Bold", 9.5), ht - 4 * rh - 30, "Jumram Kambu (2nd Rank, LDC) and Jumyir Kamgo (4th Rank)")
c.setFillColor(INK); c.setFont("Sans-Bold", 9.5); c.drawString(M, ht - 4 * rh - 44, "Selected in APPSCCE 2024:")
c.setFont("Sans", 9.5); c.drawString(M + pdfmetrics.stringWidth("Selected in APPSCCE 2024: ", "Sans-Bold", 9.5), ht - 4 * rh - 44, "Kemin Gamlin (APCS, Rank 16), Takar Nasi, Rijum Kaye, Begam Angu, Kaling Doming")
yb = ht - 4 * rh - 68
c.setFillColor(INK); c.setFont("Sans-Bold", 15); c.drawString(M, yb, "Batches and books")
ih = 98
iy = yb - 12 - ih
cards = [("batch-online-maths.jpg", "Online Maths Batch by Amarjeet Sir, ₹1,500 (was ₹2,500)"),
         ("batch-apssb-online.jpg", "Complete APSSB Online Batch, ₹6,000"),
         ("batch-appscce-csat.jpg", "APPSCCE CSAT 2026 batch, ₹5,000 (was ₹10,000)"),
         ("book-basic.jpg", "APSSB Maths Booster books, ₹299 each")]
x = M
for f, cap in cards:
    w = fit_image(c, IMG + f, x, iy, ih)
    c.setStrokeColor(LINE); c.setLineWidth(1); c.rect(x, iy, w, ih)
    para(c, cap, x, iy - 6, max(w, 112), 8.6, SOFT, 11)
    x += max(w, 112) + 18
# contact box
cy0, ch = 40, 108
c.setFillColor(WASH); c.setStrokeColor(PINK); c.setLineWidth(1.4); c.roundRect(M, cy0, W - 2 * M, ch, 10, stroke=1, fill=1)
c.setFillColor(INK); c.setFont("Sans-Bold", 12.5); c.drawString(M + 14, cy0 + ch - 22, "Join a batch or ask anything")
c.setFillColor(BLUE); c.setFont("Sans-Bold", 16); c.drawString(M + 14, cy0 + ch - 44, "Call or WhatsApp: 60095 26445")
c.setFillColor(INK); c.setFont("Sans", 9)
c.drawString(M + 14, cy0 + ch - 62, "Centres: Itanagar (above V-Mart), Naharlagun (Lagun Bridge), Nirjuli, Pasighat and online")
c.drawString(M + 14, cy0 + ch - 76, "Telegram: t.me/Northeast_PSC    YouTube: NORTHEAST PSC")
c.drawString(M + 14, cy0 + ch - 90, "App: install Classplus and enter org code yjkfbc")
qs = 76
qr(c, W - M - 14 - qs, cy0 + (ch - qs) / 2 + 6, qs)
c.setFillColor(SOFT); c.setFont("Sans", 7.5); c.drawCentredString(W - M - 14 - qs / 2, cy0 + 8, "Scan to practise")
c.save()
print("saved", OUT)
