import { useState, useEffect, useCallback, useRef } from "react";

const SAMPLE_SETS = [
  {
    id: "demo-1",
    title: "Spanish Basics",
    description: "Common Spanish vocabulary for beginners",
    createdAt: Date.now(),
    cards: [
      { id: "c1", term: "Hola", definition: "Hello", starred: false, bucket: 0 },
      { id: "c2", term: "Adiós", definition: "Goodbye", starred: false, bucket: 0 },
      { id: "c3", term: "Por favor", definition: "Please", starred: false, bucket: 0 },
      { id: "c4", term: "Gracias", definition: "Thank you", starred: false, bucket: 0 },
      { id: "c5", term: "De nada", definition: "You're welcome", starred: false, bucket: 0 },
      { id: "c6", term: "Buenos días", definition: "Good morning", starred: false, bucket: 0 },
      { id: "c7", term: "Buenas noches", definition: "Good night", starred: false, bucket: 0 },
      { id: "c8", term: "Lo siento", definition: "I'm sorry", starred: false, bucket: 0 },
    ],
  },
  {
    id: "demo-2",
    title: "Biology: Cell Structure",
    description: "Key organelles and their functions",
    createdAt: Date.now() - 86400000,
    cards: [
      { id: "b1", term: "Mitochondria", definition: "Powerhouse of the cell — generates ATP through cellular respiration", starred: false, bucket: 0 },
      { id: "b2", term: "Ribosome", definition: "Synthesizes proteins from mRNA instructions", starred: false, bucket: 0 },
      { id: "b3", term: "Nucleus", definition: "Contains DNA and controls cell activities", starred: false, bucket: 0 },
      { id: "b4", term: "Golgi Apparatus", definition: "Packages and distributes proteins and lipids", starred: false, bucket: 0 },
      { id: "b5", term: "Endoplasmic Reticulum", definition: "Network of membranes for protein (rough) and lipid (smooth) synthesis", starred: false, bucket: 0 },
      { id: "b6", term: "Lysosome", definition: "Breaks down waste materials and cellular debris", starred: false, bucket: 0 },
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
};

// ─── Storage helpers (localStorage for browser) ───
const STORAGE_KEY = "flashforge-sets";

const storage = {
  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  save(sets) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
    } catch (e) {
      console.error("Save failed:", e);
    }
  },
};

// ─── Utility ───
const uid = () => Math.random().toString(36).slice(2, 10);
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

// ─────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────
export default function App() {
  const [sets, setSets] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState({ page: "home" });

  useEffect(() => {
    const data = storage.load();
    setSets(data && data.length > 0 ? data : SAMPLE_SETS);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) storage.save(sets);
  }, [sets, loaded]);

  const updateSet = (id, updater) => {
    setSets((prev) => prev.map((s) => (s.id === id ? updater(s) : s)));
  };

  const deleteSet = (id) => {
    setSets((prev) => prev.filter((s) => s.id !== id));
    setView({ page: "home" });
  };

  const addSet = (set) => {
    setSets((prev) => [set, ...prev]);
    setView({ page: "detail", setId: set.id });
  };

  const nav = (page, props = {}) => setView({ page, ...props });

  if (!loaded) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <p style={{ color: "#94A3B8", marginTop: 16, fontFamily: "'DM Sans', sans-serif" }}>Loading your sets...</p>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <style>{globalCSS}</style>

      {view.page === "home" && <HomePage sets={sets} nav={nav} addSet={addSet} />}
      {view.page === "create" && <CreatePage nav={nav} addSet={addSet} />}
      {view.page === "import" && <ImportPage nav={nav} addSet={addSet} />}
      {view.page === "detail" && <DetailPage set={sets.find((s) => s.id === view.setId)} nav={nav} updateSet={updateSet} deleteSet={deleteSet} />}
      {view.page === "study" && <StudyPage set={sets.find((s) => s.id === view.setId)} nav={nav} updateSet={updateSet} />}
      {view.page === "test" && <TestPage set={sets.find((s) => s.id === view.setId)} nav={nav} />}
      {view.page === "edit" && <EditPage set={sets.find((s) => s.id === view.setId)} nav={nav} updateSet={updateSet} />}
    </div>
  );
}

