// カテゴリ定義 — 新カテゴリを増やすときはここに1行足すだけ
export const CATEGORIES = {
  food:        { label: "グルメ",   icon: "🍽️", color: "#FF6B6B", bg: "linear-gradient(135deg,#FFE3E3,#FFD8A8)" },
  cafe:        { label: "カフェ",   icon: "☕",  color: "#F08C00", bg: "linear-gradient(135deg,#FFF3BF,#FFE8CC)" },
  sightseeing: { label: "観光",     icon: "🌊",  color: "#339AF0", bg: "linear-gradient(135deg,#D0EBFF,#D3F9D8)" },
  hotel:       { label: "宿",       icon: "🏨",  color: "#845EF7", bg: "linear-gradient(135deg,#E5DBFF,#FFDEEB)" },
  transport:   { label: "移動拠点", icon: "🚗",  color: "#868E96", bg: "linear-gradient(135deg,#E9ECEF,#DEE2E6)" }
};

export function categoryOf(spot) {
  return CATEGORIES[spot.category] || { label: spot.category, icon: "📍", color: "#868E96", bg: "" };
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

// "2026-07-13" → "7/13(月)"
export function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  const w = "日月火水木金土"[d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${w})`;
}

// スクロールで順にふわっと出すアニメーション
export function reveal(elements) {
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.1 });
  elements.forEach(el => io.observe(el));
}
