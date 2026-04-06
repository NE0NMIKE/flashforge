// v2
import { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from "react";
import katex from "katex";

// ─── LaTeX Scan ───
const LATEX_SCAN_PROMPT = `You are a LaTeX equation extractor. The user will send you an image containing mathematical equations, expressions, or formulas.

Your job:
1. Extract ALL mathematical content from the image
2. Convert it to clean, correct LaTeX code
3. Return ONLY the LaTeX — no explanation, no markdown, no backticks, no preamble

Rules:
- Use display math for standalone equations: \\[ ... \\]
- Use inline math for inline expressions: $ ... $
- If there are multiple equations, separate them with newlines
- If it's a system of equations, use the \\begin{cases} or \\begin{align} environments as appropriate
- Preserve all subscripts, superscripts, fractions, integrals, summations, Greek letters, etc.
- If you cannot read part of the equation, use a comment: % unreadable
- Output nothing but LaTeX`;

// ─── Theme ───
const ThemeCtx = createContext({});

const THEMES = {
  dark: {
    appBg: "linear-gradient(170deg, #0B1120 0%, #0F172A 40%, #0B1120 100%)",
    bg: "#0B1120", bg2: "#111827", bg3: "#1E293B",
    border: "#1E293B", border2: "#334155",
    text: "#E2E8F0", text2: "#94A3B8", text3: "#64748B", text4: "#475569",
    cardBg: "linear-gradient(145deg, #111827, #1E293B)",
    cardBack: "linear-gradient(145deg, #1E1B4B, #312E81)",
    cardBackBorder: "#4338CA",
    navBg: "rgba(11,17,32,0.9)",
    inputBg: "#111827", inputBg2: "#0B1120",
    scrollbar: "#1E293B",
    selectBg: "#111827",
  },
  light: {
    appBg: "linear-gradient(170deg, #F8FAFC 0%, #EFF6FF 40%, #F8FAFC 100%)",
    bg: "#F8FAFC", bg2: "#FFFFFF", bg3: "#F1F5F9",
    border: "#E2E8F0", border2: "#CBD5E1",
    text: "#0F172A", text2: "#475569", text3: "#64748B", text4: "#94A3B8",
    cardBg: "linear-gradient(145deg, #FFFFFF, #F1F5F9)",
    cardBack: "linear-gradient(145deg, #EDE9FE, #DDD6FE)",
    cardBackBorder: "#7C3AED",
    navBg: "rgba(248,250,252,0.9)",
    inputBg: "#FFFFFF", inputBg2: "#F8FAFC",
    scrollbar: "#E2E8F0",
    selectBg: "#FFFFFF",
  },
};

// ─── Sample data ───
const mkCard = (id, term, definition) => ({
  id, term, definition, starred: false, bucket: 0,
  interval: 0, easeFactor: 2.5, repetitions: 0, nextReview: 0,
  termImage: null, defImage: null, termTable: null, defTable: null,
});

const SAMPLE_SETS = [
  {
    id: "demo-1", title: "Spanish Basics", folderId: null,
    description: "Common Spanish vocabulary for beginners",
    createdAt: Date.now(),
    cards: [
      mkCard("c1", "Hola", "Hello"),
      mkCard("c2", "Adiós", "Goodbye"),
      mkCard("c3", "Por favor", "Please"),
      mkCard("c4", "Gracias", "Thank you"),
      mkCard("c5", "De nada", "You're welcome"),
      mkCard("c6", "Buenos días", "Good morning"),
      mkCard("c7", "Buenas noches", "Good night"),
      mkCard("c8", "Lo siento", "I'm sorry"),
    ],
  },
  {
    id: "demo-2", title: "Biology: Cell Structure", folderId: null,
    description: "Key organelles and their functions",
    createdAt: Date.now() - 86400000,
    cards: [
      mkCard("b1", "Mitochondria", "Powerhouse of the cell — generates ATP through cellular respiration"),
      mkCard("b2", "Ribosome", "Synthesizes proteins from mRNA instructions"),
      mkCard("b3", "Nucleus", "Contains DNA and controls cell activities"),
      mkCard("b4", "Golgi Apparatus", "Packages and distributes proteins and lipids"),
      mkCard("b5", "Endoplasmic Reticulum", "Network of membranes for protein (rough) and lipid (smooth) synthesis"),
      mkCard("b6", "Lysosome", "Breaks down waste materials and cellular debris"),
    ],
  },
];

// ─── Icons ───
const Icons = {
  Plus: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
  Back: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  Star: ({ filled }) => <svg width="20" height="20" fill={filled ? "#FBBF24" : "none"} stroke={filled ? "#FBBF24" : "currentColor"} strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>,
  Edit: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  Cards: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  Test: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  Import: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
  Shuffle: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>,
  Check: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>,
  X: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  ChevLeft: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>,
  ChevRight: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>,
  Sun: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  Moon: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  Image: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
  Table: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>,
  Folder: () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
  FolderPlus: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><path d="M12 11v6M9 14h6"/></svg>,
  Download: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  Search: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  Trophy: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22h10c0-2-0.85-3.25-2.03-3.79A1.07 1.07 0 0114 17v-2.34"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></svg>,
  Play: () => <svg width="18" height="18" fill="currentColor" stroke="none" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>,
  Pause: () => <svg width="18" height="18" fill="currentColor" stroke="none" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>,
  Settings: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Zap: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  Clock: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
};

// ─── Storage ───
const STORAGE_KEY = "flashforge-sets";
const STORAGE_BACKUP_KEY = "flashforge-sets-backup";
const FOLDERS_KEY = "flashforge-folders";

// Returns { usedKB, totalKB, pct } — totalKB is null when the StorageManager API
// is unavailable (e.g. Firefox private mode).
async function getStorageUsage() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      return { usedKB: Math.round(usage / 1024), totalKB: Math.round(quota / 1024), pct: quota ? usage / quota : 0 };
    }
  } catch {}
  // Fallback: measure localStorage string lengths directly (~2 bytes per char)
  try {
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      bytes += (k.length + (localStorage.getItem(k) || "").length) * 2;
    }
    return { usedKB: Math.round(bytes / 1024), totalKB: 5120, pct: bytes / (5 * 1024 * 1024) };
  } catch {
    return { usedKB: 0, totalKB: 5120, pct: 0 };
  }
}

const storage = {
  load() {
    // Try primary key first
    try {
      const d = localStorage.getItem(STORAGE_KEY);
      if (d) {
        const parsed = JSON.parse(d);
        if (parsed !== null) return parsed;
      }
    } catch { /* primary corrupt, fall through to backup */ }
    // Silent recovery: use backup if primary is absent or corrupt
    try {
      const b = localStorage.getItem(STORAGE_BACKUP_KEY);
      if (b) return JSON.parse(b);
    } catch {}
    return null;
  },
  // Returns true on success, false on quota error
  save(sets) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
    } catch (e) {
      console.error("Save failed:", e);
      return false;
    }
    // Backup written one event-loop tick after primary to guard against
    // the same partial-write fault clobbering both at once.
    setTimeout(() => {
      try { localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(sets)); }
      catch { /* backup write failure is non-fatal */ }
    }, 0);
    return true;
  },
};

const foldersStorage = {
  load() {
    try { const d = localStorage.getItem(FOLDERS_KEY); return d ? JSON.parse(d) : []; }
    catch { return []; }
  },
  save(folders) {
    try { localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders)); }
    catch (e) { console.error("Folders save failed:", e); }
  },
};

// ─── Utilities ───
const uid = () => Math.random().toString(36).slice(2, 10);
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

function renderInlineMarkup(str, keyPrefix) {
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0, m, idx = 0;
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) parts.push(<span key={`${keyPrefix}t${idx++}`}>{str.slice(last, m.index)}</span>);
    if (m[0].startsWith("**")) parts.push(<strong key={`${keyPrefix}b${idx++}`}>{m[2]}</strong>);
    else parts.push(<em key={`${keyPrefix}i${idx++}`}>{m[3]}</em>);
    last = m.index + m[0].length;
  }
  if (last < str.length) parts.push(<span key={`${keyPrefix}t${idx++}`}>{str.slice(last)}</span>);
  return parts;
}

function renderLatex(text) {
  if (!text) return null;
  const segments = [];
  const blockRe = /\$\$([\s\S]+?)\$\$/g;
  let last = 0, m;
  while ((m = blockRe.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: "text", val: text.slice(last, m.index) });
    segments.push({ type: "block", val: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ type: "text", val: text.slice(last) });

  return segments.flatMap((seg, i) => {
    if (seg.type === "block") {
      try {
        return [<span key={i} dangerouslySetInnerHTML={{ __html: katex.renderToString(seg.val, { displayMode: true, throwOnError: false }) }} />];
      } catch { return [<span key={i} style={{ color: "#EF4444" }}>{`$$${seg.val}$$`}</span>]; }
    }
    const inlineRe = /\$([^\n$]+?)\$/g;
    const out = []; let li = 0, im;
    while ((im = inlineRe.exec(seg.val)) !== null) {
      if (im.index > li) out.push(...renderInlineMarkup(seg.val.slice(li, im.index), `${i}t${li}`));
      try {
        out.push(<span key={`${i}m${im.index}`} dangerouslySetInnerHTML={{ __html: katex.renderToString(im[1], { throwOnError: false }) }} />);
      } catch { out.push(<span key={`${i}e${im.index}`} style={{ color: "#EF4444" }}>{`$${im[1]}$`}</span>); }
      li = im.index + im[0].length;
    }
    if (li < seg.val.length) out.push(...renderInlineMarkup(seg.val.slice(li), `${i}t${li}`));
    return out;
  });
}
const newCard = () => ({
  id: uid(), term: "", definition: "", starred: false, bucket: 0,
  interval: 0, easeFactor: 2.5, repetitions: 0, nextReview: 0,
  termImage: null, defImage: null, termTable: null, defTable: null,
});

// ─── SM-2 spaced repetition (fixed: Easy gets bonus interval on first reviews) ───
function computeSM2(card, rating) {
  let { interval = 0, easeFactor = 2.5, repetitions = 0 } = card;
  if (rating < 2) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = rating === 3 ? 4 : 1;    // Easy: 4d bonus on first review
    } else if (repetitions === 1) {
      interval = rating === 3 ? 10 : 6;   // Easy: 10d bonus on second review
    } else {
      interval = Math.round(interval * easeFactor);
    }
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02));
    repetitions++;
  }
  return { interval, easeFactor, repetitions, nextReview: Date.now() + interval * 86400000 };
}

const isDue = (card) => !card.nextReview || card.nextReview <= Date.now();

const getMasteryLevel = (card) => {
  if (!card.repetitions) return "not-studied";
  if (card.repetitions <= 2) return "learning";
  if (card.repetitions > 5 && card.interval >= 21) return "mastered";
  if (card.interval >= 7) return "familiar";
  return "learning";
};

const MASTERY_COLORS = {
  "not-studied": { bg: "rgba(100,116,139,0.15)", color: "#94A3B8", label: "Not studied" },
  "learning":    { bg: "rgba(248,113,113,0.15)", color: "#F87171", label: "Learning" },
  "familiar":    { bg: "rgba(251,191,36,0.15)",  color: "#FBBF24", label: "Familiar" },
  "mastered":    { bg: "rgba(52,211,153,0.15)",   color: "#34D399", label: "Mastered" },
};

const intervalLabel = (card, rating) => {
  const { interval } = computeSM2(card, rating);
  if (interval <= 1) return "1d";
  if (interval < 7) return `${interval}d`;
  if (interval < 30) return `${Math.round(interval / 7)}w`;
  return `${Math.round(interval / 30)}mo`;
};

