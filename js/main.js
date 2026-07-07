import { esc, fmtDate } from "./common.js";
import { icon } from "./icons.js";
import { renderTimeline } from "./timeline.js";
import { renderMap } from "./map.js";
import { renderSpotCards } from "./spots.js";
import { initExperienceMotion, initIntro } from "./motion.js";

// HTML内の <span data-icon="..."> にSVGアイコンを流し込む
function hydrateIcons() {
  document.querySelectorAll("[data-icon]").forEach(el => {
    el.innerHTML = icon(el.dataset.icon);
  });
}

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} の読み込みに失敗しました (${res.status})`);
  return res.json();
}

async function init() {
  initIntro();
  hydrateIcons();
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
  const mapApi = globalThis.L ? renderMap(state) : renderMapFallback();
  renderSpotCards(state, mapApi);
  initExperienceMotion();
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
  const heroTitle = document.getElementById("hero-title");
  heroTitle.innerHTML = formatHeroTitle(state.trip.title);
  heroTitle.setAttribute("aria-label", state.trip.title);
  document.getElementById("hero-dates").textContent =
    `${fmtDate(state.trip.startDate)} 〜 ${fmtDate(state.trip.endDate)}`;

  const el = document.getElementById("countdown");
  const start = new Date(state.trip.startDate + "T00:00:00");
  const end = new Date(state.trip.endDate + "T23:59:59");

  const flipUnit = (key, label) => `
    <div class="flip-unit">
      <div class="flip" data-key="${key}">
        <div class="f-half f-top"><span></span></div>
        <div class="f-half f-bottom"><span></span></div>
        <div class="f-half f-flap-top"><span></span></div>
        <div class="f-half f-flap-bottom"><span></span></div>
      </div>
      <span class="flip-label">${label}</span>
    </div>`;

  function buildClock() {
    el.innerHTML = `
      <div class="cd-card">
        <div class="cd-big">出発まで</div>
        <div class="flip-clock">
          ${flipUnit("d", "日")}${flipUnit("h", "時間")}${flipUnit("m", "分")}${flipUnit("s", "秒")}
        </div>
      </div>
    `;
  }

  // パタパタめくれるフリップ表示の更新
  function setFlip(flip, val) {
    const prev = flip.dataset.value;
    if (prev === val) return;
    const span = sel => flip.querySelector(sel + " span");
    flip.dataset.value = val;

    if (prev === undefined) { // 初回はアニメーションなしで表示
      span(".f-top").textContent = span(".f-bottom").textContent = val;
      return;
    }
    span(".f-top").textContent = val;        // 上半分は新しい値(古い値のフラップが上に被る)
    span(".f-bottom").textContent = prev;    // 下半分はめくり終わるまで古い値
    span(".f-flap-top").textContent = prev;  // 折れていくフラップ=古い値
    span(".f-flap-bottom").textContent = val;// 開いてくるフラップ=新しい値
    flip.classList.remove("flipping");
    void flip.offsetWidth; // アニメーションを再スタートさせるためのreflow
    flip.classList.add("flipping");
    clearTimeout(flip._t);
    flip._t = setTimeout(() => {
      span(".f-bottom").textContent = val;
      flip.classList.remove("flipping");
    }, 620);
  }

  function tick() {
    const now = new Date();

    if (now > end) {
      el.innerHTML = `<div class="cd-message">最高の思い出をありがとう。また行こうね ${icon("heart")}</div>`;
      return;
    }
    if (now >= start) {
      const day = Math.floor((now - start) / 86400000) + 1;
      el.innerHTML = `<div class="cd-message">${icon("sparkles")} 旅行中。今日は Day ${day}</div>`;
      return;
    }

    if (!el.querySelector(".flip-clock")) buildClock();

    let rest = Math.floor((start - now) / 1000);
    const d = Math.floor(rest / 86400); rest %= 86400;
    const h = Math.floor(rest / 3600); rest %= 3600;
    const m = Math.floor(rest / 60);
    const s = rest % 60;
    const pad = n => String(n).padStart(2, "0");
    const values = { d: pad(d), h: pad(h), m: pad(m), s: pad(s) };
    el.querySelectorAll(".flip").forEach(f => setFlip(f, values[f.dataset.key]));

    setTimeout(tick, 1000);
  }
  tick();
}

function formatHeroTitle(title) {
  return wrapKinetic(String(title ?? "").trim());
}

function wrapKinetic(text, offset = 0) {
  return Array.from(text).map((ch, index) => {
    if (ch === " ") return " "; // 狭い画面ではここでだけ折り返せるように
    return `<span class="kinetic-char" style="--char-i:${index + offset}">${esc(ch)}</span>`;
  }).join("");
}

function renderMapFallback() {
  document.getElementById("map-filters").innerHTML = "";
  document.getElementById("map").innerHTML = `
    <div class="map-fallback">
      ${icon("map")} 地図を読み込めませんでした。スポット図鑑の「地図アプリで開く」から確認できます。
    </div>
  `;
  return {
    focusSpot() {
      const reduce = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      document.getElementById("map-section")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  };
}

init().catch(err => {
  console.error(err);
  document.getElementById("timeline-body").innerHTML =
    `<p style="text-align:center">データの読み込みに失敗しました 🙏 ローカルで見る場合は簡易サーバー(例: python -m http.server)経由で開いてください。</p>`;
});
