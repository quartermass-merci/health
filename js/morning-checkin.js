// morning-checkin.js — Morning goal-setting exercise
// Static HTML in index.html, JS binds to existing DOM elements.

import { getActiveDay, saveActiveDay, getDay, saveDay, yesterdayStr, getCarbStreak, getRecentDays } from './store.js';
import { getCarbInsight } from './insights.js';
import { showInlineInsight } from './app.js';

const answers = {};

export function initMorningCheckin() {
  const today = getActiveDay();
  const streak = getCarbStreak();

  // Update streak display
  const streakEl = document.getElementById('mc-streak');
  if (streakEl) streakEl.textContent = streak;

  // Update carb dots
  const dotsEl = document.getElementById('mc-carb-dots');
  if (dotsEl) {
    const recent = getRecentDays(30);
    dotsEl.innerHTML = recent.map(d => {
      const cls = d.stayedLowCarb === true ? 'yes' : d.stayedLowCarb === false ? 'no' : '';
      return `<div class="carb-dot ${cls}"></div>`;
    }).join('');
  }

  // Check if already done
  if (today.morningCheckinDone && today.morningCheckin) {
    showDoneState(today.morningCheckin, streak);
    return;
  }

  // Show questions, hide done state
  document.getElementById('mc-questions').classList.remove('hidden');
  document.getElementById('mc-done-state').classList.add('hidden');
  document.getElementById('morning-checkin-save').classList.remove('hidden');

  // Clear previous selections
  document.querySelectorAll('.mc-selected').forEach(el => el.classList.remove('mc-selected'));
  Object.keys(answers).forEach(k => delete answers[k]);

  // Bind all buttons
  bindBtn('mc-lowcarb-yes', 'lowCarbYesterday', true);
  bindBtn('mc-lowcarb-no', 'lowCarbYesterday', false);
  bindBtn('mc-after6-yes', 'ateAfterSixPm', true);
  bindBtn('mc-after6-no', 'ateAfterSixPm', false);
  bindBtn('mc-hunger-yes', 'fightFeedingSignals', true);
  bindBtn('mc-hunger-no', 'fightFeedingSignals', false);
  bindBtn('mc-feel-great', 'feeling', 'great');
  bindBtn('mc-feel-good', 'feeling', 'good');
  bindBtn('mc-feel-okay', 'feeling', 'okay');
  bindBtn('mc-feel-tough', 'feeling', 'tough');
  bindBtn('mc-feel-rough', 'feeling', 'rough');
  bindBtn('mc-commit', 'committedToday', true);

  // Save button
  document.getElementById('morning-checkin-save').onclick = saveMorningCheckin;
}

function bindBtn(id, key, value) {
  const el = document.getElementById(id);
  if (!el) return;
  // Remove old listeners by replacing with clone
  const fresh = el.cloneNode(true);
  el.parentNode.replaceChild(fresh, el);

  fresh.onclick = function () {
    answers[key] = value;

    // Deselect siblings with same key, select this one
    const parent = fresh.parentElement;
    if (parent) {
      parent.querySelectorAll('button').forEach(b => b.classList.remove('mc-selected'));
    }
    fresh.classList.add('mc-selected');
  };
}

function saveMorningCheckin() {
  if (answers.lowCarbYesterday === undefined || answers.committedToday === undefined) {
    showInlineInsight('morning-checkin-insight-slot', 'Answer the low-carb and commitment questions to save.');
    return;
  }

  const today = getActiveDay();
  today.morningCheckin = {
    lowCarbYesterday: answers.lowCarbYesterday ?? null,
    ateAfterSixPm: answers.ateAfterSixPm ?? null,
    fightFeedingSignals: answers.fightFeedingSignals ?? null,
    feeling: answers.feeling ?? null,
    committedToday: answers.committedToday ?? null
  };
  today.morningCheckinDone = true;
  saveActiveDay(today);

  // Write low-carb to yesterday's record
  const yStr = yesterdayStr();
  const yesterday = getDay(yStr);
  if (yesterday.stayedLowCarb === null && answers.lowCarbYesterday !== undefined) {
    yesterday.stayedLowCarb = answers.lowCarbYesterday;
    saveDay(yStr, yesterday);
  }

  const streak = getCarbStreak();
  showDoneState(today.morningCheckin, streak);

  if (answers.lowCarbYesterday) {
    showInlineInsight('morning-checkin-insight-slot', getCarbInsight(streak, true));
  } else {
    showInlineInsight('morning-checkin-insight-slot', 'No guilt. Today is a fresh start. Follow the protocol.');
  }
}

function showDoneState(checkin, streak) {
  const feelingEmojis = { great: '🔥', good: '😊', okay: '😐', tough: '😤', rough: '😔' };

  document.getElementById('mc-questions').classList.add('hidden');
  document.getElementById('morning-checkin-save').classList.add('hidden');

  const doneEl = document.getElementById('mc-done-state');
  doneEl.classList.remove('hidden');
  doneEl.innerHTML = `
    <div class="mc-done-check">✓ Checked in</div>
    <div class="mc-summary">
      <span>Low-carb yesterday: ${checkin.lowCarbYesterday ? '✓' : '✗'}</span>
      <span>After 6 PM: ${checkin.ateAfterSixPm ? 'Yes' : 'No'}</span>
      <span>Feeling: ${feelingEmojis[checkin.feeling] || '—'}</span>
    </div>
    <div class="carb-streak-inline">
      <span class="streak-number-sm">${streak}</span>
      <span class="streak-label-sm">day low-carb streak</span>
    </div>
  `;
}
