// morning.js — Morning mindset prompt + sleep rating

import { getToday, saveToday, todayString } from './store.js';
import { getMorningGreeting, getMorningQuote, getSleepInsight } from './insights.js';
import { showInlineInsight } from './app.js';

export function initMorning() {
  const modal = document.getElementById('morning-modal');
  const greeting = document.getElementById('morning-greeting');
  const quote = document.getElementById('morning-quote');

  greeting.textContent = getMorningGreeting();
  quote.textContent = `"${getMorningQuote()}"`;

  // Stars
  const stars = document.querySelectorAll('#sleep-stars .star');
  let selectedRating = 0;

  stars.forEach(star => {
    star.onclick = () => {
      selectedRating = parseInt(star.dataset.value);
      stars.forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.value) <= selectedRating);
      });
    };
  });

  // Dismiss
  document.getElementById('morning-dismiss').onclick = () => {
    if (selectedRating > 0) {
      const today = getToday();
      today.sleepQuality = selectedRating;
      saveToday(today);
      // Sleep insight will show on dashboard after modal closes
    }
    modal.classList.add('hidden');
    localStorage.setItem('mt_morning_shown_' + todayString(), '1');
  };

  modal.classList.remove('hidden');
}
