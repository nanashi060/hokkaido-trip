// カテゴリ定義 - 新カテゴリを増やすときはここに1行足すだけ(iconはjs/icons.jsの名前)
export const CATEGORIES = {
  food:        { label: "グルメ",   icon: "utensils",   color: "#9A5C4F", bg: "linear-gradient(135deg,#F2D2C6,#9A5C4F)" },
  cafe:        { label: "カフェ",   icon: "coffee",     color: "#806B4A", bg: "linear-gradient(135deg,#E9DCC4,#806B4A)" },
  sightseeing: { label: "観光",     icon: "camera",     color: "#4E7482", bg: "linear-gradient(135deg,#D7EAF0,#4E7482)" },
  hotel:       { label: "宿",       icon: "bed-double", color: "#6C6378", bg: "linear-gradient(135deg,#E3DDED,#6C6378)" },
  transport:   { label: "移動拠点", icon: "car",        color: "#66716B", bg: "linear-gradient(135deg,#E3EAE5,#66716B)" }
};

export function categoryOf(spot) {
  return CATEGORIES[spot.category] || { label: spot.category, icon: "map-pin", color: "#868E96", bg: "" };
}

// 移動手段のテキストからアイコン名を推定する
export function transportIcon(method = "") {
  if (method.includes("飛行機")) return "plane";
  if (method.includes("タクシー")) return "car-taxi-front";
  if (/JR|電車|列車|新幹線|地下鉄|市電|バス/.test(method)) return "train-front";
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
  elements.forEach((el, index) => {
    el.style.setProperty("--reveal-index", String(index % 10));
  });

  const reduce = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const isInView = el => {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  };

  if (!("IntersectionObserver" in window) || reduce) {
    elements.forEach(el => el.classList.add("visible"));
    return;
  }

  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.1 });
  elements.forEach(el => {
    if (isInView(el)) el.classList.add("visible");
    io.observe(el);
  });
}
