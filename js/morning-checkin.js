// morning-checkin.js — Morning goal-setting exercise
// Replaces evening check-in. Asks about yesterday + sets intention for today.

import { getActiveDay, saveActiveDay, getDay, saveDay, yesterdayStr, getCarbStreak, getRecentDays } from './store.js';
import { getCarbInsight } from './insights.js';
import { showInlineInsight } from './app.js';

export function initMorningCheckin() {
  renderMorningCheckin();
  bindMorningCheckin();
}

function renderMorningCheckin() {
  const content = document.getElementById('morning-checkin-content');
  const today = getActiveDay();
  const checkin = today.morningCheckin;
  const streak = getCarbStreak();

  if (today.morningCheckinDone && checkin) {
    // Already done — show summary
    const feelingEmojis = { great: '🔥', good: '😊', okay: '😐', tough: '😤', rough: '😔' };
    content.innerHTML = `
      <div class="mc-done">
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
      </div>`;
    document.getElementById('morning-checkin-save').classList.add('hidden');
    return;
  }

  document.getElementById('morning-checkin-save').classList.remove('hidden');

  // Build the 5 questions
  content.innerHTML = `
    <div class="mc-question">
      <p class="mc-q-text">Did you stay low-carb yesterday?</p>
      <div class="btn-row mc-btn-row">
        <button class="btn btn-success" data-mc="lowCarbYesterday" data-val="true">Yes</button>
        <button class="btn btn-danger" data-mc="lowCarbYesterday" data-val="false">No</button>
      </div>
      <div class="carb-streak-inline">
        <span class="streak-number-sm">${streak}</span>
        <span class="streak-label-sm">day streak</span>
      </div>
    </div>

    <div class="mc-question">
      <p class="mc-q-text">Did you eat anything after 6 PM?</p>
      <div class="btn-row mc-btn-row">
        <button class="btn btn-danger" data-mc="ateAfterSixPm" data-val="true">Yes</button>
        <button class="btn btn-success" data-mc="ateAfterSixPm" data-val="false">No</button>
      </div>
    </div>

    <div class="mc-question">
      <p class="mc-q-text">Did you wake up fighting hunger signals?</p>
      <div class="btn-row mc-btn-row">
        <button class="btn btn-outline-dim" data-mc="fightFeedingSignals" data-val="true">Yes</button>
        <button class="btn btn-outline-dim" data-mc="fightFeedingSignals" data-val="false">No</button>
      </div>
    </div>

    <div class="mc-question">
      <p class="mc-q-text">How did you feel yesterday?</p>
      <div class="mc-emoji-row">
        <button class="mc-emoji" data-mc="feeling" data-val="great">🔥<span>Great</span></button>
        <button class="mc-emoji" data-mc="feeling" data-val="good">😊<span>Good</span></button>
        <button class="mc-emoji" data-mc="feeling" data-val="okay">😐<span>Okay</span></button>
        <button class="mc-emoji" data-mc="feeling" data-val="tough">😤<span>Tough</span></button>
        <button class="mc-emoji" data-mc="feeling" data-val="rough">😔<span>Rough</span></button>
      </div>
    </div>

    <div class="mc-question mc-commitment">
      <p class="mc-q-text">Are you committed to following your plan today?</p>
      <button class="btn btn-primary btn-lg mc-commit-btn" data-mc="committedToday" data-val="true">I'm committed</button>
    </div>

    <div class="mc-dots">${renderCarbDots()}</div>
  `;
}

function renderCarbDots() {
  const recent = getRecentDays(30);
  return recent.map(d => {
    const cls = d.stayedLowCarb === true ? 'yes' : d.stayedLowCarb === false ? 'no' : '';
    return `<div class="carb-dot ${cls}"></div>`;
  }).join('');
}

let mcAnswers = {};

function bindMorningCheckin() {
  mcAnswers = {};
  const content = document.getElementById('morning-checkin-content');

  // Bind each button directly
  content.querySelectorAll('[data-mc]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const key = btn.dataset.mc;
      const val = btn.dataset.val === 'true' ? true : btn.dataset.val === 'false' ? false : btn.dataset.val;
      mcAnswers[key] = val;

      // Highlight selected, deselect siblings
      const parent = btn.closest('.btn-row, .mc-emoji-row, .mc-commitment');
      if (parent) {
        parent.querySelectorAll('[data-mc]').forEach(s => s.classList.remove('mc-selected'));
      }
      btn.classList.add('mc-selected');
    });
  });

  // Save
  const saveBtn = document.getElementById('morning-checkin-save');
  if (saveBtn) {
    saveBtn.onclick = () => {
      // Need at least low-carb and commitment answered
      if (mcAnswers.lowCarbYesterday === undefined || mcAnswers.committedToday === undefined) {
        showInlineInsight('morning-checkin-insight-slot', 'Answer the low-carb and commitment questions to save.');
        return;
      }

      const today = getActiveDay();
      today.morningCheckin = {
        lowCarbYesterday: mcAnswers.lowCarbYesterday ?? null,
        ateAfterSixPm: mcAnswers.ateAfterSixPm ?? null,
        fightFeedingSignals: mcAnswers.fightFeedingSignals ?? null,
        feeling: mcAnswers.feeling ?? null,
        committedToday: mcAnswers.committedToday ?? null
      };
      today.morningCheckinDone = true;
      saveActiveDay(today);

      // Write low-carb to yesterday's record (if not already answered)
      const yStr = yesterdayStr();
      const yesterday = getDay(yStr);
      if (yesterday.stayedLowCarb === null && mcAnswers.lowCarbYesterday !== undefined) {
        yesterday.stayedLowCarb = mcAnswers.lowCarbYesterday;
        saveDay(yStr, yesterday);
      }

      const streak = getCarbStreak();
      renderMorningCheckin();

      // Show insight
      if (mcAnswers.lowCarbYesterday) {
        showInlineInsight('morning-checkin-insight-slot', getCarbInsight(streak, true));
      } else {
        showInlineInsight('morning-checkin-insight-slot', 'No guilt. Today is a fresh start. Follow the protocol.');
      }
    };
  }
}
