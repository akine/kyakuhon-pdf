import { describe, expect, it } from "vitest";
import { extractPage, formatExport, parsePageRange } from "./extract";
import { defaultOptions, type TextAtom } from "./types";

const atom = (
  text: string,
  x: number,
  y: number,
  vertical = true,
  fontSize = 12,
): TextAtom => ({
  text,
  x,
  y,
  vertical,
  fontSize,
  width: vertical ? fontSize : text.length * fontSize,
  height: vertical ? text.length * fontSize : fontSize,
});

describe("reading order", () => {
  it("preserves explicit screenplay indentation", () => {
    expect(
      extractPage(
        [atom("　春、時計を見る。", 180, 40)],
        300,
        400,
        defaultOptions,
      ).text,
    ).toBe("　春、時計を見る。");
  });
  it("turns vertical presentation punctuation back into editable horizontal punctuation", () => {
    expect(
      extractPage(
        [atom("春﹁待って︒﹂︙①Ａ", 180, 40)],
        300,
        400,
        defaultOptions,
      ).text,
    ).toBe("春「待って。」…①Ａ");
  });
  it("keeps explicit spaces between vertical text runs", () => {
    expect(
      extractPage(
        [atom("○", 180, 40), atom(" ", 180, 52), atom("駅前", 180, 64)],
        300,
        400,
        defaultOptions,
      ).text,
    ).toBe("○ 駅前");
  });
  it("reads vertical columns from right to left, regardless of PDF object order", () => {
    const items = [
      atom("また明日。」", 160, 20),
      atom("春「", 180, 20),
      atom("待って。", 180, 44),
    ];
    expect(extractPage(items, 300, 400, defaultOptions).text).toBe(
      "春「待って。\nまた明日。」",
    );
  });
  it("recognizes individually positioned vertical characters without vertical font metadata", () => {
    const items = [
      atom("う", 100, 44, false),
      atom("あ", 100, 20, false),
      atom("い", 100, 32, false),
    ];
    expect(extractPage(items, 300, 400, defaultOptions)).toMatchObject({
      text: "あいう",
      mode: "vertical",
    });
  });
  it("reads horizontal lines top to bottom and preserves spaces between Latin words", () => {
    const items = [
      atom("世界", 60, 80, false),
      atom("world", 52, 50, false),
      atom("Hello", 10, 50, false, 8),
      atom("こんにちは", 0, 80, false),
    ];
    expect(extractPage(items, 300, 400, defaultOptions).text).toBe(
      "Hello world\nこんにちは世界",
    );
  });
  it("removes only page numbers in the outer page margins", () => {
    const items = [
      atom("12", 150, 390, false),
      atom("2026", 180, 100),
      atom("本文", 160, 100),
    ];
    expect(extractPage(items, 300, 400, defaultOptions).text).toBe(
      "2026\n本文",
    );
    expect(
      extractPage(items, 300, 400, {
        ...defaultOptions,
        removePageNumbers: false,
      }).text,
    ).toContain("12");
  });
  it("preserves small text unless ruby removal is requested", () => {
    const items = [
      atom("駅前", 180, 50),
      atom("えきまえ", 188, 50, true, 5),
      atom("夕暮れ", 160, 50),
    ];
    expect(extractPage(items, 300, 400, defaultOptions).text).toContain(
      "えきまえ",
    );
    expect(
      extractPage(items, 300, 400, { ...defaultOptions, removeRuby: true })
        .text,
    ).toBe("駅前\n夕暮れ");
  });
  it("joins a wrapped speech but keeps the next scene separate", () => {
    const items = [
      atom("春「今日は", 180, 50),
      atom("いい天気だね。」", 160, 50),
      atom("○ 駅前（夕）", 140, 50),
    ];
    expect(
      extractPage(items, 300, 400, {
        ...defaultOptions,
        joinWrappedLines: true,
      }).text,
    ).toBe("春「今日はいい天気だね。」\n○ 駅前（夕）");
  });
  it("reports pages with no extractable text", () => {
    expect(extractPage([], 300, 400, defaultOptions)).toMatchObject({
      text: "",
      empty: true,
    });
  });
});

describe("page selection and export", () => {
  it("accepts inclusive page ranges", () => {
    expect(parsePageRange("2", "4", 8)).toEqual([2, 3, 4]);
  });
  it.each([
    ["0", "3"],
    ["3", "2"],
    ["1.5", "3"],
    ["1", "9"],
    ["", "3"],
    ["NaN", "3"],
  ])("rejects invalid range %s–%s", (start, end) => {
    expect(() => parsePageRange(start, end, 8)).toThrow();
  });
  it("exports edited text in page order with optional page markers", () => {
    const pages = [
      {
        pageNumber: 2,
        text: "修正済み",
        mode: "vertical" as const,
        empty: false,
      },
      { pageNumber: 3, text: "続き", mode: "vertical" as const, empty: false },
    ];
    expect(formatExport(pages, false)).toBe("修正済み\n\n続き");
    expect(formatExport(pages, true)).toBe(
      "── 2ページ ──\n修正済み\n\n── 3ページ ──\n続き",
    );
  });
});
