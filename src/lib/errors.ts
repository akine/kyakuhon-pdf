export function pdfError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "PasswordException")
    return "パスワードで保護されたPDFです。保護を解除したファイルを選んでください。";
  if (name === "InvalidPDFException")
    return "PDFを読み取れませんでした。ファイルが壊れていないか確認してください。";
  return "PDFを開けませんでした。別のPDFでお試しください。";
}
