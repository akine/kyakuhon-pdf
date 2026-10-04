import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  FileText,
  FolderOpen,
  Info,
  LoaderCircle,
  LockKeyhole,
  PanelLeftClose,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import PdfPreview from "./components/PdfPreview";
import { useWorkspace } from "./hooks/useWorkspace";
import type { WritingMode } from "./lib/types";

type ConfirmAction = { label: string; run: () => void };
const sizeLabel = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function Toggle({
  checked,
  onChange,
  children,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className="toggle-row">
      <span>
        <span className="toggle-label">{children}</span>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="toggle-track" aria-hidden="true" />
    </label>
  );
}

export default function App() {
  const fileInput = useRef<HTMLInputElement>(null);
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(
    null,
  );
  const [mobilePanel, setMobilePanel] = useState<"text" | "pdf">("text");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    pdf,
    source,
    pages,
    index,
    setIndex,
    options,
    setOptions,
    start,
    setStart,
    end,
    setEnd,
    markers,
    setMarkers,
    busy,
    progress,
    error,
    setError,
    toast,
    edited,
    current,
    hasText,
    charCount,
    settingsChanged,
    loadFile,
    loadSample,
    reconvert,
    cancel,
    editText,
    copy,
    save,
    reset,
  } = useWorkspace(() => {
    setMobilePanel("text");
    setSettingsOpen(false);
  });
  useEffect(() => {
    if (pendingAction) confirmDialog.current?.showModal();
    else confirmDialog.current?.close();
  }, [pendingAction]);
  function guard(label: string, run: () => void) {
    if (edited) setPendingAction({ label, run });
    else run();
  }
  function chooseFile(file?: File) {
    if (file) guard("PDFを切り替える", () => void loadFile(file));
  }

  return (
    <div
      className="app-shell"
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy && e.dataTransfer.types.includes("Files")) setDragging(true);
      }}
    >
      <header className="app-header">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          onClick={(e) => {
            e.preventDefault();
            if (!busy) guard("ホームに戻る", reset);
          }}
          aria-label="ひらく ホーム"
        >
          <span className="brand-mark" aria-hidden="true">
            <BookOpen size={24} strokeWidth={1.7} />
          </span>
          <span className="brand-name">
            ひらく<span className="brand-dot">。</span>
          </span>
          <span className="brand-description">脚本を、次のかたちへ。</span>
        </a>
        <div className="header-right">
          <span className="privacy-badge">
            <span className="status-dot" />
            <span className="privacy-full">このブラウザだけで処理</span>
            <span className="privacy-short">端末内で処理</span>
            <LockKeyhole size={12} />
          </span>
          <button
            className="icon-button help-button"
            aria-label="使い方"
            onClick={() => helpDialog.current?.showModal()}
          >
            <CircleHelp size={19} />
          </button>
          <a
            className="github-link"
            href="https://github.com/akine/kyakuhon-pdf"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
            <ArrowUpRight size={13} />
          </a>
        </div>
      </header>
      <div className="workspace-shell">
        <aside
          className={`sidebar ${settingsOpen ? "settings-open" : ""}`}
          aria-label="変換設定"
        >
          <div className="sidebar-title">
            <span>ワークスペース</span>
            <button
              className="icon-button mobile-only"
              aria-label="設定を閉じる"
              onClick={() => setSettingsOpen(false)}
            >
              <X size={18} />
            </button>
            <span className="tiny-label desktop-only">01</span>
          </div>
          <div className="sidebar-section document-section">
            <div className="section-label">ドキュメント</div>
            {source ? (
              <>
                <div className="file-card">
                  <span className="file-icon">
                    <FileText size={23} strokeWidth={1.5} />
                  </span>
                  <div>
                    <strong title={source.name}>{source.name}</strong>
                    <span>
                      {source.total} ページ<span className="bullet">·</span>
                      {sizeLabel(source.size)}
                    </span>
                  </div>
                  {source.sample && <span className="sample-tag">SAMPLE</span>}
                </div>
                <button
                  className="replace-button"
                  onClick={() => fileInput.current?.click()}
                  disabled={busy}
                >
                  <FolderOpen size={14} />
                  別のPDFを選ぶ
                </button>
              </>
            ) : (
              <button
                className="sidebar-upload"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={23} strokeWidth={1.5} />
                <span>PDFを選ぶ</span>
                <small>または、ここにドロップ</small>
              </button>
            )}
          </div>
          <div className="sidebar-section">
            <div className="section-label">
              読み取り設定
              <SlidersHorizontal size={13} />
            </div>
            <label className="field-label" htmlFor="writing-mode">
              原稿の文字方向
            </label>
            <div className="select-wrap">
              <select
                id="writing-mode"
                value={options.mode}
                disabled={busy}
                onChange={(e) =>
                  setOptions((o) => ({
                    ...o,
                    mode: e.target.value as WritingMode,
                  }))
                }
              >
                <option value="auto">自動で判定</option>
                <option value="vertical">縦書き（右から左）</option>
                <option value="horizontal">横書き（左から右）</option>
              </select>
              <ChevronDown size={14} />
            </div>
            <div className="field-label range-title">
              変換するページ
              {source && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    setStart("1");
                    setEnd(String(source.total));
                  }}
                >
                  すべて
                </button>
              )}
            </div>
            <div className="range-inputs">
              <label>
                <span>開始</span>
                <input
                  aria-label="開始ページ"
                  type="number"
                  min="1"
                  max={source?.total ?? 1}
                  value={start}
                  disabled={!pdf || busy}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <span className="range-dash">—</span>
              <label>
                <span>終了</span>
                <input
                  aria-label="終了ページ"
                  type="number"
                  min="1"
                  max={source?.total ?? 1}
                  value={end}
                  disabled={!pdf || busy}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </div>
          </div>
          <div className="sidebar-section cleanup-section">
            <div className="section-label">テキストを整える</div>
            <Toggle
              checked={options.removePageNumbers}
              disabled={busy}
              onChange={(v) =>
                setOptions((o) => ({ ...o, removePageNumbers: v }))
              }
              description="余白にある数字を除きます"
            >
              ページ番号を除く
            </Toggle>
            <Toggle
              checked={options.joinWrappedLines}
              disabled={busy}
              onChange={(v) =>
                setOptions((o) => ({ ...o, joinWrappedLines: v }))
              }
              description="「 」内の改行をつなぎます"
            >
              セリフの折り返しをつなぐ
            </Toggle>
            <Toggle
              checked={options.removeRuby}
              disabled={busy}
              onChange={(v) => setOptions((o) => ({ ...o, removeRuby: v }))}
              description="小さな文字を除きます"
            >
              ルビを除く
            </Toggle>
            <button
              className={`reconvert-button ${settingsChanged ? "changed" : ""}`}
              disabled={!pdf || busy || (!settingsChanged && !edited)}
              onClick={() => guard("再変換する", () => void reconvert())}
            >
              <RotateCcw size={14} />
              設定を反映して再変換
              {settingsChanged && <span className="change-dot" />}
            </button>
            {settingsChanged && (
              <p className="settings-note">
                設定を変更しました。再変換で反映されます。
              </p>
            )}
          </div>
          <div className="sidebar-bottom">
            <div className="local-note">
              <ShieldCheck size={18} strokeWidth={1.5} />
              <div>
                <strong>あなたの原稿は、あなたの手元に。</strong>
                <p>
                  ファイルは外部に送信されません。
                  <br />
                  画面を閉じるとデータは消去されます。
                </p>
              </div>
            </div>
            <div className="sidebar-footer">
              <span>HIRAKU / 脚本PDFツール</span>
              <span>v1.0</span>
            </div>
          </div>
        </aside>
        <main className={`main-area ${pdf ? "has-document" : ""}`}>
          <div className="workspace-heading">
            <div>
              <div className="eyebrow">
                <span /> SCRIPT TO TEXT
              </div>
              <h1>
                {pdf ? "原稿に、もう一度ことばの自由を。" : "脚本を、ひらく。"}
              </h1>
              <p>
                {pdf
                  ? "原稿と見比べながら整えて、次の作業へ。"
                  : "縦書きのPDFから、編集できる横書きテキストへ。"}
              </p>
            </div>
            <button
              className="mobile-settings secondary-button"
              onClick={() => setSettingsOpen(true)}
            >
              <SlidersHorizontal size={16} />
              設定
            </button>
            {pdf && (
              <span className="document-count">
                <FileText size={15} />
                {pages.length} ページのワークスペース
              </span>
            )}
          </div>
          {error && (
            <div className="alert" role="alert">
              <Info size={17} />
              <span>{error}</span>
              <button aria-label="エラーを閉じる" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {busy && (
            <div className="progress-card" role="status">
              <LoaderCircle className="spin" size={18} />
              <div>
                <strong>
                  {progress.total
                    ? "テキストに変換しています"
                    : "PDFを開いています"}
                </strong>
                <span>
                  {progress.total
                    ? `${progress.done} / ${progress.total} ページ`
                    : "ファイルをこのブラウザに読み込んでいます"}
                </span>
              </div>
              <progress
                max={progress.total || 1}
                value={progress.done}
                aria-label="変換の進捗"
              />
              <button className="text-button" onClick={cancel}>
                中止
              </button>
            </div>
          )}
          {!pdf ? (
            <div className="welcome-content">
              <div className="welcome-workbench">
                <div className="welcome-copy">
                  <span className="intro-tag">書かれた物語の、その先へ。</span>
                  <h2>
                    読むだけのPDFを、
                    <br />
                    <em>使えるテキスト</em>に。
                  </h2>
                  <p>
                    セリフを抜き出す。メモを添える。
                    <br />
                    次の稿に活かす。
                    <br />
                    原稿のことばを、もっと扱いやすく。
                  </p>
                  <div className="welcome-actions">
                    <button
                      className="primary-button"
                      disabled={busy}
                      onClick={() => fileInput.current?.click()}
                    >
                      <Upload size={16} />
                      PDFを選んではじめる
                      <ArrowRight size={16} />
                    </button>
                    <button
                      className="sample-button"
                      disabled={busy}
                      onClick={() => void loadSample()}
                    >
                      サンプルで試す
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <span className="file-hint">
                    ドラッグ＆ドロップにも対応 · PDF / 最大50 MB
                  </span>
                </div>
                <div className="paper-illustration" aria-hidden="true">
                  <div className="vertical-paper">
                    <div className="paper-corner" />
                    <span className="script-number">第一稿</span>
                    <div className="vertical-script">
                      <b>雨あがりの待ち合わせ</b>
                      <span>○ 小さな駅・改札前（夕方）</span>
                      <span>雨がやんだばかりの駅前。</span>
                      <span>春「明日も、晴れるかな」</span>
                      <span>凪「晴れなくても、ここで待ってる」</span>
                    </div>
                    <span className="paper-page-number">1</span>
                  </div>
                  <div className="conversion-arrow">
                    <ArrowRight size={21} />
                  </div>
                  <div className="text-paper">
                    <div className="text-paper-header">
                      <span className="mini-dot" />
                      EDITABLE TEXT<span>.txt</span>
                    </div>
                    <p>○ 小さな駅・改札前（夕方）</p>
                    <p>雨がやんだばかりの駅前。</p>
                    <p>春「明日も、晴れるかな」</p>
                    <p>
                      凪「晴れなくても、
                      <br />
                      　　ここで待ってる」
                      <span className="caret" />
                    </p>
                    <div className="text-paper-footer">
                      <Check size={11} />
                      コピーも、編集も、自由に。
                    </div>
                  </div>
                  <span className="illustration-caption">
                    物語はそのまま。かたちを、ひらく。
                  </span>
                </div>
              </div>
              <div className="steps">
                <div>
                  <span className="step-number">01</span>
                  <div>
                    <h3>原稿を置く</h3>
                    <p>文字入りのPDFを選ぶだけ。</p>
                  </div>
                  <Upload size={20} />
                </div>
                <div>
                  <span className="step-number">02</span>
                  <div>
                    <h3>見比べて、整える</h3>
                    <p>縦書きも横書きも、自動で判定。</p>
                  </div>
                  <PanelLeftClose size={20} />
                </div>
                <div>
                  <span className="step-number">03</span>
                  <div>
                    <h3>次の作業へ</h3>
                    <p>コピー、またはTXTで保存。</p>
                  </div>
                  <ArrowDownToLine size={20} />
                </div>
              </div>
              <div className="welcome-footnote">
                <Info size={14} />
                <span>
                  文字を選択できるPDFに対応しています。スキャン画像の文字認識（OCR）は未対応です。
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="workspace-toolbar">
                <div className="workspace-tabs">
                  <span className="active">
                    <span className="status-dot" />
                    変換結果
                  </span>
                  {source?.sample && (
                    <span className="demo-label">サンプル脚本</span>
                  )}
                </div>
                <div className="export-actions">
                  <button
                    className="secondary-button"
                    disabled={!hasText || busy}
                    onClick={() => void copy()}
                  >
                    <Copy size={15} />
                    <span>すべてコピー</span>
                  </button>
                  <button
                    className="primary-button"
                    disabled={!hasText || busy}
                    onClick={save}
                  >
                    <ArrowDownToLine size={16} />
                    <span>TXTを保存</span>
                  </button>
                </div>
              </div>
              <div className="mobile-view-tabs">
                <button
                  className={mobilePanel === "pdf" ? "active" : ""}
                  onClick={() => setMobilePanel("pdf")}
                >
                  <BookOpen size={15} />
                  原稿を見る
                </button>
                <button
                  className={mobilePanel === "text" ? "active" : ""}
                  onClick={() => setMobilePanel("text")}
                >
                  <FileText size={15} />
                  テキストを編集
                </button>
              </div>
              <div
                className={`editor-workspace show-${mobilePanel}`}
                aria-busy={busy}
              >
                <section className="preview-pane">
                  <div className="pane-header">
                    <span>
                      <BookOpen size={15} />
                      原稿プレビュー
                    </span>
                    <span className="tiny-label">ORIGINAL PDF</span>
                  </div>
                  {current && (
                    <PdfPreview pdf={pdf} pageNumber={current.pageNumber} />
                  )}
                </section>
                <section className="text-pane">
                  <div className="pane-header">
                    <span>
                      <FileText size={15} />
                      横書きテキスト
                      <span className="editable-badge">編集できます</span>
                    </span>
                    <span className="tiny-label">
                      {current?.mode === "vertical" ? "縦書き" : "横書き"}
                      として変換
                    </span>
                  </div>
                  <div className="text-editor-wrap">
                    <div className="editor-page-label">
                      PAGE {String(current?.pageNumber ?? 1).padStart(2, "0")}
                      <span>{edited ? "編集内容を保持中" : "変換済み"}</span>
                    </div>
                    {current?.empty && (
                      <div className="empty-page-note">
                        <Info size={17} />
                        <div>
                          <strong>
                            このページには読み取れる文字がありません。
                          </strong>
                          <p>
                            スキャン画像の場合は、OCR済みのPDFを読み込んでください。ここに直接テキストを入力することもできます。
                          </p>
                        </div>
                      </div>
                    )}
                    <textarea
                      aria-label="変換したテキスト"
                      value={current?.text ?? ""}
                      onChange={(e) => editText(e.target.value)}
                      disabled={busy}
                      spellCheck={false}
                      placeholder="このページのテキストを入力…"
                    />
                    <div className="editor-hint">
                      テキストは自由に編集できます。保存してから画面を閉じてください。
                    </div>
                  </div>
                </section>
              </div>
              <div className="workspace-bottom">
                <div className="page-navigation">
                  <button
                    className="icon-button"
                    aria-label="前のページ"
                    disabled={index === 0 || busy}
                    onClick={() => setIndex((i) => i - 1)}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <label>
                    <select
                      aria-label="表示するページ"
                      value={index}
                      onChange={(e) => setIndex(Number(e.target.value))}
                      disabled={busy}
                    >
                      {pages.map((p, i) => (
                        <option value={i} key={p.pageNumber}>
                          {p.pageNumber} ページ
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} />
                  </label>
                  <span>/ {source?.total}</span>
                  <button
                    className="icon-button"
                    aria-label="次のページ"
                    disabled={index >= pages.length - 1 || busy}
                    onClick={() => setIndex((i) => i + 1)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
                <span className="character-count">
                  全 {charCount.toLocaleString()} 文字
                  <span className="bullet">·</span>
                  {pages.length} ページ
                </span>
                <label className="marker-option">
                  <input
                    type="checkbox"
                    checked={markers}
                    onChange={(e) => setMarkers(e.target.checked)}
                  />
                  書き出しにページ区切りを付ける
                </label>
              </div>
              <div className="workspace-note">
                <ShieldCheck size={14} />
                <span>このブラウザ内で変換しています</span>
                <span className="result-note">
                  読み順やルビは、原稿と見比べて確認してください。
                </span>
              </div>
            </>
          )}
          <footer className="main-footer">
            <span>ことばをつなぐ、小さな道具。</span>
            <span>Made for the next draft.</span>
          </footer>
        </main>
      </div>
      <input
        ref={fileInput}
        className="visually-hidden"
        tabIndex={-1}
        type="file"
        accept="application/pdf,.pdf"
        aria-label="PDFファイル"
        onChange={(e) => {
          chooseFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {dragging && (
        <div
          className="drop-overlay"
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node))
              setDragging(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length > 1)
              setError("一度に1つのPDFを選んでください。");
            else chooseFile(e.dataTransfer.files[0]);
          }}
        >
          <div>
            <Upload size={40} strokeWidth={1.5} />
            <h2>原稿をここに。</h2>
            <p>ドロップして、テキストに変換</p>
          </div>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      <dialog
        ref={confirmDialog}
        aria-labelledby="confirm-title"
        className="modal"
        onCancel={() => setPendingAction(null)}
      >
        <span className="modal-icon">
          <RotateCcw size={24} />
        </span>
        <h2 id="confirm-title">編集したテキストを置き換えます</h2>
        <p>
          現在の編集内容は失われます。必要なテキストは、先にTXTで保存してください。
        </p>
        <div className="modal-actions">
          <button
            className="secondary-button"
            autoFocus
            onClick={() => setPendingAction(null)}
          >
            戻る
          </button>
          <button
            className="primary-button"
            onClick={() => {
              const action = pendingAction;
              setPendingAction(null);
              action?.run();
            }}
          >
            {pendingAction?.label}
          </button>
        </div>
      </dialog>
      <dialog
        ref={helpDialog}
        aria-labelledby="help-title"
        className="modal help-modal"
      >
        <button
          className="modal-close icon-button"
          aria-label="使い方を閉じる"
          onClick={() => helpDialog.current?.close()}
        >
          <X size={19} />
        </button>
        <span className="eyebrow">A LITTLE GUIDE</span>
        <h2 id="help-title">ひらくの使い方</h2>
        <ol>
          <li>
            <strong>PDFを選ぶ</strong>
            <p>文字を選択できるPDFに対応。最大50 MB・500ページです。</p>
          </li>
          <li>
            <strong>原稿と見比べる</strong>
            <p>
              ページを送りながら、右側のテキストを自由に修正できます。順序が違うときは文字方向を指定して再変換してください。
            </p>
          </li>
          <li>
            <strong>コピー、または保存</strong>
            <p>
              選択範囲の全ページをまとめて書き出します。編集内容は画面を閉じると消えるため、最後に保存してください。
            </p>
          </li>
        </ol>
        <div className="help-note">
          <LockKeyhole size={16} />
          <p>
            PDFやテキストを外部に送信・保存する処理はありません。スキャン画像のOCR・パスワード付きPDFは未対応です。ルビ除去は文字サイズによる推定のため、小さな注記も除かれることがあります。
          </p>
        </div>
      </dialog>
    </div>
  );
}
