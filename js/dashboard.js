// dashboard.js — Redesigned: hero timer, weight centerpiece, compact trackers
// OVERDRIVE: staggered spring entry, count-up numbers, time-of-day gradient, milestone particles

import { getToday, getProfile, getDayNumber, getAllWeights, getProtocolStreak } from './store.js';
import { getCurrentPhase } from './phases.js';
import { getFeedingStatus } from './feeding.js';
import { getWaterStatus } from './water.js';
import { getWeightSummary } from './weight.js';
import { getWalkingStatus } from './walking.js';
import { predictGoalDate } from './insights.js';
import { navigateTo } from './app.js';

export function initDashboard() {
  renderMilestone();
  renderHero();
  renderWeight();
  renderCompact();
  renderStatus();
  renderPhase();
  applyStaggeredEntry();
  scheduleCountUps();
}

// ===== Direction A: Staggered spring entry =====
function applyStaggeredEntry() {
  const containers = [
    'dashboard-milestone', 'dashboard-hero', 'dashboard-weight',
    'dashboard-compact', 'dashboard-status', 'dashboard-phase'
  ];
  containers.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el || !el.firstElementChild) return;
    const child = el.firstElementChild;
    child.classList.remove('dash-enter', `dash-enter-${i + 1}`);
    // Force reflow to restart animation
    void child.offsetWidth;
    child.classList.add('dash-enter', `dash-enter-${i + 1}`);
  });
}

// ===== Direction A: Count-up animation =====
function animateCountUp(el, target, duration = 600, decimals = 1, prefix = '') {
  if (!el || isNaN(target)) return;
  const start = performance.now();
  const update = (now) => {
    const t = Math.min((now - start) / duration, 1);
    // Ease out cubic
    const ease = 1 - Math.pow(1 - t, 3);
    const current = target * ease;
    el.textContent = `${prefix}${Math.abs(current).toFixed(decimals)}`;
    if (t < 1) requestAnimationFrame(update);
    else el.textContent = `${prefix}${Math.abs(target).toFixed(decimals)}`;
  };
  requestAnimationFrame(update);
}

function scheduleCountUps() {
  // Delay count-ups to sync with stagger entry
  setTimeout(() => {
    const lostEl = document.querySelector('.dash-weight-lost');
    if (lostEl) {
      const val = parseFloat(lostEl.textContent);
      if (!isNaN(val) && val !== 0) {
        const prefix = lostEl.textContent.startsWith('-') ? '-' : '';
        animateCountUp(lostEl, Math.abs(val), 800, 1, prefix);
      }
    }
  }, 150);
}

// ===== Direction C: Time-of-day gradient =====
function getTimeOfDayClass() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'tod-morning';
  if (hour >= 12 && hour < 17) return 'tod-afternoon';
  if (hour >= 17 && hour < 21) return 'tod-evening';
  return 'tod-night';
}

function renderMilestone() {
  const el = document.getElementById('dashboard-milestone');
  const dayNum = getDayNumber();
  const profile = getProfile();
  const weights = getAllWeights();
  const totalLost = weights.length > 0 ? profile.startWeight - weights[weights.length - 1].weight : 0;
  const streak = getProtocolStreak();

  // Check for milestones worth celebrating
  let milestone = null;
  if (totalLost >= 50) milestone = { num: `${totalLost.toFixed(0)} lbs`, text: 'lost. You are rewriting your biology.' };
  else if (totalLost >= 25) milestone = { num: `${totalLost.toFixed(0)} lbs`, text: 'gone. Past the halfway mark.' };
  else if (totalLost >= 10) milestone = { num: `${totalLost.toFixed(0)} lbs`, text: 'down. The protocol is working.' };
  else if (streak >= 14) milestone = { num: `${streak} days`, text: 'protocol streak. Consistency compounds.' };
  else if (dayNum === 90) milestone = { num: 'Phase 1 Complete', text: 'Hormones re-anchored. Phase 2 begins.' };
  else if (dayNum === 7) milestone = { num: '1 week', text: 'in. The hardest part is behind you.' };

  if (milestone) {
    el.innerHTML = `<div class="milestone-banner">
      <div class="milestone-number">${milestone.num}</div>
      <div class="milestone-text">${milestone.text}</div>
    </div>`;
    // Fire particles for big milestones
    if (totalLost >= 10 || streak >= 14 || dayNum === 90) {
      fireMilestoneParticles();
    }
  } else {
    el.innerHTML = '';
  }
}

