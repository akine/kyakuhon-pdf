from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.converter import TextConverter
from pdfminer.layout import LAParams
from pdfminer.pdfpage import PDFPage
from io import StringIO

# 入力ファイル名、出力ファイル名、出力するページ数の範囲を指定する
input_file = "input.pdf"
output_file = "output.txt"
start_page = 3
end_page = 3

# PDFファイルを開く
with open(input_file, "rb") as fp:
    # リソースマネージャーのインスタンスを作成する
    rsrcmgr = PDFResourceManager()
    # 出力先のインスタンスを作成する
    outfp = StringIO()
    # パラメーターのインスタンスを作成する
    laparams = LAParams()
    # 縦書き文字を横並びで出力する
    laparams.detect_vertical = True
    # デバイスのインスタンスを作成する
    device = TextConverter(rsrcmgr, outfp, codec="utf-8", laparams=laparams)
    # 解釈器のインスタンスを作成する
    interpreter = PDFPageInterpreter(rsrcmgr, device)

    # PDFファイルの各ページに対して処理を行う
    current_page = 0
    for page in PDFPage.get_pages(fp):
        current_page += 1
        if current_page < start_page:
            continue
        elif current_page > end_page:
            break
        interpreter.process_page(page)

    # 出力先に保存された文字列をファイルに書き込む
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(outfp.getvalue())

    # デバイスを閉じる
    device.close()

    # PDFファイルを閉じる
    fp.close()
