import { icon } from "./icons.js";

const reduceMotion = () =>
  globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

// オープニング演出の後片付け。intro-leaveの終了でオーバーレイを外し、
// 止めていたヒーローの登場アニメを再開させる(3秒の保険タイマーつき)
export function initIntro() {
  const intro = document.getElementById("intro");
  const root = document.documentElement;
  if (!intro) return;
  if (!root.classList.contains("intro-play")) {
    intro.remove();
    return;
  }

  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    intro.remove();
    root.classList.remove("intro-play");
  };

  intro.addEventListener("animationend", event => {
    if (event.target === intro) done();
  });
  setTimeout(done, 3000);
}

export function initExperienceMotion() {
  document.body.classList.add("motion-ready");
  seedRevealMotion();
  initBookmarkPages();
  initSkyCanvas();
  initHeroParallax();
  initTiltCards();
  initMagneticControls();
  initDayBursts();
  initSpotFocusMotion();
  initShimaenaga();
}

// フッターのシマエナガ: クリックでぴょんと跳ねてハートを飛ばす
function initShimaenaga() {
  const bird = document.getElementById("shimaenaga");
  if (!bird) return;

  bird.addEventListener("click", () => {
    if (reduceMotion()) return;
    bird.classList.remove("hop");
    void bird.offsetWidth;
    bird.classList.add("hop");

    for (let i = 0; i < 3; i += 1) {
      const heart = document.createElement("span");
      heart.className = "se-heart";
      heart.innerHTML = icon("heart");
      heart.style.setProperty("--hx", `${(i - 1) * 11}px`);
      heart.style.animationDelay = `${i * 90}ms`;
      bird.append(heart);
      setTimeout(() => heart.remove(), 1100 + i * 90);
    }
  });

  bird.addEventListener("animationend", event => {
    if (event.animationName === "se-hop") bird.classList.remove("hop");
  });
}

function seedRevealMotion() {
  const targets = document.querySelectorAll(
    ".section-heading, .day-tabs, .day-header, #map, .map-filters, .spot-filters"
  );
  targets.forEach((el, index) => {
    el.classList.add("motion-reveal");
    el.style.setProperty("--reveal-index", String(index % 6));
  });

  if (!("IntersectionObserver" in window) || reduceMotion()) {
    targets.forEach(el => el.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in-view");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });

  targets.forEach(el => observer.observe(el));
}

function initBookmarkPages() {
  const pages = [...document.querySelectorAll(".travel-page")];
  if (!pages.length) return;

  const navLinks = [...document.querySelectorAll(".nav-links a")];
  const setActive = page => {
    pages.forEach(el => el.classList.toggle("page-active", el === page));
    navLinks.forEach(link => {
      link.classList.toggle("active", page ? link.hash === `#${page.id}` : false);
    });
  };

  if (!("IntersectionObserver" in window) || reduceMotion()) {
    pages.forEach(page => page.classList.add("page-in-view"));
    setActive(pages[0]);
    return;
  }

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("page-in-view");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -10% 0px" });

  const ratios = new Map(pages.map(page => [page, 0]));
  const activeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
    });

    const active = [...ratios.entries()]
      .sort((a, b) => b[1] - a[1])
      .find(([, ratio]) => ratio > 0.02)?.[0] ?? null;
    setActive(active);
  }, {
    threshold: [0.02, 0.16, 0.32, 0.48, 0.64],
    rootMargin: "-24% 0px -42% 0px"
  });

  pages.forEach(page => {
    revealObserver.observe(page);
    activeObserver.observe(page);
  });
}