function renderHero() {
  const el = document.getElementById('dashboard-hero');
  const feeding = getFeedingStatus();
  const profile = getProfile();
  if (!profile) return;

  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const startMin = profile.feedWindowStart * 60;
  const endMin = profile.feedWindowEnd * 60;
  const totalWindow = endMin - startMin;

  let arcPct = 0;
  let arcColor = 'var(--accent)';
  let statusText = '';
  let statusBg = '';
  let statusColor = '';

  if (feeding.state === 'before') {
    arcPct = 0;
    arcColor = 'var(--accent)';
    statusText = 'FASTING';
    statusBg = 'var(--accent-dim)';
    statusColor = 'var(--accent)';
  } else if (feeding.state === 'during') {
    arcPct = (currentMin - startMin) / totalWindow;
    arcColor = 'var(--positive)';
    statusText = 'WINDOW OPEN';
    statusBg = 'var(--positive-dim)';
    statusColor = 'var(--positive)';
  } else {
    arcPct = 1;
    arcColor = 'var(--negative)';
    statusText = 'FASTING';
    statusBg = 'var(--negative-dim)';
    statusColor = 'var(--negative)';
  }

  const circumference = 2 * Math.PI * 24;
  const offset = circumference * (1 - arcPct);
  const todClass = getTimeOfDayClass();

  el.innerHTML = `<div class="dash-hero ${todClass}" data-nav="track">
    <div class="dash-hero-row">
      <div>
        <div class="dash-hero-time">${feeding.text}</div>
        <div class="dash-hero-label">${feeding.state === 'during' ? 'remaining in window' : feeding.state === 'before' ? 'until window opens' : 'fasted tonight'}</div>
      </div>
      <div class="dash-hero-arc">
        <svg viewBox="0 0 56 56">
          <circle class="arc-bg" cx="28" cy="28" r="24"/>
          <circle class="arc-fill" cx="28" cy="28" r="24" style="stroke:${arcColor};stroke-dasharray:${circumference};stroke-dashoffset:${offset}"/>
        </svg>
      </div>
    </div>
    <div class="dash-hero-status" style="background:${statusBg};color:${statusColor}">${statusText}</div>
  </div>`;

  el.querySelector('.dash-hero').onclick = () => navigateTo('track');
}

function renderWeight() {
  const el = document.getElementById('dashboard-weight');
  const profile = getProfile();
  const today = getToday();
  const weights = getAllWeights();

  if (!profile) return;

  const lastWeight = weights.length > 0 ? weights[weights.length - 1].weight : profile.startWeight;
  const totalLost = profile.startWeight - lastWeight;
  const remaining = lastWeight - profile.goalWeight;
  const predicted = predictGoalDate(weights, profile.goalWeight);

  el.innerHTML = `<div class="dash-weight" data-nav="track">
    <div class="dash-weight-lost ko-slam">${totalLost > 0 ? '-' : ''}${Math.abs(totalLost).toFixed(1)}</div>
    <div class="dash-weight-lost-label">lbs ${totalLost >= 0 ? 'lost' : 'gained'} from ${profile.startWeight}</div>
    <div class="dash-weight-row">
      <div class="dash-weight-stat">
        <div class="dash-weight-stat-val">${lastWeight.toFixed(1)}</div>
        <div class="dash-weight-stat-label">Current</div>
      </div>
      <div class="dash-weight-stat">
        <div class="dash-weight-stat-val">${remaining.toFixed(1)}</div>
        <div class="dash-weight-stat-label">To ${profile.goalWeight}</div>
      </div>
      <div class="dash-weight-stat">
        <div class="dash-weight-stat-val">${predicted || '...'}</div>
        <div class="dash-weight-stat-label">Goal date</div>
      </div>
    </div>
  </div>`;

  el.querySelector('.dash-weight').onclick = () => navigateTo('track');
}

