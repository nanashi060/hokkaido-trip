import { categoryOf, esc } from "./common.js";

export function renderMap(state) {
  const map = L.map("map", { scrollWheelZoom: false });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19
  }).addTo(map);

  // 各スポットを「最初に登場する日」に割り当てて色分けする
  const spotFirstDay = new Map();
  for (const sched of state.itinerary.schedule) {
    for (const item of sched.items) {
      if (item.spotId && !spotFirstDay.has(item.spotId)) {
        spotFirstDay.set(item.spotId, sched.day);
      }
    }
  }

  const dayLayers = new Map();  // day -> LayerGroup(ピン+ルート線)
  const dayBounds = new Map();  // day -> LatLngBounds
  const markerById = new Map(); // spotId -> { marker, day }

  for (const day of state.trip.days) {
    const group = L.layerGroup();
    const sched = state.itinerary.schedule.find(s => s.day === day.day);
    const route = [];

    for (const item of sched?.items ?? []) {
      const spot = item.spotId && state.spotById.get(item.spotId);
      if (!spot) continue;
      route.push([spot.lat, spot.lng]);

      if (spotFirstDay.get(spot.id) === day.day && !group._pinIds?.has(spot.id)) {
        (group._pinIds ??= new Set()).add(spot.id);
        const cat = categoryOf(spot);
        const icon = L.divIcon({
          className: "",
          html: `<div class="map-pin" style="--pin-color:${esc(day.theme)}"><span>${cat.icon}</span></div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 32],
          popupAnchor: [0, -30]
        });
        const marker = L.marker([spot.lat, spot.lng], { icon })
          .bindPopup(`
            <div class="map-popup-name">${cat.icon} ${esc(spot.name)}</div>
            <div>${esc(spot.catchcopy)}</div>
            <a class="map-popup-link" href="#spot-${esc(spot.id)}">詳細を見る →</a>
          `)
          .addTo(group);
        markerById.set(spot.id, { marker, day: day.day });
      }
    }

    if (route.length >= 2) {
      L.polyline(route, {
        color: day.theme, weight: 4, opacity: 0.7, dashArray: "8 10"
      }).addTo(group);
    }
    if (route.length) dayBounds.set(day.day, L.latLngBounds(route));

    group.addTo(map);
    dayLayers.set(day.day, group);
  }

  const allBounds = [...dayBounds.values()]
    .reduce((acc, b) => acc ? acc.extend(b) : L.latLngBounds(b.getSouthWest(), b.getNorthEast()), null);
  if (allBounds) map.fitBounds(allBounds, { padding: [40, 40] });

  renderFilters(state, map, dayLayers, dayBounds, allBounds);

  // スポットカードから地図に飛ぶためのAPI
  return {
    focusSpot(spotId) {
      const spot = state.spotById.get(spotId);
      const entry = markerById.get(spotId);
      if (!spot) return;
      map.flyTo([spot.lat, spot.lng], 14, { duration: 1.1 });
      if (entry && map.hasLayer(dayLayers.get(entry.day))) {
        setTimeout(() => entry.marker.openPopup(), 1200);
      }
    }
  };
}

function renderFilters(state, map, dayLayers, dayBounds, allBounds) {
  const el = document.getElementById("map-filters");
  el.innerHTML = `
    <button class="map-filter active" data-day="all" style="--chip-color:#3D3A38">ぜんぶ</button>
    ${state.trip.days.map(d => `
      <button class="map-filter" data-day="${d.day}" style="--chip-color:${esc(d.theme)}">Day ${d.day}</button>
    `).join("")}
  `;

  el.querySelectorAll(".map-filter").forEach(btn => {
    btn.addEventListener("click", () => {
      el.querySelectorAll(".map-filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const sel = btn.dataset.day;

      for (const [day, group] of dayLayers) {
        const show = sel === "all" || Number(sel) === day;
        if (show) group.addTo(map);
        else map.removeLayer(group);
      }

      const bounds = sel === "all" ? allBounds : dayBounds.get(Number(sel));
      if (bounds) map.fitBounds(bounds, { padding: [40, 40] });
    });
  });
}
