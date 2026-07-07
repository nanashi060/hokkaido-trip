import { CATEGORIES, categoryOf, esc, reveal } from "./common.js";
import { icon } from "./icons.js";

export function renderSpotCards(state, mapApi) {
  const grid = document.getElementById("spot-grid");
  const spots = state.spots;

  grid.innerHTML = spots.map(spot => renderCard(spot)).join("");
  reveal(grid.querySelectorAll(".spot-card"));

  // 「旅マップで見る」→ 地図セクションへスクロールして該当ピンにズーム
  grid.querySelectorAll("[data-fly-to]").forEach(a => {
    a.addEventListener("click", () => mapApi?.focusSpot(a.dataset.flyTo));
  });

  renderFilters(state, grid);
}

function renderFilters(state, grid) {
  const el = document.getElementById("spot-filters");
  const used = [...new Set(state.spots.map(s => s.category))];

  el.innerHTML = `
    <button class="map-filter active" data-cat="all" style="--chip-color:#3D3A38">ぜんぶ</button>
    ${used.map(key => {
      const cat = CATEGORIES[key] || { label: key, icon: "map-pin", color: "#868E96" };
      return `<button class="map-filter" data-cat="${esc(key)}" style="--chip-color:${cat.color}">${icon(cat.icon)} ${cat.label}</button>`;
    }).join("")}
  `;

  el.querySelectorAll(".map-filter").forEach(btn => {
    btn.addEventListener("click", () => {
      el.querySelectorAll(".map-filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const sel = btn.dataset.cat;
      grid.querySelectorAll(".spot-card").forEach(card => {
        card.classList.toggle("hidden", sel !== "all" && card.dataset.cat !== sel);
      });
    });
  });
}

function renderCard(spot) {
  const cat = categoryOf(spot);
  const gmap = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.name + " " + spot.area)}`;

  const photo = spot.photo
    ? `<div class="spot-photo"><img src="${esc(spot.photo)}" alt="${esc(spot.name)}" loading="lazy"></div>`
    : `<div class="spot-photo" style="--photo-bg:${cat.bg}; color:${cat.color}">${icon(cat.icon)}</div>`;

  const meta = [
    spot.hours ? `<div><span>${icon("clock")}</span><span>${esc(spot.hours)}</span></div>` : "",
    spot.budget ? `<div><span>${icon("wallet")}</span><span>${esc(spot.budget)}</span></div>` : ""
  ].join("");

  const links = [
    `<a href="#map-section" data-fly-to="${esc(spot.id)}">${icon("compass")} 旅マップで見る</a>`,
    spot.links?.official ? `<a href="${esc(spot.links.official)}" target="_blank" rel="noopener">${icon("external-link")} 公式サイト</a>` : "",
    `<a href="${gmap}" target="_blank" rel="noopener">${icon("navigation")} 地図アプリで開く</a>`
  ].join("");

  return `
    <article class="spot-card" id="spot-${esc(spot.id)}" data-cat="${esc(spot.category)}">
      ${photo}
      <div class="spot-body">
        <div class="spot-tags">
          <span class="spot-tag" style="--tag-color:${cat.color}">${icon(cat.icon)} ${cat.label}</span>
          <span class="spot-tag area">${icon("map-pin")} ${esc(spot.area)}</span>
        </div>
        <h3 class="spot-name">${esc(spot.name)}</h3>
        <p class="spot-catch">${esc(spot.catchcopy)}</p>
        ${meta ? `<div class="spot-meta">${meta}</div>` : ""}
        ${spot.memo ? `<div class="spot-memo">${icon("pencil-line")} ${esc(spot.memo)}</div>` : ""}
        <div class="spot-links">${links}</div>
      </div>
    </article>`;
}
