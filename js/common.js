// カテゴリ定義 — 新カテゴリを増やすときはここに1行足すだけ(iconはjs/icons.jsの名前)
export const CATEGORIES = {
  food:        { label: "グルメ",   icon: "utensils",   color: "#FF6B6B", bg: "linear-gradient(135deg,#FFE3E3,#FFD8A8)" },
  cafe:        { label: "カフェ",   icon: "coffee",     color: "#F08C00", bg: "linear-gradient(135deg,#FFF3BF,#FFE8CC)" },
  sightseeing: { label: "観光",     icon: "camera",     color: "#339AF0", bg: "linear-gradient(135deg,#D0EBFF,#D3F9D8)" },
  hotel:       { label: "宿",       icon: "bed-double", color: "#845EF7", bg: "linear-gradient(135deg,#E5DBFF,#FFDEEB)" },
  transport:   { label: "移動拠点", icon: "car",        color: "#868E96", bg: "linear-gradient(135deg,#E9ECEF,#DEE2E6)" }
};

export function categoryOf(spot) {
  return CATEGORIES[spot.category] || { label: spot.category, icon: "map-pin", color: "#868E96", bg: "" };
}

// 移動手段のテキストからアイコン名を推定する
export function transportIcon(method = "") {
  if (method.includes("飛行機")) return "plane";
  if (method.includes("タクシー")) return "car-taxi-front";
  if (/JR|電車|列車|新幹線/.test(method)) return "train-front";
  if (method.includes("徒歩")) return "footprints";
  if (/フェリー|船/.test(method)) return "ship";
  return "car";
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