// ─────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────
function HomePage({ sets, nav }) {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.logo}>⚡ FlashForge</h1>
          <p style={styles.subtitle}>Master anything, one card at a time</p>
        </div>
      </header>

      <div style={styles.actionBar}>
        <button style={styles.primaryBtn} onClick={() => nav("create")}>
          <Icons.Plus /> New Set
        </button>
        <button style={styles.secondaryBtn} onClick={() => nav("import")}>
          <Icons.Import /> Import
        </button>
      </div>

      {sets.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>📚</p>
          <p style={{ color: "#94A3B8", fontSize: 15 }}>No flashcard sets yet. Create your first one!</p>
        </div>
      ) : (
        <div style={styles.setGrid}>
          {sets.map((set) => (
            <button key={set.id} style={styles.setCard} onClick={() => nav("detail", { setId: set.id })} className="set-card">
              <div style={styles.setCardTop}>
                <span style={styles.cardCount}>{set.cards.length} cards</span>
              </div>
              <h3 style={styles.setTitle}>{set.title}</h3>
              {set.description && <p style={styles.setDesc}>{set.description}</p>}
              <div style={styles.setCardBottom}>
                <span style={styles.dateLabel}>
                  {new Date(set.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────
// CREATE PAGE
// ─────────────────────────────────────
function CreatePage({ nav, addSet }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cards, setCards] = useState([
    { id: uid(), term: "", definition: "" },
    { id: uid(), term: "", definition: "" },
    { id: uid(), term: "", definition: "" },
  ]);

  const updateCard = (id, field, val) => setCards((c) => c.map((x) => (x.id === id ? { ...x, [field]: val } : x)));
  const removeCard = (id) => cards.length > 1 && setCards((c) => c.filter((x) => x.id !== id));
  const addCard = () => setCards((c) => [...c, { id: uid(), term: "", definition: "" }]);

  const handleSave = () => {
    if (!title.trim()) return;
    const validCards = cards.filter((c) => c.term.trim() && c.definition.trim());
    if (validCards.length === 0) return;
    addSet({
      id: uid(),
      title: title.trim(),
      description: desc.trim(),
      createdAt: Date.now(),
      cards: validCards.map((c) => ({ ...c, starred: false, bucket: 0 })),
    });
  };

  return (
    <div style={styles.page}>
      <NavBar onBack={() => nav("home")} title="Create New Set" />
      <div style={styles.formSection}>
        <input style={styles.input} placeholder="Set title (e.g. Biology Chapter 5)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input style={styles.input} placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>

      <div style={styles.cardList}>
        {cards.map((card, i) => (
          <div key={card.id} style={styles.cardEditor}>
            <div style={styles.cardEditorHeader}>
              <span style={styles.cardNum}>{i + 1}</span>
              {cards.length > 1 && (
                <button style={styles.iconBtn} onClick={() => removeCard(card.id)}>
                  <Icons.Trash />
                </button>
              )}
            </div>
            <div style={styles.cardEditorFields}>
              <div style={{ flex: 1 }}>
                <label style={styles.fieldLabel}>Term</label>
                <input style={styles.cardInput} value={card.term} onChange={(e) => updateCard(card.id, "term", e.target.value)} placeholder="Enter term" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.fieldLabel}>Definition</label>
                <input style={styles.cardInput} value={card.definition} onChange={(e) => updateCard(card.id, "definition", e.target.value)} placeholder="Enter definition" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button style={styles.addCardBtn} onClick={addCard}>
        <Icons.Plus /> Add Card
      </button>

      <div style={{ padding: "16px 20px 32px" }}>
        <button style={{ ...styles.primaryBtn, width: "100%" }} onClick={handleSave}>
          Create Set ({cards.filter((c) => c.term.trim() && c.definition.trim()).length} cards)
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────
// IMPORT PAGE
// ─────────────────────────────────────
function ImportPage({ nav, addSet }) {
  const [title, setTitle] = useState("");
  const [raw, setRaw] = useState("");
  const [sep, setSep] = useState("tab");

  const preview = raw
    .split("\n")
    .map((line) => {
      const d = sep === "tab" ? "\t" : sep === "comma" ? "," : " - ";
      const parts = line.split(d);
      return parts.length >= 2 ? { term: parts[0].trim(), def: parts.slice(1).join(d).trim() } : null;
    })
    .filter(Boolean);

  const handleImport = () => {
    if (!title.trim() || preview.length === 0) return;
    addSet({
      id: uid(),
      title: title.trim(),
      description: `Imported ${preview.length} cards`,
      createdAt: Date.now(),
      cards: preview.map((p) => ({ id: uid(), term: p.term, definition: p.def, starred: false, bucket: 0 })),
    });
  };

  return (
    <div style={styles.page}>
      <NavBar onBack={() => nav("home")} title="Import Cards" />
      <div style={styles.formSection}>
        <input style={styles.input} placeholder="Set title" value={title} onChange={(e) => setTitle(e.target.value)} />

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[["tab", "Tab"], ["comma", "Comma"], ["dash", "Dash"]].map(([v, l]) => (
            <button key={v} onClick={() => setSep(v)} style={{ ...styles.chipBtn, ...(sep === v ? styles.chipActive : {}) }}>{l}</button>
          ))}
        </div>

        <textarea
          style={styles.textarea}
          rows={8}
          placeholder={`Paste your terms here...\nExample:\nHola${sep === "tab" ? "\t" : sep === "comma" ? "," : " - "}Hello\nAdiós${sep === "tab" ? "\t" : sep === "comma" ? "," : " - "}Goodbye`}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />

        {preview.length > 0 && (
          <div style={styles.previewBox}>
            <p style={{ color: "#10B981", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>✓ {preview.length} cards detected</p>
            {preview.slice(0, 4).map((p, i) => (
              <div key={i} style={styles.previewRow}>
                <span style={{ color: "#E2E8F0", fontWeight: 500 }}>{p.term}</span>
                <span style={{ color: "#64748B" }}>→</span>
                <span style={{ color: "#94A3B8" }}>{p.def}</span>
              </div>
            ))}
            {preview.length > 4 && <p style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>+{preview.length - 4} more...</p>}
          </div>
        )}

        <button style={{ ...styles.primaryBtn, width: "100%", marginTop: 12 }} onClick={handleImport} disabled={!title.trim() || preview.length === 0}>
          Import {preview.length} Cards
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────
// DETAIL PAGE
// ─────────────────────────────────────
function DetailPage({ set, nav, updateSet, deleteSet }) {
  if (!set) return <div style={styles.page}><NavBar onBack={() => nav("home")} title="Not Found" /></div>;

  const toggleStar = (cardId) => {
    updateSet(set.id, (s) => ({
      ...s,
      cards: s.cards.map((c) => (c.id === cardId ? { ...c, starred: !c.starred } : c)),
    }));
  };

  return (
    <div style={styles.page}>
      <NavBar onBack={() => nav("home")} title={set.title} />

      <div style={styles.detailHeader}>
        <p style={{ color: "#94A3B8", fontSize: 14, marginBottom: 16 }}>{set.description || `${set.cards.length} cards`}</p>
        <div style={styles.modeGrid}>
          <button style={styles.modeBtn} onClick={() => nav("study", { setId: set.id })} disabled={set.cards.length === 0}>
            <Icons.Cards />
            <span>Flashcards</span>
          </button>
          <button style={{ ...styles.modeBtn, background: "linear-gradient(135deg, #065F46, #047857)" }} onClick={() => nav("test", { setId: set.id })} disabled={set.cards.length < 4}>
            <Icons.Test />
            <span>Test</span>
          </button>
          <button style={{ ...styles.modeBtn, background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }} onClick={() => nav("edit", { setId: set.id })}>
            <Icons.Edit />
            <span>Edit</span>
          </button>
        </div>
      </div>

      <div style={styles.cardListPreview}>
        <h3 style={{ color: "#E2E8F0", fontSize: 14, fontWeight: 600, marginBottom: 12, fontFamily: "'Space Mono', monospace" }}>
          Cards in this set ({set.cards.length})
        </h3>
        {set.cards.map((card) => (
          <div key={card.id} style={styles.cardPreviewRow}>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#F1F5F9", fontSize: 14, fontWeight: 500 }}>{card.term}</p>
              <p style={{ color: "#64748B", fontSize: 13, marginTop: 2 }}>{card.definition}</p>
            </div>
            <button style={styles.iconBtn} onClick={() => toggleStar(card.id)}>
              <Icons.Star filled={card.starred} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 20px 32px" }}>
        <button style={styles.dangerBtn} onClick={() => { if (confirm("Delete this set?")) deleteSet(set.id); }}>
          <Icons.Trash /> Delete Set
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────
// EDIT PAGE
// ─────────────────────────────────────
function EditPage({ set, nav, updateSet }) {
  const [title, setTitle] = useState(set?.title || "");
  const [desc, setDesc] = useState(set?.description || "");
  const [cards, setCards] = useState(set?.cards || []);

  if (!set) return null;

  const updateCard = (id, field, val) => setCards((c) => c.map((x) => (x.id === id ? { ...x, [field]: val } : x)));
  const removeCard = (id) => cards.length > 1 && setCards((c) => c.filter((x) => x.id !== id));
  const addCard = () => setCards((c) => [...c, { id: uid(), term: "", definition: "", starred: false, bucket: 0 }]);

  const handleSave = () => {
    const valid = cards.filter((c) => c.term.trim() && c.definition.trim());
    updateSet(set.id, (s) => ({ ...s, title: title.trim() || s.title, description: desc.trim(), cards: valid }));
    nav("detail", { setId: set.id });
  };

  return (
    <div style={styles.page}>
      <NavBar onBack={() => nav("detail", { setId: set.id })} title="Edit Set" />
      <div style={styles.formSection}>
        <input style={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <input style={styles.input} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" />
      </div>

      <div style={styles.cardList}>
        {cards.map((card, i) => (
          <div key={card.id} style={styles.cardEditor}>
            <div style={styles.cardEditorHeader}>
              <span style={styles.cardNum}>{i + 1}</span>
              {cards.length > 1 && <button style={styles.iconBtn} onClick={() => removeCard(card.id)}><Icons.Trash /></button>}
            </div>
            <div style={styles.cardEditorFields}>
              <div style={{ flex: 1 }}>
                <label style={styles.fieldLabel}>Term</label>
                <input style={styles.cardInput} value={card.term} onChange={(e) => updateCard(card.id, "term", e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.fieldLabel}>Definition</label>
                <input style={styles.cardInput} value={card.definition} onChange={(e) => updateCard(card.id, "definition", e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button style={styles.addCardBtn} onClick={addCard}><Icons.Plus /> Add Card</button>

      <div style={{ padding: "16px 20px 32px" }}>
        <button style={{ ...styles.primaryBtn, width: "100%" }} onClick={handleSave}>Save Changes</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────
// STUDY (FLASHCARD) MODE
// ─────────────────────────────────────
function StudyPage({ set, nav, updateSet }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [cardOrder, setCardOrder] = useState([]);
  const [known, setKnown] = useState(new Set());
  const [learning, setLearning] = useState(new Set());

  useEffect(() => {
    if (set) setCardOrder(set.cards.map((_, i) => i));
  }, [set]);

  if (!set) return null;

  const currentCard = set.cards[cardOrder[index]];
  const total = cardOrder.length;
  const progress = total > 0 ? ((known.size + learning.size) / total) * 100 : 0;
  const done = known.size + learning.size === total && total > 0;

  const handleShuffle = () => {
    const newOrder = shuffled ? set.cards.map((_, i) => i) : shuffle(set.cards.map((_, i) => i));
    setCardOrder(newOrder);
    setShuffled(!shuffled);
    setIndex(0);
    setFlipped(false);
  };

  const go = (dir) => {
    setFlipped(false);
    setTimeout(() => {
      setIndex((i) => {
        if (dir === 1) return i < total - 1 ? i + 1 : 0;
        return i > 0 ? i - 1 : total - 1;
      });
    }, 100);
  };

  const markCard = (type) => {
    const cid = currentCard.id;
    if (type === "known") {
      setKnown((s) => new Set(s).add(cid));
      setLearning((s) => { const n = new Set(s); n.delete(cid); return n; });
    } else {
      setLearning((s) => new Set(s).add(cid));
      setKnown((s) => { const n = new Set(s); n.delete(cid); return n; });
    }
    if (index < total - 1) go(1);
  };

  const handleKey = useCallback((e) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); }
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  }, [index, total]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (done) {
    return (
      <div style={styles.page}>
        <NavBar onBack={() => nav("detail", { setId: set.id })} title={set.title} />
        <div style={styles.doneScreen}>
          <p style={{ fontSize: 56, marginBottom: 8 }}>🎉</p>
          <h2 style={{ color: "#F1F5F9", fontSize: 22, fontWeight: 700, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Round Complete!</h2>
          <p style={{ color: "#94A3B8", fontSize: 14, marginBottom: 24 }}>
            {known.size} known · {learning.size} still learning
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button style={styles.primaryBtn} onClick={() => { setKnown(new Set()); setLearning(new Set()); setIndex(0); setFlipped(false); }}>
              Study Again
            </button>
            <button style={styles.secondaryBtn} onClick={() => nav("detail", { setId: set.id })}>
              Back to Set
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <NavBar onBack={() => nav("detail", { setId: set.id })} title={set.title} />

      <div style={styles.studyContainer}>
        <div style={styles.progressWrap}>
          <div style={{ ...styles.progressBar, width: `${progress}%` }} />
        </div>
        <div style={styles.studyMeta}>
          <span style={{ color: "#64748B", fontSize: 13, fontFamily: "'Space Mono', monospace" }}>
            {index + 1} / {total}
          </span>
          <button style={{ ...styles.iconBtn, ...(shuffled ? { color: "#6366F1" } : {}) }} onClick={handleShuffle} title="Shuffle">
            <Icons.Shuffle />
          </button>
        </div>

        <div style={styles.flashcardOuter} onClick={() => setFlipped((f) => !f)} className="flashcard-outer">
          <div style={{ ...styles.flashcardInner, transform: flipped ? "rotateY(180deg)" : "rotateY(0)" }} className="flashcard-inner">
            <div style={styles.flashcardFace}>
              <span style={styles.faceLabel}>TERM</span>
              <p style={styles.faceText}>{currentCard?.term}</p>
              <span style={styles.tapHint}>tap to flip</span>
            </div>
            <div style={{ ...styles.flashcardFace, ...styles.flashcardBack }}>
              <span style={{ ...styles.faceLabel, color: "#818CF8" }}>DEFINITION</span>
              <p style={styles.faceText}>{currentCard?.definition}</p>
            </div>
          </div>
        </div>

        <div style={styles.studyControls}>
          <button style={styles.navArrow} onClick={() => go(-1)}><Icons.ChevLeft /></button>
          <button style={styles.learningBtn} onClick={() => markCard("learning")}>
            <Icons.X /> <span>Still learning</span>
          </button>
          <button style={styles.knownBtn} onClick={() => markCard("known")}>
            <Icons.Check /> <span>Know it</span>
          </button>
          <button style={styles.navArrow} onClick={() => go(1)}><Icons.ChevRight /></button>
        </div>

        <p style={{ color: "#475569", fontSize: 12, textAlign: "center", marginTop: 12, fontFamily: "'Space Mono', monospace" }}>
          ← → navigate · space to flip
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────
// TEST MODE
// ─────────────────────────────────────
function TestPage({ set, nav }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!set || set.cards.length < 4) return;
    const cards = shuffle(set.cards);
    const qs = cards.slice(0, Math.min(10, cards.length)).map((card) => {
      const type = Math.random() > 0.5 ? "mc" : "written";
      if (type === "mc") {
        const wrongs = shuffle(set.cards.filter((c) => c.id !== card.id)).slice(0, 3).map((c) => c.definition);
        const options = shuffle([card.definition, ...wrongs]);
        return { id: card.id, type: "mc", term: card.term, correct: card.definition, options };
      }
      return { id: card.id, type: "written", term: card.term, correct: card.definition };
    });
    setQuestions(qs);
  }, [set]);

  if (!set) return null;

  const score = questions.reduce((acc, q) => {
    const ans = answers[q.id] || "";
    if (q.type === "mc") return acc + (ans === q.correct ? 1 : 0);
    return acc + (ans.trim().toLowerCase() === q.correct.trim().toLowerCase() ? 1 : 0);
  }, 0);

  const isCorrect = (q) => {
    const ans = answers[q.id] || "";
    if (q.type === "mc") return ans === q.correct;
    return ans.trim().toLowerCase() === q.correct.trim().toLowerCase();
  };

  return (
    <div style={styles.page}>
      <NavBar onBack={() => nav("detail", { setId: set.id })} title={`Test: ${set.title}`} />

      {submitted ? (
        <div style={styles.testResults}>
          <div style={styles.scoreCircle}>
            <span style={styles.scoreNum}>{Math.round((score / questions.length) * 100)}%</span>
            <span style={styles.scoreLabel}>{score}/{questions.length} correct</span>
          </div>

          {questions.map((q, i) => (
            <div key={q.id} style={{ ...styles.resultRow, borderLeft: `3px solid ${isCorrect(q) ? "#10B981" : "#EF4444"}` }}>
              <p style={{ color: "#E2E8F0", fontSize: 14, fontWeight: 600 }}>{i + 1}. {q.term}</p>
              {!isCorrect(q) && <p style={{ color: "#EF4444", fontSize: 13, marginTop: 4 }}>Your answer: {answers[q.id] || "(blank)"}</p>}
              <p style={{ color: "#10B981", fontSize: 13, marginTop: 2 }}>Correct: {q.correct}</p>
            </div>
          ))}

          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button style={styles.primaryBtn} onClick={() => { setSubmitted(false); setAnswers({}); }}>Retry</button>
            <button style={styles.secondaryBtn} onClick={() => nav("detail", { setId: set.id })}>Back to Set</button>
          </div>
        </div>
      ) : (
        <div style={styles.testContainer}>
          {questions.map((q, i) => (
            <div key={q.id} style={styles.questionBlock}>
              <p style={styles.questionLabel}>Question {i + 1}</p>
              <p style={styles.questionTerm}>{q.term}</p>

              {q.type === "mc" ? (
                <div style={styles.optionsGrid}>
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      style={{ ...styles.optionBtn, ...(answers[q.id] === opt ? styles.optionSelected : {}) }}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  style={styles.input}
                  placeholder="Type your answer..."
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                />
              )}
            </div>
          ))}

          <button style={{ ...styles.primaryBtn, width: "100%", marginTop: 16 }} onClick={() => setSubmitted(true)}>
            Submit Test
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────
function NavBar({ onBack, title }) {
  return (
    <div style={styles.navBar}>
      <button style={styles.backBtn} onClick={onBack}>
        <Icons.Back />
      </button>
      <h2 style={styles.navTitle}>{title}</h2>
      <div style={{ width: 40 }} />
    </div>
  );
}

// ─────────────────────────────────────
// GLOBAL CSS
// ─────────────────────────────────────
const globalCSS = `
  .set-card { transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; }
  .set-card:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.4); border-color: #334155 !important; }

  .flashcard-outer { perspective: 1200px; cursor: pointer; }
  .flashcard-inner { transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  input::placeholder, textarea::placeholder { color: #475569; }
  input:focus, textarea:focus { outline: none; border-color: #6366F1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }

  button:disabled { opacity: 0.4; cursor: not-allowed; }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 3px; }

  /* Mobile touch improvements */
  @media (max-width: 480px) {
    .flashcard-outer { -webkit-tap-highlight-color: transparent; }
  }
`;

// ─────────────────────────────────────
// STYLES
// ─────────────────────────────────────
const styles = {
  app: {
    minHeight: "100vh",
    background: "linear-gradient(170deg, #0B1120 0%, #0F172A 40%, #0B1120 100%)",
    color: "#E2E8F0",
    fontFamily: "'DM Sans', sans-serif",
    maxWidth: 640,
    margin: "0 auto",
    position: "relative",
  },
  page: {
    minHeight: "100vh",
    animation: "fadeIn 0.3s ease",
  },
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "#0B1120",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #1E293B",
    borderTop: "3px solid #6366F1",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  header: { padding: "40px 20px 12px" },
  logo: {
    fontSize: 26,
    fontWeight: 700,
    fontFamily: "'Space Mono', monospace",
    background: "linear-gradient(135deg, #818CF8, #6366F1, #A78BFA)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: 4,
  },
  subtitle: { color: "#64748B", fontSize: 14 },
  actionBar: { display: "flex", gap: 10, padding: "16px 20px" },
  primaryBtn: {
    display: "flex", alignItems: "center", gap: 8,
    background: "linear-gradient(135deg, #6366F1, #4F46E5)",
    color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", justifyContent: "center",
  },
  secondaryBtn: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#1E293B", color: "#CBD5E1", border: "1px solid #334155",
    borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 500,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  dangerBtn: {
    display: "flex", alignItems: "center", gap: 8,
    background: "transparent", color: "#EF4444", border: "1px solid #7F1D1D",
    borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 500,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    width: "100%", justifyContent: "center",
  },
  setGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "8px 20px 32px" },
  setCard: {
    background: "#111827", border: "1px solid #1E293B", borderRadius: 14,
    padding: 16, textAlign: "left", cursor: "pointer",
    display: "flex", flexDirection: "column", minHeight: 130,
    width: "100%", fontFamily: "'DM Sans', sans-serif",
  },
  setCardTop: { display: "flex", justifyContent: "space-between", marginBottom: 10 },
  cardCount: {
    fontSize: 11, fontWeight: 600, color: "#818CF8",
    background: "rgba(99,102,241,0.12)", padding: "2px 8px",
    borderRadius: 6, fontFamily: "'Space Mono', monospace",
  },
  setTitle: { color: "#F1F5F9", fontSize: 15, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 },
  setDesc: { color: "#64748B", fontSize: 12, flex: 1, lineHeight: 1.4 },
  setCardBottom: { marginTop: "auto", paddingTop: 8 },
  dateLabel: { color: "#475569", fontSize: 11, fontFamily: "'Space Mono', monospace" },
  emptyState: { textAlign: "center", padding: "60px 20px" },
  navBar: {
    display: "flex", alignItems: "center", padding: "16px 12px", gap: 8,
    borderBottom: "1px solid #1E293B", background: "rgba(11,17,32,0.9)",
    backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 10,
  },
  backBtn: {
    background: "none", border: "none", color: "#94A3B8",
    cursor: "pointer", padding: 8, borderRadius: 8, display: "flex",
  },
  navTitle: {
    flex: 1, textAlign: "center", fontSize: 15, fontWeight: 600,
    color: "#E2E8F0", fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  iconBtn: {
    background: "none", border: "none", color: "#64748B",
    cursor: "pointer", padding: 6, borderRadius: 6, display: "flex",
  },
  formSection: { padding: "20px 20px 0" },
  input: {
    width: "100%", background: "#111827", border: "1px solid #1E293B",
    borderRadius: 10, padding: "12px 14px", color: "#E2E8F0",
    fontSize: 14, marginBottom: 12, fontFamily: "'DM Sans', sans-serif",
  },
  textarea: {
    width: "100%", background: "#111827", border: "1px solid #1E293B",
    borderRadius: 10, padding: "12px 14px", color: "#E2E8F0",
    fontSize: 14, fontFamily: "'Space Mono', monospace",
    resize: "vertical", lineHeight: 1.6,
  },
  fieldLabel: {
    display: "block", fontSize: 11, fontWeight: 600, color: "#64748B",
    marginBottom: 4, textTransform: "uppercase", letterSpacing: 1,
    fontFamily: "'Space Mono', monospace",
  },
  cardInput: {
    width: "100%", background: "#0B1120", border: "1px solid #1E293B",
    borderRadius: 8, padding: "10px 12px", color: "#E2E8F0",
    fontSize: 14, fontFamily: "'DM Sans', sans-serif",
  },
  cardList: { padding: "12px 20px" },
  cardEditor: {
    background: "#111827", border: "1px solid #1E293B",
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  cardEditorHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10,
  },
  cardNum: { fontSize: 12, fontWeight: 700, color: "#6366F1", fontFamily: "'Space Mono', monospace" },
  cardEditorFields: { display: "flex", gap: 10 },
  addCardBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    width: "calc(100% - 40px)", margin: "0 20px", padding: "12px",
    background: "transparent", border: "2px dashed #1E293B", borderRadius: 12,
    color: "#64748B", fontSize: 14, fontWeight: 500, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  chipBtn: {
    padding: "6px 14px", borderRadius: 8, border: "1px solid #1E293B",
    background: "#111827", color: "#94A3B8", fontSize: 13, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  chipActive: { background: "#6366F1", borderColor: "#6366F1", color: "#fff" },
  previewBox: {
    background: "#111827", border: "1px solid #1E293B",
    borderRadius: 10, padding: 14, marginTop: 12,
  },
  previewRow: { display: "flex", gap: 8, alignItems: "center", fontSize: 13, padding: "4px 0" },
  detailHeader: { padding: "16px 20px" },
  modeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  modeBtn: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    padding: "18px 12px", background: "linear-gradient(135deg, #312E81, #4338CA)",
    border: "none", borderRadius: 12, color: "#E2E8F0", fontSize: 13,
    fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  cardListPreview: { padding: "0 20px 20px" },
  cardPreviewRow: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
    background: "#111827", border: "1px solid #1E293B", borderRadius: 10, marginBottom: 6,
  },
  studyContainer: { padding: "16px 20px" },
  progressWrap: {
    height: 4, background: "#1E293B", borderRadius: 2,
    overflow: "hidden", marginBottom: 12,
  },
  progressBar: {
    height: "100%", background: "linear-gradient(90deg, #6366F1, #818CF8)",
    borderRadius: 2, transition: "width 0.4s ease",
  },
  studyMeta: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  flashcardOuter: { width: "100%", height: 280, marginBottom: 20 },
  flashcardInner: {
    position: "relative", width: "100%", height: "100%",
    transformStyle: "preserve-3d",
  },
  flashcardFace: {
    position: "absolute", width: "100%", height: "100%",
    backfaceVisibility: "hidden", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", padding: 28, borderRadius: 16,
    background: "linear-gradient(145deg, #111827, #1E293B)",
    border: "1px solid #334155", boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
  },
  flashcardBack: {
    transform: "rotateY(180deg)",
    background: "linear-gradient(145deg, #1E1B4B, #312E81)",
    borderColor: "#4338CA",
  },
  faceLabel: {
    fontSize: 11, fontWeight: 700, color: "#6366F1", letterSpacing: 2,
    textTransform: "uppercase", marginBottom: 16, fontFamily: "'Space Mono', monospace",
  },
  faceText: { fontSize: 22, fontWeight: 600, color: "#F1F5F9", textAlign: "center", lineHeight: 1.4 },
  tapHint: {
    position: "absolute", bottom: 16, fontSize: 11,
    color: "#475569", fontFamily: "'Space Mono', monospace",
  },
  studyControls: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10 },
  navArrow: {
    background: "none", border: "1px solid #1E293B", borderRadius: 10,
    padding: 10, color: "#94A3B8", cursor: "pointer", display: "flex",
  },
  learningBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
    background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 10, color: "#F87171", fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  knownBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
    background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)",
    borderRadius: 10, color: "#34D399", fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  doneScreen: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "80px 20px",
  },
  testContainer: { padding: "20px 20px 32px" },
  questionBlock: {
    background: "#111827", border: "1px solid #1E293B",
    borderRadius: 14, padding: 18, marginBottom: 14,
  },
  questionLabel: {
    fontSize: 11, fontWeight: 700, color: "#6366F1", letterSpacing: 1.5,
    textTransform: "uppercase", marginBottom: 6, fontFamily: "'Space Mono', monospace",
  },
  questionTerm: { fontSize: 18, fontWeight: 600, color: "#F1F5F9", marginBottom: 14 },
  optionsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  optionBtn: {
    padding: "12px", background: "#0B1120", border: "1px solid #1E293B",
    borderRadius: 10, color: "#CBD5E1", fontSize: 13, cursor: "pointer",
    textAlign: "left", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
  },
  optionSelected: {
    borderColor: "#6366F1", background: "rgba(99,102,241,0.12)", color: "#A5B4FC",
  },
  testResults: { padding: "20px 20px 32px" },
  scoreCircle: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", width: 140, height: 140, borderRadius: "50%",
    background: "linear-gradient(145deg, #111827, #1E293B)",
    border: "3px solid #6366F1", margin: "20px auto 28px",
  },
  scoreNum: { fontSize: 36, fontWeight: 700, color: "#F1F5F9", fontFamily: "'Space Mono', monospace" },
  scoreLabel: { fontSize: 12, color: "#94A3B8", fontFamily: "'Space Mono', monospace" },
  resultRow: { background: "#111827", borderRadius: 10, padding: 14, marginBottom: 8 },
};