function renderCompact() {
  const el = document.getElementById('dashboard-compact');
  const water = getWaterStatus();
  const walking = getWalkingStatus();

  el.innerHTML = `<div class="dash-compact-row">
    <div class="dash-compact" data-nav="track">
      <div class="dash-compact-label">Water</div>
      <div class="dash-compact-value text-water">${water.pct}%</div>
      <div class="dash-compact-bar"><div class="dash-compact-fill" style="width:0%;background:var(--water)"></div></div>
    </div>
    <div class="dash-compact" data-nav="track">
      <div class="dash-compact-label">Walking</div>
      <div class="dash-compact-value text-positive">${walking.pct}%</div>
      <div class="dash-compact-bar"><div class="dash-compact-fill" style="width:0%;background:var(--positive)"></div></div>
    </div>
  </div>`;

  el.querySelectorAll('.dash-compact').forEach(c => c.onclick = () => navigateTo('track'));

  // Animate progress bars from 0 to actual value
  setTimeout(() => {
    const fills = el.querySelectorAll('.dash-compact-fill');
    if (fills[0]) fills[0].style.width = water.pct + '%';
    if (fills[1]) fills[1].style.width = walking.pct + '%';
  }, 250);
}

function renderStatus() {
  const el = document.getElementById('dashboard-status');
  const today = getToday();
  const streak = getProtocolStreak();

  const sleepText = today.sleepQuality !== null ? `${'★'.repeat(today.sleepQuality)}${'☆'.repeat(5 - today.sleepQuality)}` : '—';

  el.innerHTML = `<div class="dash-status-row">
    <div class="dash-streak" data-nav="track">
      <div class="dash-streak-num" style="color:${streak > 0 ? 'var(--accent)' : 'var(--text-muted)'}">${streak}</div>
      <div class="dash-streak-label">Protocol streak</div>
    </div>
    <div class="dash-streak" data-nav="track">
      <div class="dash-streak-num" style="color:var(--text-dim)">${sleepText}</div>
      <div class="dash-streak-label">Sleep</div>
    </div>
  </div>`;

  el.querySelectorAll('.dash-streak').forEach(c => c.onclick = () => navigateTo('track'));
}

function renderPhase() {
  const el = document.getElementById('dashboard-phase');
  const phase = getCurrentPhase();
  const phaseColors = { 1: 'var(--phase1)', 2: 'var(--phase2)', 3: 'var(--phase3)' };
  const color = phaseColors[phase.index] || 'var(--accent)';

  el.innerHTML = `<div class="phase-strip">
    <div class="phase-dot" style="background:${color}"></div>
    <div class="phase-info">
      <div class="phase-name">Phase ${phase.index}: ${phase.name}</div>
      <div class="phase-meta">Day ${phase.daysIn} of ${phase.totalDays || '—'}</div>
      <div class="phase-bar"><div class="phase-bar-fill" style="width:0%;background:${color}"></div></div>
    </div>
  </div>`;

  // Animate phase bar
  setTimeout(() => {
    const fill = el.querySelector('.phase-bar-fill');
    if (fill) fill.style.width = phase.pct + '%';
  }, 350);
}

// ===== Direction C: Milestone particles =====
function fireMilestoneParticles() {
  const canvas = document.getElementById('milestone-particles');
  if (!canvas) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

  const colors = ['#ffd700', '#ffe44d', '#00ff41', '#00d4ff', '#ff1a5e', '#fff'];
  const particles = [];

  for (let i = 0; i < 40; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 100,
      y: canvas.height * 0.3,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 10 - 3,
      size: Math.random() * 5 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      decay: 0.008 + Math.random() * 0.008,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      if (p.life <= 0) return;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // gravity
      p.vx *= 0.99; // air resistance
      p.life -= p.decay;
      p.rotation += p.rotSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      // Mix of circles and small rectangles (confetti-like)
      if (p.size > 4) {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    if (alive) requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  requestAnimationFrame(animate);
}
