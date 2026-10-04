export type WritingMode = "auto" | "vertical" | "horizontal";

export interface TextAtom {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  vertical: boolean;
}

export interface ExtractionOptions {
  mode: WritingMode;
  removePageNumbers: boolean;
  removeRuby: boolean;
  joinWrappedLines: boolean;
}

export interface PageText {
  pageNumber: number;
  text: string;
  mode: Exclude<WritingMode, "auto">;
  empty: boolean;
}

export const defaultOptions: ExtractionOptions = {
  mode: "auto",
  removePageNumbers: true,
  removeRuby: false,
  joinWrappedLines: false,
};
