const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

/* ---------- Preloader ---------- */
const preloader = document.getElementById('preloader');
const loaderCount = document.getElementById('loaderCount');

function finishLoading() {
  root.classList.remove('is-loading');
  root.classList.add('is-loaded');
  startCounters(document.querySelector('.bento'));
}

let seenIntro = false;
try { seenIntro = sessionStorage.getItem('introSeen') === '1'; } catch (e) {}

if (reduceMotion || seenIntro) {
  preloader.classList.add('is-gone');
  requestAnimationFrame(finishLoading);
} else {
  root.classList.add('is-loading');
  requestAnimationFrame(() => preloader.classList.add('is-in'));
  const duration = 1400;
  const start = performance.now();
  const counter = setInterval(() => {
    const p = clamp((performance.now() - start) / duration);
    loaderCount.textContent = Math.round((1 - Math.pow(1 - p, 3)) * 100);
    if (p >= 1) clearInterval(counter);
  }, 30);
  // Finish on timers (not rAF) so the intro can never get stuck
  setTimeout(() => {
    clearInterval(counter);
    loaderCount.textContent = '100';
    preloader.classList.add('is-done');
    try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
  }, duration + 200);
  setTimeout(finishLoading, duration + 450);
  setTimeout(() => preloader.classList.add('is-gone'), duration + 1300);
}

/* ---------- Theme ---------- */
document.getElementById('themeToggle').addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {}
});

/* ---------- Role rotator ---------- */
const rotatorList = document.querySelector('.rotator__list');
const roles = rotatorList.children.length;
let roleIndex = 0;
if (!reduceMotion) {
  setInterval(() => {
    roleIndex = (roleIndex + 1) % roles;
    rotatorList.style.transform = `translateY(${-roleIndex * 1.5}em)`;
  }, 2600);
}

/* ---------- Mobile menu ---------- */
const menu = document.getElementById('menu');
const menuBtn = document.getElementById('menuBtn');
function setMenu(open) {
  menu.classList.toggle('is-open', open);
  menu.setAttribute('aria-hidden', String(!open));
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.style.overflow = open ? 'hidden' : '';
}
menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

/* ---------- Nav indicator + active section ---------- */
const navLinks = [...document.querySelectorAll('#navLinks a')];
const indicator = document.getElementById('navIndicator');
function moveIndicator(link) {
  if (!link) { indicator.style.opacity = '0'; return; }
  indicator.style.opacity = '1';
  indicator.style.width = link.offsetWidth + 'px';
  indicator.style.transform = `translateX(${link.offsetLeft}px)`;
}
let activeLink = null;
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    activeLink = navLinks.find((a) => a.getAttribute('href') === '#' + entry.target.id) || null;
    navLinks.forEach((a) => a.classList.toggle('is-active', a === activeLink));
    moveIndicator(activeLink);
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main section[id]').forEach((s) => sectionObserver.observe(s));
navLinks.forEach((a) => {
  a.addEventListener('mouseenter', () => moveIndicator(a));
  a.addEventListener('mouseleave', () => moveIndicator(activeLink));
});
window.addEventListener('resize', () => moveIndicator(activeLink));

/* ---------- Reveal on scroll ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-in');
    startCounters(entry.target);
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
document.querySelectorAll('.reveal, .pcard').forEach((el) => revealObserver.observe(el));

/* ---------- Counters ---------- */
function startCounters(scope) {
  if (!scope) return;
  scope.querySelectorAll('[data-count]').forEach((el) => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = +el.dataset.count;
    const pad = +(el.dataset.pad || 0);
    const fmt = (n) => String(n).padStart(pad, '0');
    if (reduceMotion) { el.textContent = fmt(target); return; }
    const start = performance.now();
    const dur = 1600;
    (function step(now) {
      const p = clamp((now - start) / dur);
      el.textContent = fmt(Math.round((1 - Math.pow(1 - p, 4)) * target));
      if (p < 1) requestAnimationFrame(step);
    })(start);
  });
}

