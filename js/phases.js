// phases.js — Protocol phase progress tracker

import { getProfile, getDayNumber } from './store.js';

const PHASES = [
  { name: 'Hormonal Re-anchoring', months: '1-3', days: 90, description: 'Stabilize insulin, re-sync cortisol & leptin with the 12-6 window and low-carb eating.' },
  { name: 'Metabolic Flexibility', months: '4-9', days: 180, description: 'Integrate daily NEAT (2-3 hrs) to maximize fat oxidation without triggering hunger.' },
  { name: 'Behavioral Consolidation', months: '10-12', days: 90, description: 'Master emotional regulation and PMR to cement your new biological baseline.' }
];

export function initPhases() {
  // Phase banner on dashboard is rendered by dashboard.js
}

export function getCurrentPhase() {
  const dayNum = getDayNumber();

  let accumulated = 0;
  for (let i = 0; i < PHASES.length; i++) {
    accumulated += PHASES[i].days;
    if (dayNum <= accumulated) {
      const phaseStart = accumulated - PHASES[i].days;
      const daysInPhase = dayNum - phaseStart;
      const pct = Math.round((daysInPhase / PHASES[i].days) * 100);
      return {
        index: i + 1,
        name: PHASES[i].name,
        months: PHASES[i].months,
        description: PHASES[i].description,
        daysIn: daysInPhase,
        totalDays: PHASES[i].days,
        pct: Math.min(pct, 100)
      };
    }
  }

  // Past 12 months
  return {
    index: 3,
    name: 'Maintenance',
    months: '12+',
    description: 'Your new baseline is established. Keep the habits that got you here.',
    daysIn: dayNum - 360,
    totalDays: 0,
    pct: 100
  };
}
