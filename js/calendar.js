// calendar.js — Streak calendar view

import { getDay, getDayIndex, getProfile, todayString } from './store.js';
import { navigateTo, navigateToDate } from './app.js';

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

export function initCalendar() {
  // Reset to current month/year every time calendar is opened
  const now = new Date();
  currentMonth = now.getMonth();
  currentYear = now.getFullYear();

  renderCalendar();
  document.getElementById('cal-prev').onclick = () => { prevMonth(); renderCalendar(); };
  document.getElementById('cal-next').onclick = () => { nextMonth(); renderCalendar(); };

  const todayBtn = document.getElementById('cal-today');
  if (todayBtn) {
    todayBtn.onclick = () => {
      const now = new Date();
      currentMonth = now.getMonth();
      currentYear = now.getFullYear();
      renderCalendar();
    };
  }
}

function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
}

function renderCalendar() {
  const label = document.getElementById('cal-month-label');
  const grid = document.getElementById('calendar-grid');
  const detail = document.getElementById('calendar-detail');
  detail.classList.add('hidden');

  const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  label.textContent = monthName;

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = todayString();

  let html = '';
  // Day headers
  const headers = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  headers.forEach(h => { html += `<div class="cal-header">${h}</div>`; });

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="cal-day empty"></div>';
  }

  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === today;
    const dayData = getDay(dateStr);
    const score = getDayScore(dayData);

    html += `<div class="cal-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
      <span>${d}</span>
      <div class="cal-dots">${score.dots}</div>
    </div>`;
  }

  grid.innerHTML = html;

  // Bind day clicks
  grid.querySelectorAll('.cal-day:not(.empty)').forEach(el => {
    el.onclick = () => showDayDetail(el.dataset.date);
  });
}

function getDayScore(day) {
  // New streak criteria: walk 60+, weigh-in, water 1500+, morning check-in
  const checks = [
    day.walkingMin >= 60,
    day.weight !== null,
    day.waterMl >= 1500,
    day.morningCheckinDone === true,
    day.stayedLowCarb === true
  ];

  const done = checks.filter(c => c === true).length;
  const total = 5;

  let dots = '';
  const colors = ['var(--positive)', 'var(--accent)', 'var(--water)', 'var(--accent)', 'var(--positive)'];

  for (let i = 0; i < total; i++) {
    const color = checks[i] ? colors[i] : 'var(--text-muted)';
    dots += `<div class="cal-dot-sm" style="background:${color}"></div>`;
  }

  return { done, dots };
}

function showDayDetail(dateStr) {
  const detail = document.getElementById('calendar-detail');
  const day = getDay(dateStr);
  const profile = getProfile();
  const date = new Date(dateStr + 'T00:00:00');
  const formatted = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  let html = `<h3>${formatted}</h3>`;

  const rows = [
    { label: 'Morning Check-in', value: day.morningCheckinDone ? '✓ Done' : '— Not done' },
    { label: 'Low-Carb', value: day.stayedLowCarb === true ? '✓ Yes' : day.stayedLowCarb === false ? '✗ No' : '— Not recorded' },
    { label: 'Weight', value: day.weight !== null ? `${day.weight} lbs` : '— Not logged' },
    { label: 'Water', value: `${day.waterMl.toLocaleString()} / ${(profile.waterGoalMl || 3000).toLocaleString()} ml` },
    { label: 'Walking', value: `${day.walkingMin} / ${profile.walkGoalMin || 90} min` },
    { label: 'Sleep', value: day.sleepQuality !== null ? `${'★'.repeat(day.sleepQuality)}${'☆'.repeat(5 - day.sleepQuality)}` : '— Not rated' }
  ];

  rows.forEach(r => {
    html += `<div class="detail-row"><span>${r.label}</span><span>${r.value}</span></div>`;
  });

  html += `<button class="btn btn-primary cal-edit-btn" id="cal-edit-day" style="margin-top:12px;width:100%">Edit this day</button>`;

  detail.innerHTML = html;
  detail.classList.remove('hidden');

  // Scroll detail into view so user sees it
  setTimeout(() => detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);

  document.getElementById('cal-edit-day').onclick = () => {
    navigateToDate(dateStr);
  };
}