/* ---------- About statement: word-by-word highlight ---------- */
const statement = document.getElementById('statement');
const words = statement.textContent.trim().split(/\s+/);
statement.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
const wordEls = [...statement.querySelectorAll('.w')];

/* ---------- Scroll-driven effects ---------- */
const nav = document.getElementById('nav');
const progress = document.getElementById('progress');
const cards = [...document.querySelectorAll('.pcard')];
const timeline = document.getElementById('timeline');
const stackMQ = window.matchMedia('(min-width: 901px)');

let ticking = false;
function onScroll() {
  const y = window.scrollY;
  const vh = window.innerHeight;
  const max = document.documentElement.scrollHeight - vh;

  nav.classList.toggle('is-scrolled', y > 20);
  progress.style.setProperty('--p', max > 0 ? y / max : 0);

  // Stacked project cards shrink as the next one slides over
  if (stackMQ.matches) {
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      const r = card.getBoundingClientRect();
      const nr = next.getBoundingClientRect();
      card.style.setProperty('--p', clamp((r.bottom - nr.top) / r.height).toFixed(3));
    });
  }

  // Statement words light up
  const sr = statement.getBoundingClientRect();
  const sp = clamp((vh * 0.8 - sr.top) / (sr.height + vh * 0.3));
  const lit = Math.round(sp * wordEls.length);
  wordEls.forEach((w, i) => w.classList.toggle('on', i < lit));

  // Timeline line fills
  const tr = timeline.getBoundingClientRect();
  timeline.style.setProperty('--tl', clamp((vh * 0.6 - tr.top) / tr.height).toFixed(3));

  ticking = false;
}
window.addEventListener('scroll', () => {
  if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
}, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

/* ---------- Pointer effects (desktop only) ---------- */
if (finePointer && !reduceMotion) {
  // Custom cursor
  const cursor = document.getElementById('cursor');
  let cx = 0, cy = 0, tx = 0, ty = 0;
  window.addEventListener('mousemove', (e) => {
    tx = e.clientX; ty = e.clientY;
    cursor.classList.add('is-on');
  });
  document.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));
  (function loop() {
    cx += (tx - cx) * 0.2;
    cy += (ty - cy) * 0.2;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('a, button, .tags--lg li').forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
  });

  // Magnetic buttons
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.3}px, ${y * 0.4}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });

  // Spotlight cards
  document.querySelectorAll('.spot').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // Portrait tilt
  const portrait = document.getElementById('portrait');
  const frame = document.getElementById('portraitFrame');
  portrait.addEventListener('mousemove', (e) => {
    const r = frame.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    frame.style.transform = `rotateY(${(px - 0.5) * 12}deg) rotateX(${(0.5 - py) * 12}deg)`;
    frame.style.setProperty('--sx', `${px * 100}%`);
    frame.style.setProperty('--sy', `${py * 100}%`);
  });
  portrait.addEventListener('mouseleave', () => { frame.style.transform = ''; });

  // Hero aurora follows the pointer a little
  const aurora = document.querySelector('.hero .aurora');
  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 40;
    const y = (e.clientY / window.innerHeight - 0.5) * 40;
    aurora.style.transform = `translate(${x}px, ${y}px)`;
  });
}

/* ---------- Dhaka clock ---------- */
const clock = document.getElementById('clock');
const clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' });
function updateClock() { clock.textContent = clockFmt.format(new Date()); }
updateClock();
setInterval(updateClock, 15000);

/* ---------- Copy email ---------- */
const toast = document.getElementById('toast');
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2200);
}
document.getElementById('copyEmail').addEventListener('click', async (e) => {
  const email = e.currentTarget.dataset.email;
  try {
    await navigator.clipboard.writeText(email);
    showToast('Email copied to clipboard');
  } catch (err) {
    window.location.href = 'mailto:' + email;
  }
});

document.getElementById('year').textContent = new Date().getFullYear();