function initSkyCanvas() {
  const canvas = document.getElementById("sky-canvas");
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const hero = canvas.closest(".hero");
  let width = 0;
  let height = 0;
  let raf = 0;
  let last = 0;
  let phase = 0;
  const reduced = reduceMotion();
  const strands = Array.from({ length: 3 }, (_, i) => ({
    y: 0.22 + i * 0.26,
    amp: 16 + i * 7,
    speed: 0.22 + i * 0.05,
    hue: i % 2 ? "rgba(255, 189, 74, 0.11)" : "rgba(68, 179, 194, 0.11)"
  }));

  function resize() {
    const rect = hero?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    width = Math.max(320, rect.width);
    height = Math.max(420, rect.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawRibbon(item, i) {
    const yBase = height * item.y;
    ctx.beginPath();
    for (let x = -60; x <= width + 60; x += 34) {
      const wave = Math.sin((x * 0.012) + phase * item.speed + i) * item.amp;
      const y = yBase + wave + Math.cos(phase * 0.7 + i) * 8;
      if (x === -60) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = 6 + (i % 3) * 2;
    ctx.strokeStyle = item.hue;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function frame(now = 0) {
    const delta = Math.min((now - last) / 1000 || 0.016, 0.04);
    last = now;
    phase += delta;
    ctx.clearRect(0, 0, width, height);

    const sky = ctx.createLinearGradient(0, 0, width, height);
    sky.addColorStop(0, "rgba(255,255,255,0.22)");
    sky.addColorStop(0.45, "rgba(130,215,224,0.16)");
    sky.addColorStop(1, "rgba(255,192,91,0.14)");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    strands.forEach(drawRibbon);

    if (!reduced) raf = requestAnimationFrame(frame);
  }

  resize();
  frame();

  if (!reduced) {
    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
    if (resizeObserver && hero) resizeObserver.observe(hero);
    else globalThis.addEventListener("resize", resize, { passive: true });
  }
}

function initHeroParallax() {
  const hero = document.querySelector(".hero");
  const cards = [...document.querySelectorAll(".photo-card")];
  if (!hero || !cards.length || reduceMotion()) return;

  let pointerX = 0;
  let pointerY = 0;
  let raf = 0;

  function apply() {
    raf = 0;
    const rect = hero.getBoundingClientRect();
    const x = (pointerX - rect.left) / rect.width - 0.5;
    const y = (pointerY - rect.top) / rect.height - 0.5;
    hero.style.setProperty("--hero-x", x.toFixed(3));
    hero.style.setProperty("--hero-y", y.toFixed(3));

    cards.forEach((card, index) => {
      const depth = index === 0 ? 1.3 : 0.85;
      card.style.setProperty("--tilt-x", `${(-y * 8 * depth).toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${(x * 10 * depth).toFixed(2)}deg`);
      card.style.setProperty("--slide-x", `${(x * 18 * depth).toFixed(1)}px`);
      card.style.setProperty("--slide-y", `${(y * 14 * depth).toFixed(1)}px`);
    });
  }

  hero.addEventListener("pointermove", event => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!raf) raf = requestAnimationFrame(apply);
  }, { passive: true });

  hero.addEventListener("pointerleave", () => {
    hero.style.setProperty("--hero-x", "0");
    hero.style.setProperty("--hero-y", "0");
    cards.forEach(card => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
      card.style.setProperty("--slide-x", "0px");
      card.style.setProperty("--slide-y", "0px");
    });
  });
}

function initTiltCards() {
  if (reduceMotion()) return;
  const selector = ".spot-card, .tl-card";

  document.addEventListener("pointermove", event => {
    const card = event.target.closest(selector);
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty("--tilt-y", `${(x * 7).toFixed(2)}deg`);
    card.style.setProperty("--tilt-x", `${(-y * 6).toFixed(2)}deg`);
    card.style.setProperty("--shine-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    card.style.setProperty("--shine-y", `${((y + 0.5) * 100).toFixed(1)}%`);
  }, { passive: true });

  document.addEventListener("pointerout", event => {
    const card = event.target.closest(selector);
    if (!card || card.contains(event.relatedTarget)) return;
    card.style.setProperty("--tilt-y", "0deg");
    card.style.setProperty("--tilt-x", "0deg");
  });
}

function initMagneticControls() {
  if (reduceMotion() || globalThis.matchMedia?.("(pointer: coarse)")?.matches) return;
  const selector = ".btn, .day-tab, .map-filter";
  let active = null;
  let nextX = 0;
  let nextY = 0;
  let raf = 0;

  function apply() {
    raf = 0;
    if (!active) return;
    active.style.setProperty("--mag-x", `${nextX.toFixed(1)}px`);
    active.style.setProperty("--mag-y", `${nextY.toFixed(1)}px`);
  }

  document.addEventListener("pointermove", event => {
    const el = event.target.closest(selector);
    if (!el) return;
    active = el;
    const rect = el.getBoundingClientRect();
    nextX = ((event.clientX - rect.left) / rect.width - 0.5) * 2.4;
    nextY = ((event.clientY - rect.top) / rect.height - 0.5) * 1.8;
    if (!raf) raf = requestAnimationFrame(apply);
  }, { passive: true });

  document.addEventListener("pointerout", event => {
    const el = event.target.closest(selector);
    if (!el || el.contains(event.relatedTarget)) return;
    if (active === el) active = null;
    el.style.setProperty("--mag-x", "0px");
    el.style.setProperty("--mag-y", "0px");
  });
}

function initDayBursts() {
  document.addEventListener("daychange", event => {
    const target = document.getElementById("day-header");
    if (!target || reduceMotion()) return;
    target.classList.remove("day-swap");
    void target.offsetWidth;
    target.classList.add("day-swap");
    createBurst(target, event.detail?.theme || "#e85d45");
  });
}

function createBurst(target, color) {
  const burst = document.createElement("span");
  burst.className = "motion-burst";
  burst.style.setProperty("--burst-color", color);
  for (let i = 0; i < 12; i += 1) {
    const shard = document.createElement("span");
    shard.className = "burst-shard";
    shard.style.setProperty("--i", String(i));
    burst.append(shard);
  }
  target.append(burst);
  setTimeout(() => burst.remove(), 900);
}

function initSpotFocusMotion() {
  document.addEventListener("click", event => {
    const link = event.target.closest("[data-fly-to]");
    if (!link) return;
    const card = document.getElementById(`spot-${safeCssId(link.dataset.flyTo)}`);
    if (!card || reduceMotion()) return;
    card.classList.remove("spot-pulse");
    void card.offsetWidth;
    card.classList.add("spot-pulse");
  });
}

function safeCssId(value) {
  return globalThis.CSS?.escape
    ? CSS.escape(String(value))
    : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
