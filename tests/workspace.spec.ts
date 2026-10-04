import { expect, test } from "@playwright/test";
import path from "node:path";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

test("converts a real vertical PDF, edits pages and exports the selected range", async ({
  page,
}) => {
  const exceptions: string[] = [];
  page.on("pageerror", (error) => exceptions.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "サンプルで試す" }).click();
  const editor = page.getByRole("textbox", { name: "変換したテキスト" });
  await expect(editor).toHaveValue(/雨あがりの待ち合わせ\n第一稿\n○ 小さな駅/);
  await expect(editor).toHaveValue(/春「遅いな/);
  await expect(page.getByText("縦書きとして変換")).toBeVisible();
  await editor.fill("編集したセリフ");
  await page.getByRole("button", { name: "次のページ" }).click();
  await expect(editor).toHaveValue(/駅前のベンチ/);
  await page.getByRole("button", { name: "前のページ" }).click();
  await expect(editor).toHaveValue("編集したセリフ");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "TXTを保存" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("雨あがりの待ち合わせ_1-3.txt");
  const text = await readFile((await file.path())!, "utf8");
  expect(text).toContain("編集したセリフ");
  expect(text).toContain("川沿いの道");
  await page.getByLabel("開始ページ").fill("2");
  await page.getByLabel("終了ページ").fill("2");
  await page.getByRole("button", { name: "設定を反映して再変換" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "再変換する", exact: true }).click();
  await expect(editor).toHaveValue(/駅前のベンチ/);
  await expect(page.getByRole("button", { name: "次のページ" })).toBeDisabled();
  expect(exceptions).toEqual([]);
});

test("accepts uploaded horizontal PDF and detects its direction", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .locator("input[type=file]")
    .setInputFiles(path.resolve("tests/fixtures/horizontal.pdf"));
  await expect(
    page.getByRole("textbox", { name: "変換したテキスト" }),
  ).toHaveValue("横書きの脚本\n春「こんにちは」");
  await expect(page.getByText("横書きとして変換")).toBeVisible();
});

test("explains image-only and protected PDFs and recovers from errors", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .locator("input[type=file]")
    .setInputFiles(path.resolve("tests/fixtures/protected.pdf"));
  await expect(page.getByRole("alert")).toContainText("パスワード");
  await page
    .locator("input[type=file]")
    .setInputFiles(path.resolve("tests/fixtures/no-text.pdf"));
  await expect(
    page.getByText("このページには読み取れる文字がありません。"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "TXTを保存" })).toBeDisabled();
  await page.getByRole("button", { name: "別のPDFを選ぶ" }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles(path.resolve("tests/fixtures/horizontal.pdf"));
  await expect(
    page.getByRole("textbox", { name: "変換したテキスト" }),
  ).toHaveValue(/横書きの脚本/);
});

test("works at mobile width without horizontal page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.getByRole("button", { name: "サンプルで試す" }).click();
  await expect(
    page.getByRole("textbox", { name: "変換したテキスト" }),
  ).toHaveValue(/雨あがり/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "原稿を見る" }).click();
  await expect(page.getByRole("img", { name: "原稿 1ページ" })).toBeVisible();
});

test("copies edited text with page markers and makes no external requests", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const external: string[] = [];
  const writes: string[] = [];
  await page.goto("./");
  const origin = new URL(page.url()).origin;
  page.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      new URL(request.url()).origin !== origin
    )
      external.push(request.url());
    if (request.method() !== "GET") writes.push(request.method());
  });
  await page
    .locator("input[type=file]")
    .setInputFiles(path.resolve("tests/fixtures/horizontal.pdf"));
  const editor = page.getByRole("textbox", { name: "変換したテキスト" });
  await expect(editor).toHaveValue(/横書きの脚本/);
  await editor.fill("コピーするセリフ");
  await page.getByLabel("書き出しにページ区切りを付ける").check();
  await page.getByRole("button", { name: "すべてコピー" }).click();
  await expect(page.getByRole("status")).toContainText("コピーしました");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "── 1ページ ──\nコピーするセリフ",
  );
  expect(external).toEqual([]);
  expect(writes).toEqual([]);
});

test("keeps the current document when replacement fails or is cancelled", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "サンプルで試す" }).click();
  const editor = page.getByRole("textbox", { name: "変換したテキスト" });
  await expect(editor).toHaveValue(/雨あがり/);
  await editor.fill("大切な編集");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "broken.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.7 broken"),
    });
  await page.getByRole("button", { name: "戻る", exact: true }).click();
  await expect(editor).toHaveValue("大切な編集");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "broken.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.7 broken"),
    });
  await page
    .getByRole("button", { name: "PDFを切り替える", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("読み取れませんでした");
  await expect(editor).toHaveValue("大切な編集");
});

test("has accessible welcome, workspace, and help screens", async ({
  page,
}) => {
  await page.goto("./");
  for (const screen of ["welcome", "workspace", "help"]) {
    if (screen === "workspace") {
      await page.getByRole("button", { name: "サンプルで試す" }).click();
      await expect(
        page.getByRole("textbox", { name: "変換したテキスト" }),
      ).toHaveValue(/雨あがり/);
    }
    if (screen === "help")
      await page.getByRole("button", { name: "使い方", exact: true }).click();
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(violations, screen).toEqual([]);
  }
});
