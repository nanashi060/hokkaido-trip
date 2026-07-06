import { fmtDate } from "./common.js";
import { renderTimeline } from "./timeline.js";
import { renderMap } from "./map.js";
import { renderSpotCards } from "./spots.js";

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} の読み込みに失敗しました (${res.status})`);
  return res.json();
}

async function init() {
  const [trip, spotsData, itinerary] = await Promise.all([
    loadJson("data/trip.json"),
    loadJson("data/spots.json"),
    loadJson("data/itinerary.json")
  ]);

  const state = {
    trip,
    itinerary,
    spots: spotsData.spots,
    spotById: new Map(spotsData.spots.map(s => [s.id, s]))
  };

  renderHero(state);
  renderTimeline(state, currentTripDay(state));
  renderMap(state);
  renderSpotCards(state);
}

// 旅行中なら今日が Day 何日目かを返す(旅行前後は null)
function currentTripDay(state) {
  const start = new Date(state.trip.startDate + "T00:00:00");
  const end = new Date(state.trip.endDate + "T23:59:59");
  const now = new Date();
  if (now < start || now > end) return null;
  return Math.floor((now - start) / 86400000) + 1;
}

function renderHero(state) {
  document.getElementById("hero-title").textContent = state.trip.title;
  document.getElementById("hero-sub").textContent = state.trip.subtitle;
  document.getElementById("hero-dates").textContent =
    `${fmtDate(state.trip.startDate)} 〜 ${fmtDate(state.trip.endDate)}`;

  const el = document.getElementById("countdown");
  const start = new Date(state.trip.startDate + "T00:00:00");
  const end = new Date(state.trip.endDate + "T23:59:59");

  function tick() {
    const now = new Date();

    if (now > end) {
      el.innerHTML = `<div class="cd-message">最高の思い出をありがとう 🥹✨</div>`;
      return;
    }
    if (now >= start) {
      const day = Math.floor((now - start) / 86400000) + 1;
      el.innerHTML = `<div class="cd-message">🎉 旅行中!今日は Day ${day} 🎉</div>`;
      return;
    }

    let rest = Math.floor((start - now) / 1000);
    const d = Math.floor(rest / 86400); rest %= 86400;
    const h = Math.floor(rest / 3600); rest %= 3600;
    const m = Math.floor(rest / 60);
    const s = rest % 60;
    const box = (num, label) =>
      `<div class="cd-box"><span class="cd-num">${num}</span><span class="cd-label">${label}</span></div>`;
    el.innerHTML = `
      ${box(d, "日")} ${box(h, "時間")} ${box(m, "分")} ${box(s, "秒")}
      <div class="cd-box"><span class="cd-num">🛫</span><span class="cd-label">しゅっぱつまで</span></div>
    `;
    setTimeout(tick, 1000);
  }
  tick();
}

init().catch(err => {
  console.error(err);
  document.getElementById("timeline-body").innerHTML =
    `<p style="text-align:center">データの読み込みに失敗しました 🙏 ローカルで見る場合は簡易サーバー(例: python -m http.server)経由で開いてください。</p>`;
});
