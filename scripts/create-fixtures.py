"""Generate original Japanese screenplay fixtures (requires reportlab and pypdf)."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parents[1]
(ROOT / "public").mkdir(exist_ok=True)
(ROOT / "tests/fixtures").mkdir(parents=True, exist_ok=True)
font = UnicodeCIDFont("HeiseiMin-W3", isVertical=True)
pdfmetrics.registerFont(font)
pages = [
    ["雨あがりの待ち合わせ", "第一稿", "○ 小さな駅・改札前（夕方）", "雨がやんだばかりの駅前。", "水たまりに、夕暮れの空が映っている。", "春、改札の横で古い時計を見上げる。", "春「遅いな。もう、帰ろうかな」", "遠くから、走ってくる足音。", "凪「待って！ まだ帰らないで」", "春「……五分、遅刻」", "凪「その五分で、いいもの見つけた」"],
    ["○ 駅前のベンチ（つづき）", "凪、鞄から小さな紙袋を取り出す。", "中には、まだ温かいパンが二つ。", "春「これ、坂の上のお店？」", "凪「最後の二つ。ぎりぎりだった」", "春は紙袋を受け取り、少し笑う。", "春「じゃあ、今日は許す」", "二人、ベンチに並んで座る。", "雲の切れ間から、細い光が差す。"],
    ["○ 川沿いの道（日暮れ）", "二人、ゆっくりと歩いている。", "春「明日も、晴れるかな」", "凪「晴れなくても、ここで待ってる」", "春「じゃあ、遅刻しないでね」", "凪、うなずく。", "足音が、少しずつ遠ざかっていく。", "了"],
]
c = canvas.Canvas(str(ROOT / "public/sample.pdf"), pagesize=(595, 842))
c.setTitle("雨あがりの待ち合わせ | ひらく サンプル脚本")
c.setAuthor("kyakuhon-pdf sample")
for number, lines in enumerate(pages, 1):
    c.setFont("HeiseiMin-W3", 16)
    for i, line in enumerate(lines):
        c.drawString(530 - i * 39, 772, line)
    c.setFont("Helvetica", 10)
    c.drawCentredString(297, 32, str(number))
    c.showPage()
c.save()
pdfmetrics.registerFont(UnicodeCIDFont("HeiseiMin-W3"))
c = canvas.Canvas(str(ROOT / "tests/fixtures/horizontal.pdf"), pagesize=(595, 842))
c.setFont("HeiseiMin-W3", 16)
c.drawString(50, 760, "横書きの脚本")
c.drawString(50, 720, "春「こんにちは」")
c.save()
c = canvas.Canvas(str(ROOT / "tests/fixtures/no-text.pdf"), pagesize=(595, 842))
c.setFillColorRGB(.85, .85, .85)
c.rect(80, 80, 400, 650, fill=True)
c.save()
writer = PdfWriter()
writer.append(PdfReader(ROOT / "public/sample.pdf"))
writer.encrypt("test-password")
writer.write(ROOT / "tests/fixtures/protected.pdf")
print("Created sample and three integration fixtures.")
