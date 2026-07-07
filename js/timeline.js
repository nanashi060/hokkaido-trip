import { categoryOf, esc, fmtDate, reveal, transportIcon } from "./common.js";
import { icon } from "./icons.js";

export function renderTimeline(state, currentDay) {
  const tabsEl = document.getElementById("day-tabs");
  const days = state.trip.days;

  tabsEl.innerHTML = days.map(d => `
    <button class="day-tab" role="tab" data-day="${d.day}" style="--tab-color:${esc(d.theme)}">
      Day ${d.day}
      <small>${fmtDate(d.date)}・${esc(d.area)}</small>
    </button>
  `).join("");

  tabsEl.querySelectorAll(".day-tab").forEach(btn => {
    btn.addEventListener("click", () => selectDay(state, Number(btn.dataset.day)));
  });

  // 旅行当日ならその日をハイライト&自動選択
  if (currentDay) {
    tabsEl.querySelector(`[data-day="${currentDay}"]`)?.classList.add("today");
  }
  selectDay(state, currentDay || 1);
}

function selectDay(state, dayNum) {
  const day = state.trip.days.find(d => d.day === dayNum);
  if (!day) return;

  document.documentElement.style.setProperty("--day-color", day.theme);

  document.querySelectorAll(".day-tab").forEach(btn => {
    btn.classList.toggle("active", Number(btn.dataset.day) === dayNum);
  });

  document.getElementById("day-header").innerHTML = `
    <span class="dh-area">${fmtDate(day.date)} ・ ${esc(day.area)}</span>
    <div class="dh-title">${esc(day.title)}</div>
    ${day.tentative ? `<div class="dh-tentative">${icon("construction")} この日はまだ計画中です</div>` : ""}
  `;

  const sched = state.itinerary.schedule.find(s => s.day === dayNum);
  const items = sched ? sched.items : [];
  const body = document.getElementById("timeline-body");
  body.innerHTML = items.map(item => renderItem(state, item)).join("");
  reveal(body.querySelectorAll(".tl-item"));
  document.dispatchEvent(new CustomEvent("daychange", { detail: { day: dayNum, theme: day.theme } }));
}

function renderItem(state, item) {
  const time = item.time ? esc(item.time) : "";

  if (item.type === "move") {
    return `
      <div class="tl-item move">
        <div class="tl-time">${time}</div>
        <div class="tl-dot">${icon(transportIcon(item.method))}</div>
        <div class="tl-card">
          <div class="tl-move-text">${esc(item.method)}・${esc(item.duration)}: ${esc(item.note)}</div>
        </div>
      </div>`;
  }

  if (item.type === "tbd") {
    return `
      <div class="tl-item tbd">
        <div class="tl-time">${time}</div>
        <div class="tl-dot">${icon("construction")}</div>
        <div class="tl-card">${esc(item.note)}</div>
      </div>`;
  }

  const spot = state.spotById.get(item.spotId);
  if (!spot) return "";
  const cat = categoryOf(spot);
  const label = item.label || spot.name;
  const showSpotName = item.label && item.label !== spot.name;

  return `
    <div class="tl-item">
      <div class="tl-time">${time}</div>
      <div class="tl-dot">${icon(cat.icon)}</div>
      <div class="tl-card">
        <div class="tl-name">${esc(label)}</div>
        ${showSpotName ? `<div class="tl-spotname">${icon("map-pin")} ${esc(spot.name)}</div>` : ""}
        ${item.note ? `<div class="tl-note">${esc(item.note)}</div>` : ""}
        <a class="tl-link" href="#spot-${esc(spot.id)}">詳細を見る →</a>
      </div>
    </div>`;
}