// ─── Rich content components ───
function TableDisplay({ rows }) {
  const t = useContext(ThemeCtx);
  if (!rows || rows.length === 0) return null;
  return (
    <div style={{ overflowX: "auto", marginTop: 8, width: "100%" }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} style={{
                  border: `1px solid ${t.border2}`, padding: "6px 10px",
                  color: r === 0 ? t.text : t.text2,
                  fontWeight: r === 0 ? 600 : 400, fontSize: 13,
                  background: r === 0 ? t.bg3 : t.bg2,
                  fontFamily: "'DM Sans', sans-serif",
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableEditor({ rows, onChange }) {
  const t = useContext(ThemeCtx);
  const updateCell = (r, c, val) =>
    onChange(rows.map((row, ri) => row.map((cell, ci) => ri === r && ci === c ? val : cell)));
  const addRow = () => onChange([...rows, Array(rows[0]?.length || 2).fill("")]);
  const removeRow = () => rows.length > 1 && onChange(rows.slice(0, -1));
  const addCol = () => onChange(rows.map(row => [...row, ""]));
  const removeCol = () => (rows[0]?.length || 0) > 1 && onChange(rows.map(row => row.slice(0, -1)));

  const tinyBtn = { padding: "3px 8px", fontSize: 11, borderRadius: 6, background: t.bg3, border: `1px solid ${t.border}`, color: t.text2, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ overflowX: "auto", marginBottom: 8 }}>
        <table style={{ borderCollapse: "collapse" }}>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} style={{ border: `1px solid ${t.border2}`, padding: 2 }}>
                    <input value={cell} onChange={e => updateCell(r, c, e.target.value)}
                      placeholder={r === 0 ? `Header ${c + 1}` : "Cell"}
                      style={{ background: r === 0 ? t.bg3 : t.inputBg, border: "none", color: t.text, padding: "4px 8px", fontSize: 12, fontFamily: "'DM Sans', sans-serif", width: 90, outline: "none" }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={tinyBtn} onClick={addRow} type="button">+ Row</button>
        <button style={tinyBtn} onClick={removeRow} type="button">- Row</button>
        <button style={tinyBtn} onClick={addCol} type="button">+ Col</button>
        <button style={tinyBtn} onClick={removeCol} type="button">- Col</button>
      </div>
    </div>
  );
}

async function compressImage(file, maxPx = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > maxPx || h > maxPx) {
          if (w >= h) { h = Math.round(h * maxPx / w); w = maxPx; }
          else { w = Math.round(w * maxPx / h); h = maxPx; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function ExpandableImage({ src, style }) {
  const [hovered, setHovered] = useState(false);
  const [origin, setOrigin] = useState("center center");
  const imgRef = useRef();

  const handleMouseEnter = () => {
    const img = imgRef.current;
    if (img) {
      const card = img.closest(".flashcard-outer");
      if (card) {
        const ir = img.getBoundingClientRect();
        const cr = card.getBoundingClientRect();
        const ox = ((cr.left + cr.width  / 2) - ir.left) / ir.width  * 100;
        const oy = ((cr.top  + cr.height / 2) - ir.top)  / ir.height * 100;
        setOrigin(`${ox}% ${oy}%`);
        card.classList.add("img-hovered");
      } else {
        setOrigin("center center");
      }
    }
    setHovered(true);
  };

  const handleMouseLeave = () => {
    imgRef.current?.closest(".flashcard-outer")?.classList.remove("img-hovered");
    setHovered(false);
  };

  return (
    <img
      ref={imgRef}
      src={src} alt=""
      style={{
        ...style,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        transform: hovered ? "scale(2.2)" : "scale(1)",
        transformOrigin: origin,
        boxShadow: hovered ? "0 16px 48px rgba(0,0,0,0.5)" : "none",
        position: "relative",
        zIndex: hovered ? 10 : "auto",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
}

function renderContent(text, image, table, textStyle, textClass) {
  const isLong = text && (text.includes("\n") || text.length > 80);
  const resolvedStyle = isLong
    ? { whiteSpace: "pre-wrap", ...textStyle, textAlign: "left", width: "100%" }
    : { whiteSpace: "pre-wrap", ...textStyle };
  return (
    <>
      {text && <p className={textClass || ""} style={resolvedStyle}>{renderLatex(text)}</p>}
      {image && <ExpandableImage src={image} style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8, marginTop: text ? 10 : 0, objectFit: "contain" }} />}
      {table && <TableDisplay rows={table} />}
    </>
  );
}

// ─── LaTeX Scan Modal ───
function LatexScanModal({ onClose, onInsert }) {
  const t = useContext(ThemeCtx);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const processFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    const dataUrl = await compressImage(file);
    setImage({ dataUrl, base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
    setResult(""); setError("");
  };

  const handlePaste = useCallback((e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find(i => i.kind === "file" && i.type.startsWith("image/"));
    if (imgItem) { e.preventDefault(); processFile(imgItem.getAsFile()); }
  }, []);

  const convert = async () => {
    const apiKey = localStorage.getItem("flashforge-anthropic-key");
    if (!apiKey) { setError("No API key set. Click the 🔑 button in the top bar to add your Anthropic key."); return; }
    if (!image) return;
    setLoading(true); setError(""); setResult("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: LATEX_SCAN_PROMPT,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: image.mimeType, data: image.base64 } },
            { type: "text", text: "Extract the LaTeX from this image." },
          ]}],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content?.find(b => b.type === "text")?.text?.trim() || "";
      setResult(text);
    } catch (err) {
      setError(err.message || "Conversion failed. Check your API key and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onPaste={handlePaste}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 16,
        padding: 24, width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", gap: 14,
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: t.text, fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
            Scan Equation → LaTeX
          </h3>
          <button type="button" onClick={onClose}
            style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 2 }}>✕</button>
        </div>

        {/* Drop zone */}
        <div
          className={`drop-zone${dragOver ? " drag-over" : ""}`}
          style={{ minHeight: 140, display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16, background: t.bg3, borderRadius: 10, cursor: "pointer" }}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); }}
        >
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => processFile(e.target.files[0])} />
          {image ? (
            <img src={image.dataUrl} alt="" style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 8, objectFit: "contain" }} />
          ) : (
            <div style={{ textAlign: "center", userSelect: "none" }}>
              <p style={{ color: t.text3, fontSize: 13, marginBottom: 4 }}>Drop image or click to browse</p>
              <p style={{ color: t.text4, fontSize: 11, fontFamily: "'Space Mono', monospace" }}>Ctrl+V to paste from clipboard</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p style={{ color: "#F87171", fontSize: 12, background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px", margin: 0 }}>
            {error}
          </p>
        )}

        {/* Result textarea */}
        {result && (
          <textarea
            style={{ background: t.inputBg2, border: `1px solid #6366F1`, borderRadius: 8,
              padding: "10px 12px", color: "#A5B4FC", fontSize: 12, fontFamily: "'Space Mono', monospace",
              resize: "vertical", minHeight: 80, width: "100%", lineHeight: 1.7 }}
            value={result}
            onChange={(e) => setResult(e.target.value)}
            spellCheck={false}
          />
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button"
            style={{ flex: 1, background: "linear-gradient(135deg, #6366F1, #4F46E5)", color: "#fff",
              border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              opacity: (!image || loading) ? 0.45 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onClick={convert} disabled={!image || loading}
          >
            {loading && <span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
            {loading ? "Converting..." : "Convert"}
          </button>
          {result && (
            <button type="button"
              style={{ flex: 1, background: "rgba(99,102,241,0.15)", color: "#818CF8",
                border: "1px solid #6366F1", borderRadius: 10, padding: "10px 16px",
                fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
              onClick={() => onInsert(result)}
            >
              Insert
            </button>
          )}
          <button type="button"
            style={{ background: t.bg3, color: t.text2, border: `1px solid ${t.border}`,
              borderRadius: 10, padding: "10px 16px", fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function RichFieldEditor({ label, textValue, onTextChange, image, onImageChange, table, onTableChange, inputRef, onFocusNext, onFocusPrev }) {
  const t = useContext(ThemeCtx);
  const [showImage, setShowImage] = useState(!!image);
  const [showTable, setShowTable] = useState(!!table);
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const fileRef = useRef();
  const textareaRef = useRef();
  const setTextareaRef = (el) => { textareaRef.current = el; if (inputRef) inputRef.current = el; };
  const undoStack = useRef([]);
  const commitChange = (newVal) => { undoStack.current.push(textValue); onTextChange(newVal); };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [textValue]);

  const handleImageData = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const compressed = await compressImage(file);
    onImageChange(compressed);
  };

  const handleFile = (e) => handleImageData(e.target.files?.[0]);

  const handleUrlAdd = () => {
    if (urlInput.trim()) { onImageChange(urlInput.trim()); setUrlInput(""); }
  };

  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const hasText = items.some(item => item.kind === "string" && (item.type === "text/plain" || item.type === "text/html"));
    const imgItem = items.find(item => item.kind === "file" && item.type.startsWith("image/"));
    // If clipboard has both text and image (e.g. OneNote), let the text paste normally
    if (imgItem && !hasText) {
      e.preventDefault();
      setShowImage(true);
      handleImageData(imgItem.getAsFile());
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageData(file);
  };

  const handleBullet = () => {
    const el = textareaRef.current;
    const { selectionStart: ss, selectionEnd: se } = el;
    const val = textValue;
    const lineStart = val.lastIndexOf("\n", ss - 1) + 1;
    const lineEnd = val.indexOf("\n", se);
    const block = val.slice(lineStart, lineEnd === -1 ? val.length : lineEnd);
    const allBulleted = block.split("\n").every(l => l.startsWith("• "));
    const newBlock = allBulleted
      ? block.replace(/^• /gm, "")
      : block.replace(/^/gm, "• ");
    const newVal = val.slice(0, lineStart) + newBlock + val.slice(lineEnd === -1 ? val.length : lineEnd);
    commitChange(newVal);
    requestAnimationFrame(() => el.focus());
  };

  const wrapSelection = (before, after) => {
    const el = textareaRef.current;
    const { selectionStart: ss, selectionEnd: se } = el;
    const selected = textValue.slice(ss, se);
    const insert = `${before}${selected}${after}`;
    const newVal = textValue.slice(0, ss) + insert + textValue.slice(se);
    commitChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = selected ? ss : ss + before.length;
      el.selectionEnd = selected ? ss + insert.length : ss + before.length;
    });
  };
  const handleBold   = () => wrapSelection("**", "**");
  const handleItalic = () => wrapSelection("*", "*");

  const handleKeyDown = (e) => {
    const el = e.target;
    const { selectionStart: ss, selectionEnd: se } = el;
    const val = textValue;

    if (!e.shiftKey && e.ctrlKey && e.key === "z") {
      e.preventDefault();
      if (undoStack.current.length > 0) { onTextChange(undoStack.current.pop()); }
      return;
    }

    if (e.ctrlKey && e.key === "m") {
      e.preventDefault();
      const lineStart = val.lastIndexOf("\n", ss - 1) + 1;
      const lineEnd = val.indexOf("\n", se);
      const block = val.slice(lineStart, lineEnd === -1 ? val.length : lineEnd);
      const newBlock = block.replace(/^/gm, "  ");
      const delta = newBlock.length - block.length;
      const newVal = val.slice(0, lineStart) + newBlock + val.slice(lineEnd === -1 ? val.length : lineEnd);
      commitChange(newVal);
      requestAnimationFrame(() => { el.selectionStart = Math.max(lineStart, ss + 2); el.selectionEnd = se + delta; });
      return;
    }
    if (e.ctrlKey && e.key === "n") {
      e.preventDefault();
      const lineStart = val.lastIndexOf("\n", ss - 1) + 1;
      const lineEnd = val.indexOf("\n", se);
      const block = val.slice(lineStart, lineEnd === -1 ? val.length : lineEnd);
      const newBlock = block.replace(/^  /gm, "");
      const delta = newBlock.length - block.length;
      const newVal = val.slice(0, lineStart) + newBlock + val.slice(lineEnd === -1 ? val.length : lineEnd);
      commitChange(newVal);
      requestAnimationFrame(() => { el.selectionStart = Math.max(lineStart, ss + delta); el.selectionEnd = se + delta; });
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) { onFocusPrev?.(); } else { onFocusNext?.(); }
    }

    if (e.key === "Enter") {
      const lineStart = val.lastIndexOf("\n", ss - 1) + 1;
      const currentLine = val.slice(lineStart, ss);
      const bulletMatch = currentLine.match(/^(\s*• )/);
      if (bulletMatch) {
        e.preventDefault();
        if (currentLine.trim() === "•") {
          const newVal = val.slice(0, lineStart) + val.slice(ss);
          commitChange(newVal);
          requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = lineStart; });
        } else {
          const insert = "\n" + bulletMatch[1];
          const newVal = val.slice(0, ss) + insert + val.slice(ss);
          commitChange(newVal);
          requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = ss + insert.length; });
        }
      }
    }

    if (e.ctrlKey && e.key === "b") { e.preventDefault(); handleBold(); }
    if (e.ctrlKey && e.key === "i") { e.preventDefault(); handleItalic(); }
    if (e.ctrlKey && e.key === "l") { e.preventDefault(); handleBullet(); }
  };

  const handleScanInsert = (latexText) => {
    const el = textareaRef.current;
    const ss = el?.selectionStart ?? textValue.length;
    const se = el?.selectionEnd ?? textValue.length;
    const wrapped = `$$\n${latexText}\n$$`;
    const newVal = textValue.slice(0, ss) + wrapped + textValue.slice(se);
    commitChange(newVal);
    setShowScanModal(false);
    requestAnimationFrame(() => el?.focus());
  };

  const toggleImage = () => {
    if (showImage) { onImageChange(null); setShowImage(false); } else setShowImage(true);
  };
  const toggleTable = () => {
    if (showTable) { onTableChange(null); setShowTable(false); }
    else { onTableChange([["Header 1", "Header 2"], ["", ""]]); setShowTable(true); }
  };

  const toolbarBtn = (active) => ({
    display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6,
    fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    background: active ? "rgba(99,102,241,0.15)" : t.bg3,
    border: `1px solid ${active ? "#6366F1" : t.border}`,
    color: active ? "#818CF8" : t.text3,
  });

  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: t.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Space Mono', monospace" }}>{label}</label>
      <textarea ref={setTextareaRef} style={{ width: "100%", background: t.inputBg2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px", color: t.text, fontSize: 16, fontFamily: "'DM Sans', sans-serif", resize: "none", minHeight: 60, overflow: "hidden" }}
        value={textValue} onChange={e => commitChange(e.target.value)} onPaste={handlePaste} onKeyDown={handleKeyDown}
        placeholder={`Enter ${label.toLowerCase()} — or paste an image with Ctrl+V`} rows={2} />
      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
        <button style={toolbarBtn(false)} onClick={handleBullet}   type="button">• List</button>
        <button style={toolbarBtn(false)} onClick={() => setShowScanModal(true)} type="button">📷 Scan</button>
        <button style={toolbarBtn(showImage)} onClick={toggleImage} type="button"><Icons.Image /> Image</button>
        <button style={toolbarBtn(showTable)} onClick={toggleTable} type="button"><Icons.Table /> Table</button>
      </div>
      {showImage && (
        <div style={{ marginTop: 8, padding: 10, background: t.bg3, borderRadius: 8, border: `1px solid ${t.border}` }}>
          {image ? (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img src={image} alt="" style={{ maxHeight: 100, maxWidth: "100%", borderRadius: 6, objectFit: "contain" }} />
              <button type="button" onClick={() => onImageChange(null)}
                style={{ position: "absolute", top: -6, right: -6, background: "#EF4444", border: "none", borderRadius: "50%", width: 20, height: 20, color: "#fff", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{ border: `2px dashed ${dragOver ? "#6366F1" : t.border}`, borderRadius: 8, padding: "12px 10px", background: dragOver ? "rgba(99,102,241,0.08)" : "transparent", transition: "all 0.15s" }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                <button type="button" style={toolbarBtn(false)} onClick={() => fileRef.current?.click()}>Upload file</button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
                <input style={{ flex: 1, minWidth: 100, background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 6, padding: "5px 10px", color: t.text, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}
                  placeholder="or paste image URL" value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleUrlAdd()} />
                <button type="button" style={toolbarBtn(false)} onClick={handleUrlAdd}>Add</button>
              </div>
              <p style={{ color: t.text4, fontSize: 11, textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
                drag & drop an image here · or paste with Ctrl+V in the text field above
              </p>
            </div>
          )}
        </div>
      )}
      {showTable && table && <div style={{ marginTop: 8 }}><TableEditor rows={table} onChange={onTableChange} /></div>}
      {showScanModal && <LatexScanModal onClose={() => setShowScanModal(false)} onInsert={handleScanInsert} />}
    </div>
  );
}

// ─── Styles ───
function makeStyles(t) {
  return {
    app: { minHeight: "100vh", background: t.appBg, color: t.text, fontFamily: "'DM Sans', sans-serif" },
    page: { minHeight: "100vh", animation: "fadeIn 0.3s ease" },
    loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: t.bg },
    spinner: { width: 32, height: 32, border: `3px solid ${t.border}`, borderTop: "3px solid #6366F1", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

    header: { padding: "40px 24px 12px", maxWidth: 1200, margin: "0 auto" },
    headerInner: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
    logo: { fontSize: 26, fontWeight: 700, fontFamily: "'Space Mono', monospace", background: "linear-gradient(135deg, #818CF8, #6366F1, #A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 },
    subtitle: { color: t.text3, fontSize: 14 },
    actionBar: { display: "flex", gap: 10, padding: "16px 24px", maxWidth: 1200, margin: "0 auto", flexWrap: "wrap" },

    primaryBtn: { display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #6366F1, #4F46E5)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", justifyContent: "center" },
    secondaryBtn: { display: "flex", alignItems: "center", gap: 8, background: t.bg2, color: t.text2, border: `1px solid ${t.border2}`, borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
    dangerBtn: { display: "flex", alignItems: "center", gap: 8, background: "transparent", color: "#EF4444", border: "1px solid #7F1D1D", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", width: "100%", justifyContent: "center" },
    iconBtn: { background: "none", border: "none", color: t.text3, cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" },
    themeBtn: { background: "none", border: `1px solid ${t.border}`, color: t.text2, cursor: "pointer", padding: 8, borderRadius: 8, display: "flex", alignItems: "center" },
    studyAllBtn: { display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #6366F1, #4F46E5)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },

    // Grids
    setGrid: { display: "grid", gap: 14, padding: "8px 24px 32px", maxWidth: 1200, margin: "0 auto", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" },
    sectionLabel: { color: t.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "'Space Mono', monospace", padding: "8px 24px 4px", maxWidth: 1200, margin: "0 auto" },

    // Set cards
    setCard: { background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", minHeight: 130, width: "100%", fontFamily: "'DM Sans', sans-serif" },
    setCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 6 },
    cardCount: { fontSize: 11, fontWeight: 600, color: "#818CF8", background: "rgba(99,102,241,0.12)", padding: "2px 8px", borderRadius: 6, fontFamily: "'Space Mono', monospace" },
    setTitle: { color: t.text, fontSize: 15, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 },
    setDesc: { color: t.text3, fontSize: 12, flex: 1, lineHeight: 1.4 },
    setCardBottom: { marginTop: "auto", paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 },
    dateLabel: { color: t.text4, fontSize: 11, fontFamily: "'Space Mono', monospace" },
    emptyState: { textAlign: "center", padding: "60px 20px" },

    // Folder cards
    folderCard: { background: `linear-gradient(145deg, ${t.bg2}, ${t.bg3})`, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", minHeight: 110, width: "100%", fontFamily: "'DM Sans', sans-serif" },
    folderIconWrap: { color: "#FBBF24", marginBottom: 10, display: "flex" },
    folderName: { color: t.text, fontSize: 15, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 },
    folderMeta: { color: t.text3, fontSize: 12, marginTop: "auto", paddingTop: 8, display: "flex", alignItems: "center", gap: 8 },

    // NavBar
    navBar: { display: "flex", alignItems: "center", padding: "16px 12px", gap: 8, borderBottom: `1px solid ${t.border}`, background: t.navBg, backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 10 },
    backBtn: { background: "none", border: "none", color: t.text2, cursor: "pointer", padding: 8, borderRadius: 8, display: "flex" },
    navTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: 600, color: t.text, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

    // Forms
    formSection: { padding: "20px 24px 0", maxWidth: 900, margin: "0 auto" },
    input: { width: "100%", background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px", color: t.text, fontSize: 16, marginBottom: 12, fontFamily: "'DM Sans', sans-serif" },
    textarea: { width: "100%", background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px", color: t.text, fontSize: 14, fontFamily: "'Space Mono', monospace", resize: "vertical", lineHeight: 1.6 },
    cardList: { padding: "12px 24px", maxWidth: 900, margin: "0 auto" },
    cardEditor: { background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: 14, marginBottom: 10 },
    cardEditorHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    cardNum: { fontSize: 12, fontWeight: 700, color: "#6366F1", fontFamily: "'Space Mono', monospace" },
    cardEditorFields: { display: "flex", gap: 10, flexWrap: "wrap" },
    addCardBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "calc(100% - 48px)", margin: "0 24px", maxWidth: "calc(900px - 48px)", padding: "12px", background: "transparent", border: `2px dashed ${t.border}`, borderRadius: 12, color: t.text3, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
    folderBreadcrumb: { display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, marginBottom: 12, color: "#818CF8", fontSize: 13, fontFamily: "'DM Sans', sans-serif" },

    // Import
    chipBtn: { padding: "6px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bg2, color: t.text2, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
    chipActive: { background: "#6366F1", borderColor: "#6366F1", color: "#fff" },
    previewBox: { background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 10, padding: 14, marginTop: 12 },
    previewRow: { display: "flex", gap: 8, alignItems: "center", fontSize: 13, padding: "4px 0" },

    // Detail
    detailHeader: { padding: "16px 24px", maxWidth: 900, margin: "0 auto" },
    modeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
    modeBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "18px 12px", background: "linear-gradient(135deg, #312E81, #4338CA)", border: "none", borderRadius: 12, color: "#E2E8F0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", position: "relative" },
    dueBadge: { position: "absolute", top: -6, right: -6, background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "2px 6px", fontFamily: "'Space Mono', monospace" },
    statPill: { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: "'Space Mono', monospace" },
    cardListPreview: { padding: "0 24px 20px", maxWidth: 900, margin: "0 auto" },
    cardPreviewRow: { display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 10, marginBottom: 6 },
    folderSelect: { background: t.selectBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px", color: t.text, fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", flex: 1 },

    // Study
    studyContainer: { padding: "16px 24px", maxWidth: 800, margin: "0 auto" },
    progressWrap: { height: 4, background: t.bg3, borderRadius: 2, overflow: "hidden", marginBottom: 12 },
    progressBar: { height: "100%", background: "linear-gradient(90deg, #6366F1, #818CF8)", borderRadius: 2, transition: "width 0.4s ease" },
    studyMeta: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    flashcardOuter: { width: "100%", aspectRatio: "16/9", maxHeight: 420, minHeight: 200, marginBottom: 20 },
    flashcardInner: { position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d" },
    flashcardFace: { position: "absolute", width: "100%", height: "100%", backfaceVisibility: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: 28, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border2}`, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", overflow: "auto" },
    flashcardBack: { transform: "rotateY(180deg)", background: t.cardBack, borderColor: t.cardBackBorder },
    faceLabel: { fontSize: 11, fontWeight: 700, color: "#6366F1", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, fontFamily: "'Space Mono', monospace", flexShrink: 0 },
    faceText: { fontSize: 22, fontWeight: 600, color: t.text, textAlign: "center", lineHeight: 1.4 },
    tapHint: { position: "absolute", bottom: 16, fontSize: 11, color: t.text4, fontFamily: "'Space Mono', monospace" },
    studyControls: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" },
    navArrow: { background: "none", border: `1px solid ${t.border}`, borderRadius: 10, padding: 10, color: t.text2, cursor: "pointer", display: "flex" },
    againBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, color: "#F87171", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
    hardBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 14px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 10, color: "#FCD34D", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
    goodBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 14px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, color: "#34D399", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
    easyBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 14px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 10, color: "#818CF8", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
    ratingHint: { fontSize: 10, opacity: 0.7, fontFamily: "'Space Mono', monospace" },
    keyHint: { fontSize: 10, opacity: 0.5, fontFamily: "'Space Mono', monospace", background: "rgba(255,255,255,0.1)", borderRadius: 3, padding: "0 3px", marginLeft: 2 },

    // Test
    testContainer: { padding: "20px 24px 32px", maxWidth: 900, margin: "0 auto" },
    questionBlock: { background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 14, padding: 18, marginBottom: 14 },
    questionLabel: { fontSize: 11, fontWeight: 700, color: "#6366F1", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, fontFamily: "'Space Mono', monospace" },
    questionTerm: { fontSize: 18, fontWeight: 600, color: t.text, marginBottom: 14 },
    optionsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
    optionBtn: { padding: "12px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 10, color: t.text2, fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
    optionSelected: { borderColor: "#6366F1", background: "rgba(99,102,241,0.12)", color: "#A5B4FC" },
    testResults: { padding: "20px 24px 32px", maxWidth: 900, margin: "0 auto" },
    scoreCircle: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 140, height: 140, borderRadius: "50%", background: t.cardBg, border: "3px solid #6366F1", margin: "20px auto 28px" },
    scoreNum: { fontSize: 36, fontWeight: 700, color: t.text, fontFamily: "'Space Mono', monospace" },
    scoreLabel: { fontSize: 12, color: t.text2, fontFamily: "'Space Mono', monospace" },
    resultRow: { background: t.bg2, borderRadius: 10, padding: 14, marginBottom: 8 },

    // Mode cards (detail page hub)
    modeCard: { display: "flex", flexDirection: "column", gap: 6, padding: "20px 16px", borderRadius: 14, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left", position: "relative", transition: "all 0.2s" },
    modeCardTitle: { fontSize: 15, fontWeight: 700, color: "#fff" },
    modeCardDesc: { fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.4 },

    // Breadcrumbs
    breadcrumbs: { display: "flex", alignItems: "center", gap: 6, padding: "8px 0", marginBottom: 8, fontSize: 12, fontFamily: "'DM Sans', sans-serif", flexWrap: "wrap" },
    breadcrumbLink: { color: t.text3, cursor: "pointer", textDecoration: "none", background: "none", border: "none", padding: 0, fontFamily: "'DM Sans', sans-serif", fontSize: 12 },
    breadcrumbSep: { color: t.text4, fontSize: 11 },
    breadcrumbCurrent: { color: t.text2, fontWeight: 500, fontSize: 12 },

    // Recently studied
    recentRow: { display: "flex", gap: 12, overflowX: "auto", padding: "4px 24px 12px", maxWidth: 1200, margin: "0 auto", scrollSnapType: "x mandatory" },
    recentCard: { flex: "0 0 170px", background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 14px", scrollSnapAlign: "start", cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans', sans-serif" },

    // Session Summary
    sessionSummary: { animation: "fadeIn 0.4s ease", textAlign: "center" },
    summaryStats: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 },
    summaryStatItem: { background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
    summaryStatNum: { fontSize: 22, fontWeight: 700, color: t.text, fontFamily: "'Space Mono', monospace" },
    summaryStatLabel: { fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1 },
    missedCard: { background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 6, textAlign: "left" },

    // Mastery
    masteryBar: { display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 16, background: t.bg3 },
    masterySegment: { height: "100%", transition: "width 0.4s ease" },
    masteryBadge: { display: "inline-flex", alignItems: "center", padding: "1px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, fontFamily: "'Space Mono', monospace", whiteSpace: "nowrap" },
  };
}

// ─── Global CSS ───
const globalCSS = (t) => `
  .set-card { transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; }
  .set-card:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.2); border-color: ${t.border2} !important; }
  .flashcard-outer { perspective: 1200px; cursor: pointer; }
  .flashcard-inner { transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; }
  .flashcard-outer.img-hovered .flashcard-face { overflow: visible !important; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes imgExpand { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }
  @keyframes confettiFall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
  @keyframes slideOutLeft { to { transform: translateX(-30px); opacity: 0; } }
  @keyframes slideOutRight { to { transform: translateX(30px); opacity: 0; } }
  @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
  input::placeholder, textarea::placeholder { color: ${t.text4}; }
  input:focus, textarea:focus { outline: none; border-color: #6366F1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
  select:focus { outline: none; border-color: #6366F1 !important; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${t.scrollbar}; border-radius: 3px; }
  body { transition: background-color 0.25s; }
  .face-text { font-size: 22px; }
  .primary-btn:hover { filter: brightness(1.12); }
  .primary-btn:active { transform: scale(0.97); }
  .secondary-btn:hover { border-color: ${t.border2} !important; background: ${t.bg3} !important; }
  .secondary-btn:active { transform: scale(0.97); }
  .mode-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
  .mode-btn:active { transform: scale(0.95) translateY(0) !important; }
  .mode-card:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
  .mode-card:active { transform: scale(0.97) translateY(0) !important; }
  .rating-btn:active { transform: scale(0.93); }
  .set-card:active { transform: scale(0.98) translateY(0) !important; }
  @media (min-width: 768px) { .face-text { font-size: 26px; } }
  @media (max-width: 640px) {
    .flashcard-outer { min-height: 160px !important; aspect-ratio: unset !important; height: 220px; }
    .flashcard-face { padding: 16px !important; }
    .study-controls-wrap { gap: 4px !important; }
    .rating-btn { padding: 6px 8px !important; font-size: 12px !important; }
    .mode-grid { grid-template-columns: 1fr !important; }
    .card-editor-fields { flex-direction: column !important; }
    .options-grid { grid-template-columns: 1fr !important; }
    .study-container { padding: 12px 12px !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001s !important;
      transition-duration: 0.001s !important;
    }
  }
`;

// ─── Main App ───
export default function App() {
  const [sets, setSets] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState({ page: "home" });
  const [theme, setTheme] = useState(() => localStorage.getItem("flashforge-theme") || "dark");

  const t = THEMES[theme];
  const S = useMemo(() => makeStyles(t), [theme]);

  // Refs for beforeunload (avoids stale closure)
  const setsRef = useRef([]);
  const foldersRef = useRef([]);
  useEffect(() => { setsRef.current = sets; }, [sets]);
  useEffect(() => { foldersRef.current = folders; }, [folders]);

  useEffect(() => {
    const data = storage.load();
    // Only fall back to SAMPLE_SETS when there is genuinely no stored data (null),
    // not when the user has an empty set list (data === []).
    setSets(data !== null ? data : SAMPLE_SETS);
    setFolders(foldersStorage.load());
    setLoaded(true);

    // Cross-tab sync: the `storage` event fires in every tab *except* the one
    // that wrote the value, so each tab stays in sync without clobbering anything.
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setSets(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === FOLDERS_KEY && e.newValue) {
        try { setFolders(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    // Final save on close/refresh, in case a React render cycle is mid-flight.
    const handleBeforeUnload = () => {
      storage.save(setsRef.current);
      foldersStorage.save(foldersRef.current);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => { if (loaded) storage.save(sets); }, [sets, loaded]);
  useEffect(() => { if (loaded) foldersStorage.save(folders); }, [folders, loaded]);
  useEffect(() => { localStorage.setItem("flashforge-theme", theme); document.body.style.background = t.bg; }, [theme]);

  const toggleTheme = () => setTheme(th => th === "dark" ? "light" : "dark");
  const nav = (page, props = {}) => setView({ page, ...props });

  // Undo delete
  const [deletedSet, setDeletedSet] = useState(null);
  const undoTimerRef = useRef(null);

  // Search ref for global shortcuts
  const searchRef = useRef(null);

  // Set CRUD
  const updateSet = (id, updater) => setSets(prev => prev.map(x => x.id === id ? updater(x) : x));
  const deleteSet = (id) => {
    const setToDelete = sets.find(x => x.id === id);
    setSets(prev => prev.filter(x => x.id !== id));
    nav("home");
    if (setToDelete) {
      setDeletedSet(setToDelete);
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setDeletedSet(null), 5000);
    }
  };
  const undoDelete = () => {
    if (deletedSet) {
      setSets(prev => [deletedSet, ...prev]);
      setDeletedSet(null);
      clearTimeout(undoTimerRef.current);
    }
  };
  // Storage warning state
  const [storageWarning, setStorageWarning] = useState(null); // null | "full" | "near"
  const storageWarnTimerRef = useRef(null);
  const showStorageWarning = (level) => {
    setStorageWarning(level);
    clearTimeout(storageWarnTimerRef.current);
    storageWarnTimerRef.current = setTimeout(() => setStorageWarning(null), 8000);
  };

  // Check storage usage and warn if near/over limit
  const checkStorageUsage = async () => {
    const { pct } = await getStorageUsage();
    if (pct >= 0.95) showStorageWarning("full");
    else if (pct >= 0.8) showStorageWarning("near");
  };

  useEffect(() => { checkStorageUsage(); }, [loaded]);

  const addSet = (set) => {
    setSets(prev => {
      const next = [set, ...prev];
      const ok = storage.save(next);  // synchronous flush — before React paint, before draft removal
      setsRef.current = next;         // keep ref current so beforeunload never writes stale data
      if (!ok) showStorageWarning("full");
      else checkStorageUsage();
      return next;
    });
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.key === "/" || (e.ctrlKey && e.key === "k")) && view.page === "home") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "n" || e.key === "N") { e.preventDefault(); nav("create"); }
      if (e.key === "Escape" && view.page !== "home") nav("home");
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [view.page]);

  // Folder CRUD
  const addFolder = (folder) => setFolders(prev => [folder, ...prev]);
  const updateFolder = (id, updater) => setFolders(prev => prev.map(f => f.id === id ? updater(f) : f));
  const deleteFolder = (id) => {
    setSets(prev => prev.map(s => s.folderId === id ? { ...s, folderId: null } : s));
    setFolders(prev => prev.filter(f => f.id !== id));
  };
  const moveSetToFolder = (setId, folderId) => updateSet(setId, s => ({ ...s, folderId: folderId || null }));

  if (!loaded) {
    const skeletonBar = (w, h = 14) => ({ width: w, height: h, borderRadius: 6, background: t.bg3, animation: "pulse 1.5s ease infinite" });
    return (
      <div style={S.app}>
        <style>{globalCSS(t)}</style>
        <header style={S.header}>
          <div style={S.headerInner}>
            <div>
              <div style={skeletonBar("160px", 28)} />
              <div style={{ ...skeletonBar("200px", 14), marginTop: 8 }} />
            </div>
            <div style={skeletonBar("36px", 36)} />
          </div>
          <div style={{ ...skeletonBar("100%", 44), marginTop: 16 }} />
        </header>
        <div style={S.actionBar}>
          <div style={skeletonBar("100px", 40)} />
          <div style={skeletonBar("120px", 40)} />
          <div style={skeletonBar("90px", 40)} />
        </div>
        <div style={S.setGrid}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ ...S.setCard, cursor: "default" }}>
              <div style={{ ...skeletonBar("60px", 12), marginBottom: 12 }} />
              <div style={skeletonBar("80%", 16)} />
              <div style={{ ...skeletonBar("60%", 12), marginTop: 8 }} />
              <div style={{ ...skeletonBar("40%", 11), marginTop: "auto", paddingTop: 12 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sharedProps = { S, t, theme, toggleTheme, nav };
  const currentSet = sets.find(x => x.id === view.setId);
  const currentFolder = folders.find(f => f.id === view.folderId);

  return (
    <ThemeCtx.Provider value={t}>
      <div style={S.app}>
        <style>{globalCSS(t)}</style>
        {view.page === "home"        && <HomePage sets={sets} folders={folders} addFolder={addFolder} searchRef={searchRef} {...sharedProps} />}
        {view.page === "folder"      && <FolderPage folder={currentFolder} sets={sets} folders={folders} deleteFolder={deleteFolder} updateFolder={updateFolder} moveSetToFolder={moveSetToFolder} addSet={addSet} updateSet={updateSet} deleteSet={deleteSet} {...sharedProps} />}
        {view.page === "folderStudy" && <FolderStudyPage folder={currentFolder} folderSets={sets.filter(x => x.folderId === view.folderId)} updateSet={updateSet} {...sharedProps} />}
        {view.page === "create"      && <CreatePage addSet={addSet} folders={folders} folderId={view.folderId || null} {...sharedProps} />}
        {view.page === "import"      && <ImportPage addSet={addSet} {...sharedProps} />}
        {view.page === "detail"      && <DetailPage set={currentSet} folders={folders} updateSet={updateSet} deleteSet={deleteSet} moveSetToFolder={moveSetToFolder} {...sharedProps} />}
        {view.page === "study"       && <StudyPage  set={currentSet} updateSet={updateSet} starredOnly={!!view.starredOnly} {...sharedProps} />}
        {view.page === "test"        && <TestPage   set={currentSet} {...sharedProps} />}
        {view.page === "edit"        && <EditPage   set={currentSet} updateSet={updateSet} focusCardId={view.focusCardId} returnView={view.returnView} {...sharedProps} />}
        {view.page === "smartStudy"  && <SmartStudyPage sets={sets} updateSet={updateSet} {...sharedProps} />}
        {view.page === "settings"    && <SettingsPage toggleTheme={toggleTheme} theme={theme} sets={sets} setSets={setSets} setFolders={setFolders} {...sharedProps} />}

        {/* Storage warning toast */}
        {storageWarning && (
          <div role="alert" aria-live="assertive" style={{ position: "fixed", bottom: deletedSet ? 80 : 24, left: "50%", transform: "translateX(-50%)", zIndex: 101,
            background: storageWarning === "full" ? "#7F1D1D" : "#78350F", border: `1px solid ${storageWarning === "full" ? "#EF4444" : "#F59E0B"}`,
            borderRadius: 12, padding: "12px 20px", display: "flex", alignItems: "center", gap: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)", animation: "fadeIn 0.2s ease", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 16 }}>{storageWarning === "full" ? "⚠️" : "🔶"}</span>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>
              {storageWarning === "full"
                ? "Storage full — new sets may not save. Delete old sets or clear images."
                : "Storage nearly full (>80%). Consider deleting unused sets."}
            </span>
            <button onClick={() => setStorageWarning(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px" }}>×</button>
          </div>
        )}

        {/* Undo delete toast */}
        {deletedSet && (
          <div role="alert" aria-live="polite" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 100,
            background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 20px",
            display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            animation: "fadeIn 0.2s ease", fontFamily: "'DM Sans', sans-serif" }}>
            <span style={{ color: t.text, fontSize: 14 }}>Set deleted</span>
            <button onClick={undoDelete} style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Undo
            </button>
          </div>
        )}
      </div>
    </ThemeCtx.Provider>
  );
}

// ─── API Key Button ───
function ApiKeyButton() {
  const t = useContext(ThemeCtx);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(() => localStorage.getItem("flashforge-anthropic-key") || "");
  const hasKey = !!localStorage.getItem("flashforge-anthropic-key");

  const save = () => {
    if (key.trim()) localStorage.setItem("flashforge-anthropic-key", key.trim());
    else localStorage.removeItem("flashforge-anthropic-key");
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)} title={hasKey ? "API key configured" : "Set Anthropic API key"}
        style={{ display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 8, border: `1px solid ${hasKey ? "rgba(99,102,241,0.4)" : t.border}`,
          background: open ? t.bg3 : t.bg2, color: hasKey ? "#818CF8" : t.text3, cursor: "pointer", fontSize: 15 }}>
        🔑
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 200,
          width: 300, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 10,
          padding: "14px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <p style={{ color: t.text, fontSize: 13, fontWeight: 600, marginBottom: 2, fontFamily: "'DM Sans', sans-serif" }}>Anthropic API Key</p>
            <p style={{ color: t.text4, fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>Required for the 📷 Scan equation feature. Stored locally in your browser only.</p>
          </div>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="sk-ant-..."
            style={{ background: t.inputBg2, border: `1px solid ${t.border}`, borderRadius: 8,
              padding: "8px 10px", color: t.text, fontSize: 12, fontFamily: "'Space Mono', monospace", width: "100%" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={save}
              style={{ flex: 1, background: "linear-gradient(135deg, #6366F1, #4F46E5)", color: "#fff",
                border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Save
            </button>
            <button type="button" onClick={() => setOpen(false)}
              style={{ background: t.bg3, color: t.text2, border: `1px solid ${t.border}`,
                borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NavBar ───
function NavBar({ onBack, title, S, theme, toggleTheme, showShortcuts }) {
  return (
    <nav style={S.navBar} role="navigation" aria-label="Main navigation">
      <button style={S.backBtn} onClick={onBack} aria-label="Go back"><Icons.Back /></button>
      <h2 style={S.navTitle}>{title}</h2>
      {showShortcuts && <ShortcutHelper />}
      <ApiKeyButton />
      <button style={S.themeBtn} onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title="Toggle theme">
        {theme === "dark" ? <Icons.Sun /> : <Icons.Moon />}
      </button>
    </nav>
  );
}

// ─── Set Card (shared between HomePage and FolderPage) ───
function SetCard({ set, S, nav, folderName }) {
  const t = useContext(ThemeCtx);
  const dueCount = set.cards.filter(isDue).length;
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimer = useRef(null);
  const handleEnter = () => { hoverTimer.current = setTimeout(() => setShowPreview(true), 500); };
  const handleLeave = () => { clearTimeout(hoverTimer.current); setShowPreview(false); };

  return (
    <div style={{ position: "relative" }} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button style={S.setCard} onClick={() => nav("detail", { setId: set.id })} className="set-card">
        <div style={S.setCardTop}>
          <span style={S.cardCount}>{set.cards.length} cards</span>
          {dueCount > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: "#F87171", background: "rgba(239,68,68,0.12)", padding: "2px 8px", borderRadius: 6, fontFamily: "'Space Mono', monospace" }}>{dueCount} due</span>}
        </div>
        <h3 style={S.setTitle}>{set.title}</h3>
        {set.description && <p style={S.setDesc}>{set.description}</p>}
        <div style={S.setCardBottom}>
          <span style={S.dateLabel}>{new Date(set.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          {folderName && <span style={{ fontSize: 11, color: "#FBBF24", display: "flex", alignItems: "center", gap: 3 }}><Icons.Folder />{folderName}</span>}
        </div>
      </button>
      {showPreview && set.cards.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 10, padding: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", animation: "fadeIn 0.15s ease", marginTop: 4 }}>
          {set.cards.slice(0, 3).map(card => (
            <div key={card.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, padding: "3px 0", borderBottom: `1px solid ${t.border}` }}>
              <span style={{ color: t.text, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.term}</span>
              <span style={{ color: t.text4, flexShrink: 0 }}>→</span>
              <span style={{ color: t.text3, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.definition}</span>
            </div>
          ))}
          {set.cards.length > 3 && <p style={{ color: t.text4, fontSize: 11, marginTop: 4 }}>+{set.cards.length - 3} more</p>}
        </div>
      )}
    </div>
  );
}

// ─── Home Page ───
function HomePage({ sets, folders, addFolder, S, t, theme, toggleTheme, nav, searchRef }) {
  const [search, setSearch] = useState("");
  const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { numeric: true });
  const ungrouped = sets.filter(s => !s.folderId).sort(byTitle);
  const sortedFolders = [...folders].sort((a, b) => a.name.localeCompare(b.name));
  const hasContent = folders.length > 0 || ungrouped.length > 0;
  const query = search.trim().toLowerCase();
  const searchResults = query
    ? sets.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.cards.some(c =>
          c.term.toLowerCase().includes(query) ||
          c.definition.toLowerCase().includes(query)
        )
      ).sort(byTitle)
    : [];

  const handleNewFolder = () => {
    const name = window.prompt("Folder name:");
    if (name?.trim()) addFolder({ id: uid(), name: name.trim(), createdAt: Date.now() });
  };

  const handleExportAnki = () => {
    const blob = new Blob([JSON.stringify(sets, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "flashforge-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div>
            <h1 style={S.logo}>⚡ FlashForge</h1>
            <p style={S.subtitle}>Master anything, one card at a time</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button style={S.themeBtn} onClick={() => nav("settings")} title="Settings">
              <Icons.Settings />
            </button>
            <button style={S.themeBtn} onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? <Icons.Sun /> : <Icons.Moon />}
            </button>
          </div>
        </div>
        {sets.length > 0 && (
          <div style={{ position: "relative", marginTop: 16 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.text4, pointerEvents: "none" }}><Icons.Search /></span>
            <input
              ref={searchRef}
              style={{ ...S.input, marginBottom: 0, paddingLeft: 36 }}
              placeholder="Search sets and cards… (press /)"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}
      </header>

      <div style={S.actionBar}>
        <button style={S.primaryBtn} className="primary-btn" onClick={() => nav("create")}><Icons.Plus /> New Set</button>
        <button style={S.secondaryBtn} onClick={handleNewFolder}><Icons.FolderPlus /> New Folder</button>
        <button style={S.secondaryBtn} onClick={() => nav("import")}><Icons.Import /> Import</button>
        <button style={S.secondaryBtn} onClick={handleExportAnki}><Icons.Download /> Export for Anki</button>
      </div>

      {query ? (
        searchResults.length === 0 ? (
          <div style={S.emptyState}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>🔍</p>
            <p style={{ color: t.text2, fontSize: 15 }}>No sets match "{search}"</p>
          </div>
        ) : (
          <>
            <div style={S.sectionLabel}>{searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{search}"</div>
            <div style={S.setGrid}>
              {searchResults.map(set => {
                const folder = folders.find(f => f.id === set.folderId);
                return <SetCard key={set.id} set={set} S={S} nav={nav} folderName={folder?.name} />;
              })}
            </div>
          </>
        )
      ) : (
        <>
          {/* Smart Study Recommendation */}
          {(() => {
            const allDue = sets.flatMap(s => s.cards).filter(isDue);
            const setsWithDue = sets.filter(s => s.cards.some(isDue));
            if (allDue.length === 0) return null;
            return (
              <div style={{ padding: "4px 24px 12px", maxWidth: 1200, margin: "0 auto" }}>
                <button onClick={() => nav("smartStudy")} style={{ ...S.studyAllBtn, width: "100%", justifyContent: "center", padding: "16px 24px", borderRadius: 14, gap: 12 }} className="primary-btn">
                  <Icons.Zap />
                  <span>{allDue.length} card{allDue.length !== 1 ? "s" : ""} due across {setsWithDue.length} set{setsWithDue.length !== 1 ? "s" : ""} — Study Now</span>
                </button>
              </div>
            );
          })()}

          {/* Recently Studied */}
          {(() => {
            const recent = recentStorage.load();
            const recentSets = recent.map(r => ({ ...r, set: sets.find(s => s.id === r.setId) })).filter(r => r.set);
            if (recentSets.length === 0) return null;
            const timeAgo = (ts) => {
              const mins = Math.round((Date.now() - ts) / 60000);
              if (mins < 60) return `${mins}m ago`;
              const hrs = Math.round(mins / 60);
              if (hrs < 24) return `${hrs}h ago`;
              return `${Math.round(hrs / 24)}d ago`;
            };
            return (
              <>
                <div style={S.sectionLabel}>Recently Studied</div>
                <div style={S.recentRow}>
                  {recentSets.slice(0, 5).map(({ set: s, timestamp }) => (
                    <button key={s.id} style={S.recentCard} onClick={() => nav("detail", { setId: s.id })} className="set-card">
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: t.text3 }}>
                        <Icons.Clock />
                        <span>{timeAgo(timestamp)}</span>
                        <span style={{ color: t.text4 }}>·</span>
                        <span>{s.cards.length} cards</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            );
          })()}

          {!hasContent && (
            <div style={S.emptyState}>
              <p style={{ fontSize: 48, marginBottom: 12 }}>📚</p>
              <p style={{ color: t.text2, fontSize: 15 }}>No flashcard sets yet. Create your first one!</p>
            </div>
          )}

          {folders.length > 0 && (
            <>
              <div style={S.sectionLabel}>Folders</div>
              <div style={S.setGrid}>
                {sortedFolders.map(folder => {
                  const folderSets = sets.filter(s => s.folderId === folder.id);
                  const totalCards = folderSets.reduce((a, s) => a + s.cards.length, 0);
                  const dueCount = folderSets.flatMap(s => s.cards).filter(isDue).length;
                  return (
                    <button key={folder.id} style={S.folderCard} onClick={() => nav("folder", { folderId: folder.id })} className="set-card">
                      <div style={S.folderIconWrap}><Icons.Folder /></div>
                      <h3 style={S.folderName}>{folder.name}</h3>
                      <div style={S.folderMeta}>
                        <span>{folderSets.length} sets · {totalCards} cards</span>
                        {dueCount > 0 && <span style={{ color: "#F87171", fontWeight: 600 }}>{dueCount} due</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {ungrouped.length > 0 && (
            <>
              {folders.length > 0 && <div style={S.sectionLabel}>Sets</div>}
              <div style={S.setGrid}>
                {ungrouped.map(set => <SetCard key={set.id} set={set} S={S} nav={nav} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Folder Page ───
function FolderPage({ folder, sets, nav, S, t, theme, toggleTheme, deleteFolder, updateFolder }) {
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(folder?.name || "");

  if (!folder) return <div style={S.page}><NavBar onBack={() => nav("home")} title="Not Found" S={S} theme={theme} toggleTheme={toggleTheme} /></div>;

  const folderSets = sets.filter(s => s.folderId === folder.id).sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
  const totalCards = folderSets.reduce((a, s) => a + s.cards.length, 0);
  const dueCount = folderSets.flatMap(s => s.cards).filter(isDue).length;

  const handleRename = () => {
    if (nameInput.trim()) updateFolder(folder.id, f => ({ ...f, name: nameInput.trim() }));
    setRenaming(false);
  };

  const handleDelete = () => {
    if (confirm(`Delete "${folder.name}"? All sets will be moved to root.`)) {
      deleteFolder(folder.id);
      nav("home");
    }
  };

  return (
    <div style={S.page}>
      <NavBar onBack={() => nav("home")} title={folder.name} S={S} theme={theme} toggleTheme={toggleTheme} />

      <div style={S.detailHeader}>
        {renaming ? (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input style={{ ...S.input, marginBottom: 0, flex: 1 }} value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }}
              autoFocus />
            <button style={S.primaryBtn} onClick={handleRename}>Save</button>
            <button style={S.secondaryBtn} onClick={() => setRenaming(false)}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <p style={{ color: t.text2, fontSize: 14 }}>
              {folderSets.length} sets · {totalCards} cards{dueCount > 0 ? ` · ` : ""}
              {dueCount > 0 && <span style={{ color: "#F87171" }}>{dueCount} due</span>}
            </p>
            <button style={S.iconBtn} onClick={() => { setNameInput(folder.name); setRenaming(true); }} title="Rename folder">
              <Icons.Edit />
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={S.studyAllBtn} onClick={() => nav("folderStudy", { folderId: folder.id })} disabled={totalCards === 0}>
            <Icons.Cards /> Study All Cards
          </button>
          <button style={S.secondaryBtn} onClick={() => nav("create", { folderId: folder.id })}>
            <Icons.Plus /> New Set
          </button>
        </div>
      </div>

      {folderSets.length === 0 ? (
        <div style={S.emptyState}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>📂</p>
          <p style={{ color: t.text2, fontSize: 15 }}>No sets in this folder yet.</p>
        </div>
      ) : (
        <div style={S.setGrid}>
          {folderSets.map(set => <SetCard key={set.id} set={set} S={S} nav={nav} />)}
        </div>
      )}

      <div style={{ padding: "0 24px 32px", maxWidth: 900, margin: "0 auto" }}>
        <button style={S.dangerBtn} onClick={handleDelete}>
          <Icons.Trash /> Delete Folder
        </button>
      </div>
    </div>
  );
}

// ─── Breadcrumbs ───
function Breadcrumbs({ crumbs, S, t }) {
  return (
    <div style={S.breadcrumbs}>
      {crumbs.map((crumb, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span style={S.breadcrumbSep}>/</span>}
          {crumb.action ? (
            <button style={S.breadcrumbLink} onClick={crumb.action} className="secondary-btn">{crumb.label}</button>
          ) : (
            <span style={S.breadcrumbCurrent}>{crumb.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── Confetti ───
const CONFETTI_COLORS = ["#6366F1", "#818CF8", "#A78BFA", "#34D399", "#FBBF24", "#F87171"];
function Confetti() {
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), 4000); return () => clearTimeout(t); }, []);
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50, overflow: "hidden" }}>
      {Array.from({ length: 50 }, (_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${Math.random() * 100}%`,
          top: -10,
          width: Math.random() * 8 + 4,
          height: Math.random() * 8 + 4,
          borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 1}s forwards`,
        }} />
      ))}
    </div>
  );
}

// ─── Recent Study Storage ───
const RECENT_KEY = "flashforge-recent";
const recentStorage = {
  load() { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; } },
  save(data) { try { localStorage.setItem(RECENT_KEY, JSON.stringify(data)); } catch {} },
  add(setId) {
    const recent = this.load().filter(r => r.setId !== setId);
    recent.unshift({ setId, timestamp: Date.now() });
    this.save(recent.slice(0, 10));
  },
};

// ─── Study Core (shared between StudyPage and FolderStudyPage) ───
function StudyCore({ studyCards, title, dueCount, onBack, onRate, onEdit, S, t, theme, toggleTheme, setId }) {
  const [cardOrder, setCardOrder] = useState(() => studyCards.map((_, i) => i));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [showInterval, setShowInterval] = useState(null);

  // Session tracking
  const [sessionStartTime] = useState(() => Date.now());
  const [sessionRatings, setSessionRatings] = useState([]);
  const [sessionComplete, setSessionComplete] = useState(false);

  // Card slide animation
  const [slideAnim, setSlideAnim] = useState(null);

  // Auto-play
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(3000);
  const autoPlayTimer = useRef(null);

  // Round-based study — declared before the autoplay effect so they're not in TDZ
  const ROUND_SIZE = 7;
  const [currentRound, setCurrentRound] = useState(0);
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const [roundRatings, setRoundRatings] = useState([]);

  useEffect(() => {
    if (!autoPlay || sessionComplete || showRoundSummary) return;
    autoPlayTimer.current = setTimeout(() => {
      if (!flipped) {
        setFlipped(true);
      } else {
        go(1);
      }
    }, autoPlaySpeed);
    return () => clearTimeout(autoPlayTimer.current);
  }, [autoPlay, flipped, index, autoPlaySpeed, sessionComplete, showRoundSummary]);

  const toggleAutoPlay = () => setAutoPlay(a => !a);
  const pauseAutoPlay = () => { if (autoPlay) { setAutoPlay(false); clearTimeout(autoPlayTimer.current); } };

  useEffect(() => { if (setId) recentStorage.add(setId); }, [setId]);

  const total = cardOrder.length;
  const totalRounds = total > ROUND_SIZE ? Math.ceil(total / ROUND_SIZE) : 1;
  const useRounds = total > ROUND_SIZE;
  const roundStart = currentRound * ROUND_SIZE;
  const roundEnd = Math.min(roundStart + ROUND_SIZE, total);
  const roundTotal = roundEnd - roundStart;
  const effectiveIndex = index - roundStart;
  const currentCard = studyCards[cardOrder[index]];
  const progress = total > 0 ? ((sessionComplete ? total : index) / total) * 100 : 0;

  const handleShuffle = () => {
    const newOrder = shuffled ? studyCards.map((_, i) => i) : shuffle(studyCards.map((_, i) => i));
    setCardOrder(newOrder);
    setShuffled(!shuffled);
    setIndex(0);
    setFlipped(false);
    setShowInterval(null);
  };

  const go = useCallback((dir) => {
    setFlipped(false);
    setShowInterval(null);
    setSlideAnim(null);
    setTimeout(() => {
      setIndex(i => {
        if (dir === 1) return i < roundEnd - 1 ? i + 1 : roundStart;
        return i > roundStart ? i - 1 : roundEnd - 1;
      });
      setSlideAnim("slideIn");
      setTimeout(() => setSlideAnim(null), 250);
    }, 100);
  }, [roundStart, roundEnd]);

  const handleRate = (rating) => {
    pauseAutoPlay();
    const sm2 = computeSM2(currentCard, rating);
    setShowInterval(sm2.interval);
    onRate(currentCard, sm2);
    setSessionRatings(prev => [...prev, { cardId: currentCard.id, rating }]);
    setRoundRatings(prev => [...prev, { cardId: currentCard.id, rating }]);
    setTimeout(() => {
      setShowInterval(null);
      if (index < roundEnd - 1) {
        setFlipped(false);
        setTimeout(() => setIndex(i => i + 1), 100);
      } else if (useRounds && currentRound < totalRounds - 1) {
        setShowRoundSummary(true);
      } else {
        setSessionComplete(true);
      }
    }, 900);
  };

  const handleKey = useCallback((e) => {
    if (sessionComplete) return;
    if (e.key === "p" || e.key === "P") { e.preventDefault(); toggleAutoPlay(); return; }
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); pauseAutoPlay(); setFlipped(f => !f); }
    if (e.key === "ArrowRight") { pauseAutoPlay(); go(1); }
    if (e.key === "ArrowLeft") { pauseAutoPlay(); go(-1); }
    if (flipped && showInterval === null) {
      const ratingKeys = { "1": 0, "2": 1, "3": 2, "4": 3 };
      if (ratingKeys[e.key] !== undefined) { e.preventDefault(); handleRate(ratingKeys[e.key]); }
    }
  }, [go, flipped, showInterval, handleRate, sessionComplete, autoPlay]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const touchStart = useRef(null);
  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(dx) < 40) return;
    e.preventDefault();
    if (dx < 0) go(1); else go(-1);
  };

  const restartSession = (filteredCards) => {
    if (filteredCards) {
      const filteredIds = new Set(filteredCards.map(c => c.id));
      setCardOrder(studyCards.map((_, i) => i).filter(i => filteredIds.has(studyCards[i].id)));
    } else {
      setCardOrder(studyCards.map((_, i) => i));
    }
    setIndex(0);
    setFlipped(false);
    setShowInterval(null);
    setSessionRatings([]);
    setSessionComplete(false);
    setShuffled(false);
    setCurrentRound(0);
    setShowRoundSummary(false);
    setRoundRatings([]);
  };

  const nextRound = () => {
    setCurrentRound(r => r + 1);
    setIndex(roundEnd);
    setFlipped(false);
    setShowInterval(null);
    setShowRoundSummary(false);
    setRoundRatings([]);
  };

  // Session summary
  if (sessionComplete && sessionRatings.length > 0) {
    const minutes = Math.max(1, Math.round((Date.now() - sessionStartTime) / 60000));
    const counts = [0, 0, 0, 0];
    sessionRatings.forEach(r => counts[r.rating]++);
    const goodPercent = sessionRatings.length > 0 ? (sessionRatings.filter(r => r.rating >= 2).length / sessionRatings.length) : 0;
    const showConfetti = goodPercent >= 0.8;
    const missedCards = sessionRatings.filter(r => r.rating === 0).map(r => studyCards.find(c => c.id === r.cardId)).filter(Boolean);
    const ratingLabels = ["Again", "Hard", "Good", "Easy"];
    const ratingColors = ["#F87171", "#FCD34D", "#34D399", "#818CF8"];

    return (
      <div style={S.page}>
        <NavBar onBack={onBack} title={title} S={S} theme={theme} toggleTheme={toggleTheme} />
        {showConfetti && <Confetti />}
        <div style={{ ...S.studyContainer, ...S.sessionSummary }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{showConfetti ? "🎉" : "📊"}</div>
          <h2 style={{ color: t.text, fontSize: 22, fontWeight: 700, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>
            {showConfetti ? "Great session!" : "Session Complete"}
          </h2>
          <p style={{ color: t.text3, fontSize: 14, marginBottom: 24 }}>
            You studied {sessionRatings.length} card{sessionRatings.length !== 1 ? "s" : ""} in {minutes} min
          </p>

          <div style={S.summaryStats}>
            {ratingLabels.map((label, i) => (
              <div key={label} style={S.summaryStatItem}>
                <span style={{ ...S.summaryStatNum, color: ratingColors[i] }}>{counts[i]}</span>
                <span style={S.summaryStatLabel}>{label}</span>
              </div>
            ))}
          </div>

          {/* Mastery breakdown bar */}
          <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 20, background: t.bg3 }}>
            {ratingLabels.map((label, i) => counts[i] > 0 ? (
              <div key={label} style={{ height: "100%", width: `${(counts[i] / sessionRatings.length) * 100}%`, background: ratingColors[i], transition: "width 0.4s ease" }} />
            ) : null)}
          </div>

          {missedCards.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ color: t.text, fontSize: 14, fontWeight: 600, marginBottom: 8, fontFamily: "'Space Mono', monospace", textAlign: "left" }}>
                Needs work ({missedCards.length})
              </h3>
              {missedCards.slice(0, 5).map(card => (
                <div key={card.id} style={S.missedCard}>
                  <span style={{ color: t.text, fontSize: 14, fontWeight: 500 }}>{card.term}</span>
                  <span style={{ color: t.text4, margin: "0 8px" }}>→</span>
                  <span style={{ color: t.text3, fontSize: 13 }}>{card.definition.length > 60 ? card.definition.slice(0, 60) + "…" : card.definition}</span>
                </div>
              ))}
              {missedCards.length > 5 && <p style={{ color: t.text4, fontSize: 12, marginTop: 4 }}>+{missedCards.length - 5} more</p>}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button style={S.primaryBtn} className="primary-btn" onClick={() => restartSession()}>Study Again</button>
            {missedCards.length > 0 && (
              <button style={{ ...S.primaryBtn, background: "linear-gradient(135deg, #EF4444, #DC2626)" }} className="primary-btn" onClick={() => restartSession(missedCards)}>
                Study Missed ({missedCards.length})
              </button>
            )}
            <button style={S.secondaryBtn} className="secondary-btn" onClick={onBack}>Back to Set</button>
          </div>
        </div>
      </div>
    );
  }

  // Round summary
  if (showRoundSummary) {
    const roundCounts = [0, 0, 0, 0];
    roundRatings.forEach(r => roundCounts[r.rating]++);
    const roundMissed = roundRatings.filter(r => r.rating === 0).map(r => studyCards.find(c => c.id === r.cardId)).filter(Boolean);
    const ratingLabels = ["Again", "Hard", "Good", "Easy"];
    const ratingColors = ["#F87171", "#FCD34D", "#34D399", "#818CF8"];

    return (
      <div style={S.page}>
        <NavBar onBack={onBack} title={title} S={S} theme={theme} toggleTheme={toggleTheme} />
        <div style={{ ...S.studyContainer, ...S.sessionSummary }}>
          <div style={S.progressWrap}><div style={{ ...S.progressBar, width: `${progress}%` }} /></div>
          <h2 style={{ color: t.text, fontSize: 20, fontWeight: 700, marginBottom: 4, marginTop: 16 }}>
            Round {currentRound + 1} of {totalRounds} complete
          </h2>
          <p style={{ color: t.text3, fontSize: 13, marginBottom: 20 }}>{roundTotal} cards reviewed</p>

          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
            {ratingLabels.map((label, i) => roundCounts[i] > 0 ? (
              <span key={label} style={{ ...S.masteryBadge, background: `${ratingColors[i]}20`, color: ratingColors[i], padding: "4px 12px", fontSize: 13 }}>
                {roundCounts[i]} {label}
              </span>
            ) : null)}
          </div>

          {roundMissed.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ color: t.text, fontSize: 13, fontWeight: 600, marginBottom: 8, textAlign: "left", fontFamily: "'Space Mono', monospace" }}>Needs work</h3>
              {roundMissed.slice(0, 4).map(card => (
                <div key={card.id} style={S.missedCard}>
                  <span style={{ color: t.text, fontSize: 13, fontWeight: 500 }}>{card.term}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={S.primaryBtn} className="primary-btn" onClick={nextRound}>
              Continue to Round {currentRound + 2}
            </button>
            <button style={S.secondaryBtn} className="secondary-btn" onClick={() => setSessionComplete(true)}>
              End Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <NavBar onBack={onBack} title={title} S={S} theme={theme} toggleTheme={toggleTheme} />
      <div style={S.studyContainer} className="study-container">
        <div style={S.progressWrap}><div style={{ ...S.progressBar, width: `${progress}%` }} /></div>
        <div style={S.studyMeta}>
          <span style={{ fontSize: 12, fontFamily: "'Space Mono', monospace", color: t.text3 }}>
            {effectiveIndex + 1} / {roundTotal}
            {useRounds && <span style={{ color: "#818CF8", marginLeft: 8 }}>Round {currentRound + 1}/{totalRounds}</span>}
            {dueCount > 0 && <span style={{ color: "#F87171", marginLeft: 8 }}>{dueCount} due</span>}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button style={{ ...S.iconBtn, ...(autoPlay ? { color: "#34D399" } : {}) }} onClick={toggleAutoPlay} title={autoPlay ? "Pause auto-play (P)" : "Auto-play (P)"}>
              {autoPlay ? <Icons.Pause /> : <Icons.Play />}
            </button>
            {autoPlay && (
              <div style={{ display: "flex", gap: 2 }}>
                {[{ label: "1.5s", val: 1500 }, { label: "3s", val: 3000 }, { label: "5s", val: 5000 }].map(s => (
                  <button key={s.val} onClick={() => setAutoPlaySpeed(s.val)}
                    style={{ padding: "2px 6px", fontSize: 10, borderRadius: 4, border: "none", cursor: "pointer", fontFamily: "'Space Mono', monospace",
                      background: autoPlaySpeed === s.val ? "#6366F1" : t.bg3, color: autoPlaySpeed === s.val ? "#fff" : t.text3 }}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            <button style={{ ...S.iconBtn, ...(shuffled ? { color: "#6366F1" } : {}) }} onClick={handleShuffle} title="Shuffle">
              <Icons.Shuffle />
            </button>
          </div>
        </div>

        <div role="button" tabIndex={0} aria-label={`Card ${effectiveIndex + 1} of ${roundTotal}, ${flipped ? "definition" : "term"} side: ${flipped ? (currentCard?.definition || "") : (currentCard?.term || "")}. Press space to flip.`} style={{ ...S.flashcardOuter, position: "relative", touchAction: "pan-y", ...(slideAnim ? { animation: `${slideAnim} 0.25s ease` } : {}) }} onClick={() => setFlipped(f => !f)} className="flashcard-outer" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {onEdit && (
            <button
              onClick={e => { e.stopPropagation(); onEdit(currentCard.id); }}
              style={{ position: "absolute", top: 10, right: 10, zIndex: 2, background: "rgba(0,0,0,0.35)", border: "none", borderRadius: 7, padding: "6px 8px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
              title="Edit this card"
            >
              <Icons.Edit /> Edit
            </button>
          )}
          <div style={{ ...S.flashcardInner, transform: flipped ? "rotateY(180deg)" : "rotateY(0)" }} className="flashcard-inner">
            <div style={S.flashcardFace} className="flashcard-face">
              <div style={{ margin: "auto 0", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={S.faceLabel}>TERM</span>
                {renderContent(currentCard?.term, currentCard?.termImage, currentCard?.termTable, S.faceText, "face-text")}
                <span style={S.tapHint}>tap to flip</span>
              </div>
            </div>
            <div style={{ ...S.flashcardFace, ...S.flashcardBack }} className="flashcard-face">
              <div style={{ margin: "auto 0", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ ...S.faceLabel, color: "#818CF8" }}>DEFINITION</span>
                {renderContent(currentCard?.definition, currentCard?.defImage, currentCard?.defTable, S.faceText, "face-text")}
              </div>
            </div>
          </div>
        </div>

        {showInterval !== null ? (
          <div style={{ textAlign: "center", padding: "14px 0", color: "#818CF8", fontSize: 14, fontFamily: "'Space Mono', monospace", animation: "fadeIn 0.2s ease" }}>
            Next review: {showInterval <= 1 ? "tomorrow" : `in ${showInterval} days`}
          </div>
        ) : (
          <>
            <div style={S.studyControls} className="study-controls-wrap">
              <button style={S.navArrow} onClick={() => go(-1)}><Icons.ChevLeft /></button>
              {flipped ? (
                <>
                  <button style={S.againBtn} className="rating-btn" onClick={() => handleRate(0)}>Again <span style={S.keyHint}>1</span><span style={S.ratingHint}>{intervalLabel(currentCard, 0)}</span></button>
                  <button style={S.hardBtn}  className="rating-btn" onClick={() => handleRate(1)}>Hard <span style={S.keyHint}>2</span><span style={S.ratingHint}>{intervalLabel(currentCard, 1)}</span></button>
                  <button style={S.goodBtn}  className="rating-btn" onClick={() => handleRate(2)}>Good <span style={S.keyHint}>3</span><span style={S.ratingHint}>{intervalLabel(currentCard, 2)}</span></button>
                  <button style={S.easyBtn}  className="rating-btn" onClick={() => handleRate(3)}>Easy <span style={S.keyHint}>4</span><span style={S.ratingHint}>{intervalLabel(currentCard, 3)}</span></button>
                </>
              ) : (
                <span style={{ color: t.text3, fontSize: 13, padding: "10px 20px" }}>Flip to rate</span>
              )}
              <button style={S.navArrow} onClick={() => go(1)}><Icons.ChevRight /></button>
            </div>
            <p style={{ color: t.text4, fontSize: 12, textAlign: "center", marginTop: 12, fontFamily: "'Space Mono', monospace" }}>
              ← → navigate · space to flip · 1–4 to rate
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Study Page (single set) ───
function StudyPage({ set, nav, updateSet, starredOnly, S, t, theme, toggleTheme }) {
  const [studyCards] = useState(() => {
    if (!set) return [];
    const source = starredOnly ? set.cards.filter(c => c.starred) : set.cards;
    return [...source].sort((a, b) => {
      const aDue = isDue(a), bDue = isDue(b);
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;
      return (a.nextReview || 0) - (b.nextReview || 0);
    });
  });

  if (!set) return null;

  const onRate = (card, sm2) => {
    updateSet(set.id, st => ({ ...st, cards: st.cards.map(c => c.id === card.id ? { ...c, ...sm2 } : c) }));
  };

  return (
    <StudyCore
      studyCards={studyCards}
      title={starredOnly ? `${set.title} — Starred` : set.title}
      dueCount={studyCards.filter(isDue).length}
      onBack={() => nav("detail", { setId: set.id })}
      onRate={onRate}
      onEdit={cardId => nav("edit", { setId: set.id, focusCardId: cardId, returnView: { page: "study", setId: set.id, starredOnly: starredOnly || false } })}
      setId={set.id}
      S={S} t={t} theme={theme} toggleTheme={toggleTheme}
    />
  );
}

// ─── Folder Study Page (all sets in folder) ───
function FolderStudyPage({ folder, folderSets, nav, updateSet, S, t, theme, toggleTheme }) {
  const [studyCards] = useState(() => {
    const allCards = folderSets.flatMap(s => s.cards);
    return allCards.sort((a, b) => {
      const aDue = isDue(a), bDue = isDue(b);
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;
      return (a.nextReview || 0) - (b.nextReview || 0);
    });
  });

  const [cardSetMap] = useState(() => {
    const map = {};
    folderSets.forEach(s => s.cards.forEach(c => { map[c.id] = s.id; }));
    return map;
  });

  if (!folder) return null;

  const allCards = folderSets.flatMap(s => s.cards);
  const dueCount = allCards.filter(isDue).length;

  const onRate = (card, sm2) => {
    const ownerSetId = cardSetMap[card.id];
    if (ownerSetId) {
      updateSet(ownerSetId, st => ({ ...st, cards: st.cards.map(c => c.id === card.id ? { ...c, ...sm2 } : c) }));
    }
  };

  return (
    <StudyCore
      studyCards={studyCards}
      title={`${folder.name} — All Cards`}
      dueCount={dueCount}
      onBack={() => nav("folder", { folderId: folder.id })}
      onRate={onRate}
      onEdit={cardId => { const sid = cardSetMap[cardId]; if (sid) nav("edit", { setId: sid, focusCardId: cardId, returnView: { page: "folderStudy", folderId: folder.id } }); }}
      S={S} t={t} theme={theme} toggleTheme={toggleTheme}
    />
  );
}

// ─── Shortcut Helper ───
function ShortcutHelper() {
  const t = useContext(ThemeCtx);
  const [open, setOpen] = useState(false);
  const shortcuts = [
    { keys: ["Ctrl", "Z"],          desc: "Undo last change" },
    { keys: ["Ctrl", "Enter"],      desc: "Save set" },
    { keys: ["Ctrl", "⇧", "Enter"], desc: "Add new card" },
    { keys: ["Ctrl", "Delete"],     desc: "Delete focused card" },
    { keys: ["Ctrl", "B"],          desc: "Bold selected text" },
    { keys: ["Ctrl", "I"],          desc: "Italic selected text" },
    { keys: ["Ctrl", "L"],          desc: "Toggle bullet list" },
    { keys: ["Tab"],                desc: "Move to next field" },
    { keys: ["⇧", "Tab"],          desc: "Move to previous field" },
    { keys: ["Ctrl", "M"],          desc: "Indent line" },
    { keys: ["Ctrl", "N"],          desc: "Dedent line" },
    { keys: ["Enter"],              desc: "Continue bullet on next line" },
    { keys: ["Ctrl", "V"],          desc: "Paste image from clipboard" },
  ];
  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)} title="Keyboard shortcuts"
        style={{ display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 8, border: `1px solid ${t.border}`,
          background: open ? t.bg3 : t.bg2, color: t.text2, cursor: "pointer", fontSize: 16 }}>
        ⌨
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 200,
          width: "min(480px, calc(100vw - 24px))", background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 10,
          padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: "6px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
          {shortcuts.map(({ keys, desc }) => (
            <div key={desc} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                {keys.map(k => (
                  <kbd key={k} style={{ background: t.bg3, border: `1px solid ${t.border2}`, borderRadius: 4,
                    padding: "1px 6px", fontSize: 11, fontFamily: "'Space Mono', monospace", color: t.text2, whiteSpace: "nowrap" }}>
                    {k}
                  </kbd>
                ))}
              </div>
              <span style={{ color: t.text2, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create Page ───
function CreatePage({ addSet, folders, folderId, S, theme, toggleTheme, nav }) {
  const DRAFT_KEY = "flashforge-draft-create";
  const draft = useMemo(() => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || null; } catch { return null; } }, []);
  const hasDraft = !!(draft && (draft.title || draft.cards?.some(c => c.term || c.definition)));

  const [title, setTitle] = useState(draft?.title || "");
  const [desc, setDesc] = useState(draft?.desc || "");
  const [cards, setCards] = useState(draft?.cards?.length ? draft.cards.map(c => ({ ...newCard(), ...c })) : [newCard(), newCard(), newCard()]);
  const [draftRestored, setDraftRestored] = useState(hasDraft);
  const cardRefs = useRef({});
  const prevCardCount = useRef(cards.length);
  const getRef = (cardId, field) => {
    if (!cardRefs.current[cardId]) cardRefs.current[cardId] = { term: { current: null }, def: { current: null } };
    return cardRefs.current[cardId][field];
  };

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, desc, cards })); }
    catch { /* quota exceeded — draft not saved, but app stays alive */ }
  }, [title, desc, cards]);

  useEffect(() => {
    if (cards.length > prevCardCount.current) {
      const lastCard = cards[cards.length - 1];
      getRef(lastCard.id, "term").current?.focus();
    }
    prevCardCount.current = cards.length;
  }, [cards.length]);

  const folder = folders.find(f => f.id === folderId);
  const updateField = (id, field, val) => setCards(c => c.map(x => x.id === id ? { ...x, [field]: val } : x));
  const removeCard = (id) => cards.length > 1 && setCards(c => c.filter(x => x.id !== id));
  const addCardRow = () => setCards(c => [...c, newCard()]);
  const validCards = cards.filter(c => c.term.trim() || c.termImage || c.termTable);

  const handleSave = () => {
    if (!title.trim() || validCards.length === 0) return;
    const id = uid();
    addSet({ id, title: title.trim(), description: desc.trim(), createdAt: Date.now(), cards: validCards, folderId: folderId || null });
    localStorage.removeItem(DRAFT_KEY);
    if (folderId) nav("folder", { folderId });
    else nav("detail", { setId: id });
  };

  const backTarget = folderId ? () => nav("folder", { folderId }) : () => nav("home");

  const handlePageKey = (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "Enter") { e.preventDefault(); addCardRow(); }
    else if (e.ctrlKey && (e.key === "Enter" || e.key === "s")) { e.preventDefault(); handleSave(); }
  };

  return (
    <div style={S.page} onKeyDown={handlePageKey}>
      <NavBar onBack={backTarget} title="Create New Set" S={S} theme={theme} toggleTheme={toggleTheme} showShortcuts />
      {draftRestored && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "8px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "#818CF8" }}>
            <span>Draft restored — your unsaved progress was recovered.</span>
            <button onClick={() => setDraftRestored(false)} style={{ background: "none", border: "none", color: "#818CF8", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px" }}>×</button>
          </div>
        </div>
      )}
      <div style={S.formSection}>
        {folder && (
          <div style={S.folderBreadcrumb}>
            <Icons.Folder /><span>Adding to: <strong>{folder.name}</strong></span>
          </div>
        )}
        <input style={S.input} placeholder="Set title (e.g. Biology Chapter 5)" value={title} onChange={e => setTitle(e.target.value)} />
        <input style={S.input} placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
      </div>
      <div style={S.cardList}>
        {cards.map((card, i) => (
          <div key={card.id} style={S.cardEditor} onKeyDown={e => { if (e.ctrlKey && e.key === "Delete") removeCard(card.id); }}>
            <div style={S.cardEditorHeader}>
              <span style={S.cardNum}>{i + 1}</span>
              {cards.length > 1 && <button style={S.iconBtn} onClick={() => removeCard(card.id)}><Icons.Trash /></button>}
            </div>
            <div style={S.cardEditorFields} className="card-editor-fields">
              <RichFieldEditor label="Term" textValue={card.term} onTextChange={v => updateField(card.id, "term", v)} image={card.termImage} onImageChange={v => updateField(card.id, "termImage", v)} table={card.termTable} onTableChange={v => updateField(card.id, "termTable", v)} inputRef={getRef(card.id, "term")} onFocusNext={() => getRef(card.id, "def").current?.focus()} onFocusPrev={() => cards[i - 1] && getRef(cards[i - 1].id, "def").current?.focus()} />
              <RichFieldEditor label="Definition" textValue={card.definition} onTextChange={v => updateField(card.id, "definition", v)} image={card.defImage} onImageChange={v => updateField(card.id, "defImage", v)} table={card.defTable} onTableChange={v => updateField(card.id, "defTable", v)} inputRef={getRef(card.id, "def")} onFocusNext={() => cards[i + 1] && getRef(cards[i + 1].id, "term").current?.focus()} onFocusPrev={() => getRef(card.id, "term").current?.focus()} />
            </div>
          </div>
        ))}
      </div>
      <button style={S.addCardBtn} onClick={addCardRow}><Icons.Plus /> Add Card</button>
      <div style={{ padding: "16px 24px 32px", maxWidth: 900, margin: "0 auto" }}>
        <button style={{ ...S.primaryBtn, width: "100%" }} onClick={handleSave} disabled={!title.trim() || validCards.length === 0}>
          Create Set ({validCards.length} cards)
        </button>
      </div>
    </div>
  );
}

// ─── Import Page ───
function ImportPage({ addSet, S, t, theme, toggleTheme, nav }) {
  const [title, setTitle] = useState("");
  const [raw, setRaw] = useState("");
  const [sep, setSep] = useState("tab");

  const preview = raw.split("\n").map(line => {
    const d = sep === "tab" ? "\t" : sep === "comma" ? "," : " - ";
    const parts = line.split(d);
    return parts.length >= 2 ? { term: parts[0].trim(), def: parts.slice(1).join(d).trim() } : null;
  }).filter(Boolean);

  const handleImport = () => {
    if (!title.trim() || preview.length === 0) return;
    const id = uid();
    addSet({ id, title: title.trim(), description: `Imported ${preview.length} cards`, createdAt: Date.now(), folderId: null, cards: preview.map(p => ({ ...newCard(), id: uid(), term: p.term, definition: p.def })) });
    nav("detail", { setId: id });
  };

  return (
    <div style={S.page}>
      <NavBar onBack={() => nav("home")} title="Import Cards" S={S} theme={theme} toggleTheme={toggleTheme} />
      <div style={S.formSection}>
        <input style={S.input} placeholder="Set title" value={title} onChange={e => setTitle(e.target.value)} />
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[["tab", "Tab"], ["comma", "Comma"], ["dash", "Dash"]].map(([v, l]) => (
            <button key={v} onClick={() => setSep(v)} style={{ ...S.chipBtn, ...(sep === v ? S.chipActive : {}) }}>{l}</button>
          ))}
        </div>
        <textarea style={S.textarea} rows={8}
          placeholder={`Paste your terms here...\nExample:\nHola${sep === "tab" ? "\t" : sep === "comma" ? "," : " - "}Hello`}
          value={raw} onChange={e => setRaw(e.target.value)} />
        {preview.length > 0 && (
          <div style={S.previewBox}>
            <p style={{ color: "#10B981", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>✓ {preview.length} cards detected</p>
            {preview.slice(0, 4).map((p, i) => (
              <div key={i} style={S.previewRow}>
                <span style={{ color: t.text, fontWeight: 500 }}>{p.term}</span>
                <span style={{ color: t.text3 }}>→</span>
                <span style={{ color: t.text2 }}>{p.def}</span>
              </div>
            ))}
            {preview.length > 4 && <p style={{ color: t.text3, fontSize: 12, marginTop: 4 }}>+{preview.length - 4} more...</p>}
          </div>
        )}
        <button style={{ ...S.primaryBtn, width: "100%", marginTop: 12 }} onClick={handleImport} disabled={!title.trim() || preview.length === 0}>
          Import {preview.length} Cards
        </button>
      </div>
    </div>
  );
}

// ─── Detail Page ───
function DetailPage({ set, folders, nav, updateSet, deleteSet, moveSetToFolder, S, t, theme, toggleTheme }) {
  if (!set) return <div style={S.page}><NavBar onBack={() => nav("home")} title="Not Found" S={S} theme={theme} toggleTheme={toggleTheme} /></div>;

  const toggleStar = (cardId) => updateSet(set.id, st => ({ ...st, cards: st.cards.map(c => c.id === cardId ? { ...c, starred: !c.starred } : c) }));
  const dueCount = set.cards.filter(isDue).length;
  const starredCount = set.cards.filter(c => c.starred).length;

  // Card filtering & sorting
  const [cardFilter, setCardFilter] = useState("all");
  const [cardSort, setCardSort] = useState("default");

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(set, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${set.title.replace(/[^a-z0-9]/gi, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const parentFolder = folders.find(f => f.id === set.folderId);
  const backTarget = set.folderId ? () => nav("folder", { folderId: set.folderId }) : () => nav("home");

  return (
    <div style={S.page}>
      <NavBar onBack={backTarget} title={set.title} S={S} theme={theme} toggleTheme={toggleTheme} />
      <div style={S.detailHeader}>
        <Breadcrumbs crumbs={[
          { label: "Home", action: () => nav("home") },
          ...(parentFolder ? [{ label: parentFolder.name, action: () => nav("folder", { folderId: parentFolder.id }) }] : []),
          { label: set.title },
        ]} S={S} t={t} />
        {set.description && <p style={{ color: t.text2, fontSize: 14, marginBottom: 10 }}>{set.description}</p>}
        {(() => {
          const now = Date.now();
          const newC = set.cards.filter(c => c.repetitions === 0).length;
          const dueC = set.cards.filter(c => c.repetitions > 0 && c.nextReview <= now).length;
          const scheduledC = set.cards.filter(c => c.repetitions > 0 && c.nextReview > now).length;
          return (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <span style={{ ...S.statPill, background: "rgba(99,102,241,0.15)", color: "#818CF8" }}>{newC} new</span>
              {dueC > 0 && <span style={{ ...S.statPill, background: "rgba(248,113,113,0.15)", color: "#F87171" }}>{dueC} due</span>}
              {scheduledC > 0 && <span style={{ ...S.statPill, background: "rgba(52,211,153,0.15)", color: "#34D399" }}>{scheduledC} scheduled</span>}
            </div>
          );
        })()}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="mode-grid">
          <button style={{ ...S.modeCard, background: "linear-gradient(135deg, #312E81, #4338CA)" }} className="mode-card" onClick={() => nav("study", { setId: set.id })} disabled={set.cards.length === 0}>
            <Icons.Cards />
            <span style={S.modeCardTitle}>Flashcards</span>
            <span style={S.modeCardDesc}>Flip through cards with spaced repetition</span>
            {dueCount > 0 && <span style={S.dueBadge}>{dueCount}</span>}
          </button>
          {starredCount > 0 && (
            <button style={{ ...S.modeCard, background: "linear-gradient(135deg, #92400E, #B45309)" }} className="mode-card" onClick={() => nav("study", { setId: set.id, starredOnly: true })}>
              <Icons.Star filled />
              <span style={S.modeCardTitle}>Starred</span>
              <span style={S.modeCardDesc}>Focus on your {starredCount} favorite cards</span>
            </button>
          )}
          <button style={{ ...S.modeCard, background: "linear-gradient(135deg, #065F46, #047857)", opacity: set.cards.length < 4 ? 0.5 : 1 }} className="mode-card" onClick={() => nav("test", { setId: set.id })} disabled={set.cards.length < 4} title={set.cards.length < 4 ? "Need ≥ 4 cards to test" : ""}>
            <Icons.Test />
            <span style={S.modeCardTitle}>Test</span>
            <span style={S.modeCardDesc}>{set.cards.length < 4 ? "Need ≥ 4 cards" : "Multiple choice & written exam"}</span>
          </button>
          <button style={{ ...S.modeCard, background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }} className="mode-card" onClick={() => nav("edit", { setId: set.id })}>
            <Icons.Edit />
            <span style={S.modeCardTitle}>Edit</span>
            <span style={S.modeCardDesc}>Modify cards and content</span>
          </button>
        </div>

        {folders.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: t.text3, fontSize: 13, whiteSpace: "nowrap" }}>Move to:</span>
            <select style={S.folderSelect} value={set.folderId || ""} onChange={e => moveSetToFolder(set.id, e.target.value || null)}>
              <option value="">No folder</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={S.cardListPreview}>
        <h3 style={{ color: t.text, fontSize: 14, fontWeight: 600, marginBottom: 12, fontFamily: "'Space Mono', monospace" }}>
          Cards in this set ({set.cards.length})
        </h3>
        {(() => {
          const counts = {};
          set.cards.forEach(c => { const lvl = getMasteryLevel(c); counts[lvl] = (counts[lvl] || 0) + 1; });
          const total = set.cards.length;
          const levels = ["mastered", "familiar", "learning", "not-studied"];
          return (
            <>
              <div style={S.masteryBar}>
                {levels.map(lvl => counts[lvl] ? (
                  <div key={lvl} style={{ ...S.masterySegment, width: `${(counts[lvl] / total) * 100}%`, background: MASTERY_COLORS[lvl].color }} title={`${MASTERY_COLORS[lvl].label}: ${counts[lvl]}`} />
                ) : null)}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {levels.map(lvl => counts[lvl] ? (
                  <span key={lvl} style={{ ...S.masteryBadge, background: MASTERY_COLORS[lvl].bg, color: MASTERY_COLORS[lvl].color }}>
                    {counts[lvl]} {MASTERY_COLORS[lvl].label.toLowerCase()}
                  </span>
                ) : null)}
              </div>
            </>
          );
        })()}

        {/* Filter & Sort bar */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          {[["all", "All"], ["starred", "Starred"], ["learning", "Learning"], ["mastered", "Mastered"], ["due", "Due"]].map(([val, label]) => (
            <button key={val} onClick={() => setCardFilter(val)} style={{ ...S.chipBtn, ...(cardFilter === val ? S.chipActive : {}), padding: "4px 12px", fontSize: 12 }}>{label}</button>
          ))}
          <select style={{ ...S.folderSelect, flex: "none", padding: "4px 8px", fontSize: 12 }} value={cardSort} onChange={e => setCardSort(e.target.value)}>
            <option value="default">Default order</option>
            <option value="alpha">Alphabetical</option>
            <option value="mastery">Mastery (low → high)</option>
            <option value="review">Next review</option>
          </select>
        </div>

        {(() => {
          const masteryOrder = { "not-studied": 0, "learning": 1, "familiar": 2, "mastered": 3 };
          let filtered = set.cards;
          if (cardFilter === "starred") filtered = filtered.filter(c => c.starred);
          else if (cardFilter === "learning") filtered = filtered.filter(c => getMasteryLevel(c) === "learning" || getMasteryLevel(c) === "not-studied");
          else if (cardFilter === "mastered") filtered = filtered.filter(c => getMasteryLevel(c) === "mastered" || getMasteryLevel(c) === "familiar");
          else if (cardFilter === "due") filtered = filtered.filter(isDue);

          if (cardSort === "alpha") filtered = [...filtered].sort((a, b) => a.term.localeCompare(b.term));
          else if (cardSort === "mastery") filtered = [...filtered].sort((a, b) => masteryOrder[getMasteryLevel(a)] - masteryOrder[getMasteryLevel(b)]);
          else if (cardSort === "review") filtered = [...filtered].sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));

          return (
            <>
              {filtered.length !== set.cards.length && (
                <p style={{ color: t.text3, fontSize: 12, marginBottom: 8 }}>Showing {filtered.length} of {set.cards.length} cards</p>
              )}
              {filtered.map(card => {
                const mastery = getMasteryLevel(card);
                const mc = MASTERY_COLORS[mastery];
                return (
                <div key={card.id} style={S.cardPreviewRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>{renderContent(card.term, card.termImage, card.termTable, { fontSize: 14, fontWeight: 500, color: t.text })}</div>
                      <span style={{ ...S.masteryBadge, background: mc.bg, color: mc.color, fontSize: 10, padding: "1px 6px", flexShrink: 0 }}>{mc.label}</span>
                    </div>
                    <div>
                      {renderContent(card.definition, card.defImage, card.defTable, { fontSize: 13, color: t.text3 })}
                    </div>
                    {card.nextReview > 0 && (
                      <p style={{ color: t.text4, fontSize: 11, marginTop: 4, fontFamily: "'Space Mono', monospace" }}>
                        {isDue(card) ? "Due now" : `Next: ${Math.ceil((card.nextReview - Date.now()) / 86400000)}d`}
                      </p>
                    )}
                  </div>
                  <button style={S.iconBtn} onClick={() => toggleStar(card.id)}><Icons.Star filled={card.starred} /></button>
                </div>
                );
              })}
            </>
          );
        })()}
      </div>

      <div style={{ padding: "0 24px 32px", maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <button style={S.secondaryBtn} onClick={handleExport}>
          <Icons.Download /> Export as JSON
        </button>
        <button style={S.dangerBtn} onClick={() => { if (confirm("Delete this set?")) deleteSet(set.id); }}>
          <Icons.Trash /> Delete Set
        </button>
      </div>
    </div>
  );
}

// ─── Edit Page ───
function EditPage({ set, nav, updateSet, focusCardId, returnView, S, theme, toggleTheme }) {
  const [title, setTitle] = useState(set?.title || "");
  const [desc, setDesc] = useState(set?.description || "");
  const [cards, setCards] = useState(set?.cards?.map(c => ({ ...newCard(), ...c })) || []);
  const cardRefs = useRef({});
  const prevCardCount = useRef(cards.length);
  const getRef = (cardId, field) => {
    if (!cardRefs.current[cardId]) cardRefs.current[cardId] = { term: { current: null }, def: { current: null } };
    return cardRefs.current[cardId][field];
  };

  // Refs so the beforeunload handler always sees the latest values without a stale closure
  const titleRef = useRef(title);
  const descRef = useRef(desc);
  const cardsRef = useRef(cards);
  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { descRef.current = desc; }, [desc]);
  useEffect(() => { cardsRef.current = cards; }, [cards]);

  // Auto-save edits synchronously when the user refreshes or closes the tab,
  // so changes are never lost before the user hits the Save button.
  useEffect(() => {
    const handleBeforeUnload = () => {
      const valid = cardsRef.current.filter(c => c.term.trim() || c.termImage || c.termTable);
      const savedSets = storage.load() || [];
      const updated = savedSets.map(s =>
        s.id === set.id
          ? { ...s, title: titleRef.current.trim() || s.title, description: descRef.current.trim(), cards: valid }
          : s
      );
      storage.save(updated);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (focusCardId) {
      const el = getRef(focusCardId, "term").current;
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); }
    } else {
      const lastCard = cards[cards.length - 1];
      if (lastCard) {
        const el = getRef(lastCard.id, "term").current;
        if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); }
      }
    }
  }, []);

  useEffect(() => {
    if (cards.length > prevCardCount.current) {
      const lastCard = cards[cards.length - 1];
      getRef(lastCard.id, "term").current?.focus();
    }
    prevCardCount.current = cards.length;
  }, [cards.length]);

  if (!set) return null;

  const updateField = (id, field, val) => setCards(c => c.map(x => x.id === id ? { ...x, [field]: val } : x));
  const removeCard = (id) => cards.length > 1 && setCards(c => c.filter(x => x.id !== id));
  const addCardRow = () => setCards(c => [...c, newCard()]);

  const handleSave = () => {
    const valid = cards.filter(c => c.term.trim() || c.termImage || c.termTable);
    updateSet(set.id, st => ({ ...st, title: title.trim() || st.title, description: desc.trim(), cards: valid }));
    nav(returnView?.page || "detail", returnView || { setId: set.id });
  };

  const handlePageKey = (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "Enter") { e.preventDefault(); addCardRow(); }
    else if (e.ctrlKey && (e.key === "Enter" || e.key === "s")) { e.preventDefault(); handleSave(); }
  };

  return (
    <div style={S.page} onKeyDown={handlePageKey}>
      <NavBar onBack={() => nav(returnView?.page || "detail", returnView || { setId: set.id })} title="Edit Set" S={S} theme={theme} toggleTheme={toggleTheme} showShortcuts />
      <div style={S.formSection}>
        <input style={S.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
        <input style={S.input} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" />
      </div>
      <div style={S.cardList}>
        {cards.map((card, i) => (
          <div key={card.id} style={S.cardEditor} onKeyDown={e => { if (e.ctrlKey && e.key === "Delete") removeCard(card.id); }}>
            <div style={S.cardEditorHeader}>
              <span style={S.cardNum}>{i + 1}</span>
              {cards.length > 1 && <button style={S.iconBtn} onClick={() => removeCard(card.id)}><Icons.Trash /></button>}
            </div>
            <div style={S.cardEditorFields} className="card-editor-fields">
              <RichFieldEditor label="Term" textValue={card.term} onTextChange={v => updateField(card.id, "term", v)} image={card.termImage} onImageChange={v => updateField(card.id, "termImage", v)} table={card.termTable} onTableChange={v => updateField(card.id, "termTable", v)} inputRef={getRef(card.id, "term")} onFocusNext={() => getRef(card.id, "def").current?.focus()} onFocusPrev={() => cards[i - 1] && getRef(cards[i - 1].id, "def").current?.focus()} />
              <RichFieldEditor label="Definition" textValue={card.definition} onTextChange={v => updateField(card.id, "definition", v)} image={card.defImage} onImageChange={v => updateField(card.id, "defImage", v)} table={card.defTable} onTableChange={v => updateField(card.id, "defTable", v)} inputRef={getRef(card.id, "def")} onFocusNext={() => cards[i + 1] && getRef(cards[i + 1].id, "term").current?.focus()} onFocusPrev={() => getRef(card.id, "term").current?.focus()} />
            </div>
          </div>
        ))}
      </div>
      <button style={S.addCardBtn} onClick={addCardRow}><Icons.Plus /> Add Card</button>
      <div style={{ padding: "16px 24px 32px", maxWidth: 900, margin: "0 auto" }}>
        <button style={{ ...S.primaryBtn, width: "100%" }} onClick={handleSave}>Save Changes</button>
      </div>
    </div>
  );
}

// ─── Smart Study Page (all due cards across sets) ───
function SmartStudyPage({ sets, nav, updateSet, S, t, theme, toggleTheme }) {
  const [studyCards] = useState(() => {
    const allCards = sets.flatMap(s => s.cards).filter(isDue);
    return allCards.sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
  });

  const [cardSetMap] = useState(() => {
    const map = {};
    sets.forEach(s => s.cards.forEach(c => { map[c.id] = s.id; }));
    return map;
  });

  const dueCount = studyCards.length;

  const onRate = (card, sm2) => {
    const ownerSetId = cardSetMap[card.id];
    if (ownerSetId) {
      updateSet(ownerSetId, st => ({ ...st, cards: st.cards.map(c => c.id === card.id ? { ...c, ...sm2 } : c) }));
    }
  };

  if (studyCards.length === 0) {
    return (
      <div style={S.page}>
        <NavBar onBack={() => nav("home")} title="Smart Study" S={S} theme={theme} toggleTheme={toggleTheme} />
        <div style={{ ...S.studyContainer, textAlign: "center", padding: "60px 24px" }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🎉</p>
          <h2 style={{ color: t.text, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>All caught up!</h2>
          <p style={{ color: t.text3, fontSize: 14, marginBottom: 24 }}>No cards are due for review right now.</p>
          <button style={S.primaryBtn} className="primary-btn" onClick={() => nav("home")}>Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <StudyCore
      studyCards={studyCards}
      title="Smart Study — Due Cards"
      dueCount={dueCount}
      onBack={() => nav("home")}
      onRate={onRate}
      onEdit={cardId => { const sid = cardSetMap[cardId]; if (sid) nav("edit", { setId: sid, focusCardId: cardId, returnView: { page: "smartStudy" } }); }}
      S={S} t={t} theme={theme} toggleTheme={toggleTheme}
    />
  );
}

// ─── Settings Page ───
function SettingsPage({ nav, S, t, theme, toggleTheme, sets, setSets, setFolders }) {
  const handleExportAll = () => {
    const data = { sets: sets, folders: JSON.parse(localStorage.getItem("flashforge-folders") || "[]") };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flashforge-backup.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.sets) { setSets(data.sets); storage.save(data.sets); }
          if (data.folders) { setFolders(data.folders); foldersStorage.save(data.folders); }
          alert("Backup restored successfully!");
        } catch { alert("Invalid backup file."); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearAll = () => {
    if (confirm("Delete ALL flashcard sets and folders? This cannot be undone.")) {
      setSets([]);
      setFolders([]);
      storage.save([]);
      foldersStorage.save([]);
      localStorage.removeItem("flashforge-recent");
      nav("home");
    }
  };

  const sectionStyle = { background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 14, padding: 18, marginBottom: 14 };
  const sectionTitle = { color: t.text, fontSize: 15, fontWeight: 600, marginBottom: 12, fontFamily: "'DM Sans', sans-serif" };
  const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.border}` };
  const labelStyle = { color: t.text2, fontSize: 14 };

  return (
    <div style={S.page}>
      <NavBar onBack={() => nav("home")} title="Settings" S={S} theme={theme} toggleTheme={toggleTheme} />
      <div style={{ padding: "16px 24px 32px", maxWidth: 600, margin: "0 auto" }}>
        <div style={sectionStyle}>
          <h3 style={sectionTitle}>Appearance</h3>
          <div style={rowStyle}>
            <span style={labelStyle}>Theme</span>
            <button style={S.secondaryBtn} className="secondary-btn" onClick={toggleTheme}>{theme === "dark" ? "Dark" : "Light"} — click to toggle</button>
          </div>
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionTitle}>Data</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button style={S.secondaryBtn} className="secondary-btn" onClick={handleExportAll}><Icons.Download /> Export all sets as backup</button>
            <button style={S.secondaryBtn} className="secondary-btn" onClick={handleImportBackup}><Icons.Import /> Import backup from file</button>
          </div>
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionTitle}>Keyboard Shortcuts</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
            {[
              { keys: "/", desc: "Focus search" },
              { keys: "N", desc: "New set" },
              { keys: "Esc", desc: "Go back / Home" },
              { keys: "P", desc: "Toggle auto-play" },
              { keys: "Space", desc: "Flip card" },
              { keys: "← →", desc: "Navigate cards" },
              { keys: "1-4", desc: "Rate card" },
            ].map(({ keys, desc }) => (
              <div key={keys} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <kbd style={{ background: t.bg3, border: `1px solid ${t.border2}`, borderRadius: 4, padding: "1px 6px", fontSize: 11, fontFamily: "'Space Mono', monospace", color: t.text2, whiteSpace: "nowrap" }}>{keys}</kbd>
                <span style={{ color: t.text2, fontSize: 12 }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...sectionStyle, borderColor: "rgba(239,68,68,0.3)" }}>
          <h3 style={{ ...sectionTitle, color: "#EF4444" }}>Danger Zone</h3>
          <button style={S.dangerBtn} onClick={handleClearAll}>
            <Icons.Trash /> Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Test Page ───
function TestPage({ set, nav, S, t, theme, toggleTheme }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!set || set.cards.length < 4) return;
    const cards = shuffle(set.cards);
    setQuestions(cards.slice(0, Math.min(10, cards.length)).map(card => {
      const type = Math.random() > 0.5 ? "mc" : "written";
      if (type === "mc") {
        const wrongs = shuffle(set.cards.filter(c => c.id !== card.id)).slice(0, 3).map(c => c.definition);
        return { id: card.id, type: "mc", term: card.term, correct: card.definition, termImage: card.termImage, options: shuffle([card.definition, ...wrongs]) };
      }
      return { id: card.id, type: "written", term: card.term, correct: card.definition, termImage: card.termImage };
    }));
  }, [set]);

  if (!set) return null;

  const isCorrect = (q) => {
    const ans = answers[q.id] || "";
    return q.type === "mc" ? ans === q.correct : ans.trim().toLowerCase() === q.correct.trim().toLowerCase();
  };
  const score = questions.filter(isCorrect).length;

  return (
    <div style={S.page}>
      <NavBar onBack={() => nav("detail", { setId: set.id })} title={`Test: ${set.title}`} S={S} theme={theme} toggleTheme={toggleTheme} />
      {submitted ? (
        <div style={S.testResults}>
          <div style={S.scoreCircle}>
            <span style={S.scoreNum}>{Math.round((score / questions.length) * 100)}%</span>
            <span style={S.scoreLabel}>{score}/{questions.length} correct</span>
          </div>
          {questions.map((q, i) => (
            <div key={q.id} style={{ ...S.resultRow, borderLeft: `3px solid ${isCorrect(q) ? "#10B981" : "#EF4444"}` }}>
              <p style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>{i + 1}. {q.term}</p>
              {!isCorrect(q) && <p style={{ color: "#EF4444", fontSize: 13, marginTop: 4 }}>Your answer: {answers[q.id] || "(blank)"}</p>}
              <p style={{ color: "#10B981", fontSize: 13, marginTop: 2 }}>Correct: {q.correct}</p>
            </div>
          ))}
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button style={S.primaryBtn} onClick={() => { setSubmitted(false); setAnswers({}); }}>Retry</button>
            <button style={S.secondaryBtn} onClick={() => nav("detail", { setId: set.id })}>Back to Set</button>
          </div>
        </div>
      ) : (
        <div style={S.testContainer}>
          {questions.map((q, i) => (
            <div key={q.id} style={S.questionBlock}>
              <p style={S.questionLabel}>Question {i + 1}</p>
              <p style={S.questionTerm}>{q.term}</p>
              {q.termImage && <img src={q.termImage} alt="" style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 8, marginBottom: 12, objectFit: "contain" }} />}
              {q.type === "mc" ? (
                <div style={S.optionsGrid} className="options-grid">
                  {q.options.map(opt => (
                    <button key={opt} style={{ ...S.optionBtn, ...(answers[q.id] === opt ? S.optionSelected : {}) }} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}>
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input style={S.input} placeholder="Type your answer..." value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} />
              )}
            </div>
          ))}
          <button style={{ ...S.primaryBtn, width: "100%", marginTop: 16 }} onClick={() => setSubmitted(true)}>Submit Test</button>
        </div>
      )}
    </div>
  );
}
