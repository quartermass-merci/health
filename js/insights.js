// insights.js — Motivational insights engine

import { getAllWeights, getCarbStreak, getProfile, getDayNumber } from './store.js';

// Pick a variant based on date to avoid repetition
function variant(messages, seed) {
  const idx = (seed || Date.now()) % messages.length;
  return messages[Math.abs(idx)];
}

function dayHash() {
  const d = new Date();
  return d.getFullYear() * 1000 + d.getMonth() * 50 + d.getDate();
}

// ===== WEIGHT =====
export function getWeightInsight(dayData, profile) {
  const weights = getAllWeights();
  if (weights.length < 1) return "First weigh-in logged! This is your starting line.";

  const current = dayData.weight;
  const totalLost = profile.startWeight - current;
  const remaining = current - profile.goalWeight;

  const parts = [];

  // Change since last
  if (weights.length >= 2) {
    const prev = weights[weights.length - 2].weight;
    const delta = prev - current;
    if (delta > 0) {
      parts.push(`Down ${delta.toFixed(1)} lbs since last weigh-in!`);
    } else if (delta < 0) {
      parts.push(`Up ${Math.abs(delta).toFixed(1)} lbs — normal daily fluctuation. Trust the trend.`);
    } else {
      parts.push("Holding steady from last weigh-in.");
    }
  }

  // Total lost
  if (totalLost > 0) {
    parts.push(`Total lost: ${totalLost.toFixed(1)} lbs from ${profile.startWeight}.`);
  }

  // Prediction
  if (weights.length >= 3) {
    const prediction = predictGoalDate(weights, profile.goalWeight);
    if (prediction) {
      parts.push(`At this pace, you'll hit ${profile.goalWeight} by ${prediction}.`);
    }
  } else {
    parts.push("Keep logging — prediction unlocks after 3 weigh-ins.");
  }

  return parts.join(' ');
}

export function predictGoalDate(weights, goalWeight) {
  if (weights.length < 3) return null;

  // 7-day SMA
  const recent = weights.slice(-14);
  if (recent.length < 3) return null;

  // Compute SMAs
  const smaWindow = Math.min(7, recent.length);
  const smas = [];
  for (let i = smaWindow - 1; i < recent.length; i++) {
    let sum = 0;
    for (let j = i - smaWindow + 1; j <= i; j++) sum += recent[j].weight;
    smas.push({ date: recent[i].date, sma: sum / smaWindow });
  }

  if (smas.length < 2) return null;

  const first = smas[0];
  const last = smas[smas.length - 1];
  const daysBetween = (new Date(last.date) - new Date(first.date)) / 86400000;
  if (daysBetween < 1) return null;

  const dailyLoss = (first.sma - last.sma) / daysBetween;
  if (dailyLoss <= 0) return null; // not losing

  const currentSMA = last.sma;
  const remaining = currentSMA - goalWeight;
  if (remaining <= 0) return null;

  const daysToGoal = remaining / dailyLoss;
  if (daysToGoal > 730) return null; // >2 years, don't show

  const goalDate = new Date();
  goalDate.setDate(goalDate.getDate() + Math.round(daysToGoal));
  return goalDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function getWeightStats(dayData, profile) {
  const weights = getAllWeights();
  const current = dayData.weight;
  const stats = {
    lastDelta: null,
    sevenDayAvg: null,
    totalLost: profile.startWeight - current,
    remaining: current - profile.goalWeight,
    predictedDate: null
  };

  if (weights.length >= 2) {
    const prev = weights[weights.length - 2].weight;
    stats.lastDelta = prev - current;
  }

  // 7-day avg
  const recentWeights = weights.slice(-7);
  if (recentWeights.length > 0) {
    const sum = recentWeights.reduce((a, w) => a + w.weight, 0);
    stats.sevenDayAvg = sum / recentWeights.length;
  }

  // 7-day avg loss rate
  if (weights.length >= 7) {
    const older = weights.slice(-14, -7);
    const newer = weights.slice(-7);
    if (older.length > 0) {
      const olderAvg = older.reduce((a, w) => a + w.weight, 0) / older.length;
      const newerAvg = newer.reduce((a, w) => a + w.weight, 0) / newer.length;
      stats.weeklyLossRate = olderAvg - newerAvg;
    }
  }

  stats.predictedDate = predictGoalDate(weights, profile.goalWeight);

  return stats;
}

// ===== WATER =====
export function getWaterInsight(dayData, profile) {
  const pct = Math.round((dayData.waterMl / profile.waterGoalMl) * 100);
  const h = dayHash();

  if (pct >= 100) {
    return variant([
      "Goal smashed! Hydration drives fat oxidation — you're fueling the burn.",
      "3000ml done! Your kidneys and metabolism thank you.",
      "100% hydrated! Water is the silent accelerator of your transformation."
    ], h);
  }
  if (pct >= 75) {
    return variant([
      `${pct}% — almost there! Every sip supports your metabolism.`,
      `${pct}% done. The home stretch — keep that water flowing.`,
      `Just ${profile.waterGoalMl - dayData.waterMl}ml to go. You've got this.`
    ], h);
  }
  if (pct >= 50) {
    return variant([
      `Past halfway at ${pct}%! Hydration reduces false hunger signals.`,
      `${pct}% — solid momentum. Dehydration mimics hunger, so keep drinking.`,
      `Over half done. Water helps your body release stored fat.`
    ], h);
  }
  if (pct >= 25) {
    return variant([
      `${pct}% — good start! Water is your metabolism's best friend.`,
      `Building momentum at ${pct}%. Each glass moves the needle.`
    ], h);
  }
  return variant([
    "First glass logged! Hydration is step one of fat burning.",
    "Getting started — even 250ml makes a difference.",
    "Water logged! Consistent hydration prevents false hunger cues."
  ], h);
}

// ===== FASTING =====
export function getFastingInsight(now, windowStart, windowEnd) {
  const hour = now.getHours() + now.getMinutes() / 60;
  const h = dayHash();

  if (hour < windowStart) {
    const hoursFasted = 24 - windowEnd + hour;
    if (hoursFasted >= 18) {
      return variant([
        `${Math.floor(hoursFasted)} hours fasted — you're in peak fat-burning territory.`,
        `${Math.floor(hoursFasted)}h fasted. Autophagy and deep fat oxidation are active.`
      ], h);
    }
    if (hoursFasted >= 14) {
      return variant([
        `${Math.floor(hoursFasted)}h fasted — fat oxidation is accelerating.`,
        `${Math.floor(hoursFasted)} hours in. Your body is switching to stored fat for fuel.`
      ], h);
    }
    return variant([
      `${Math.floor(hoursFasted)}h fasted. Insulin is dropping — fat stores unlocking.`,
      `Fasting strong at ${Math.floor(hoursFasted)}h. Your hormones are recalibrating.`
    ], h);
  }
  if (hour < windowEnd) {
    return variant([
      "Window is open. Eat mindfully — protein and fats first for satiety.",
      "Feeding time. Load up on high-satiety protein and healthy fats.",
      "Window open — mechanical eating. Eat on schedule, not on impulse."
    ], h);
  }
  const hoursFasted = hour - windowEnd;
  return variant([
    `Window closed. ${hoursFasted.toFixed(1)}h into tonight's fast — strong start.`,
    `Fasting begins. ${hoursFasted.toFixed(1)}h down. Your metabolism is shifting to fat-burning mode.`
  ], h);
}

// ===== CARBS =====
export function getCarbInsight(streak, stayedLowCarb) {
  const h = dayHash();

  if (!stayedLowCarb) {
    return variant([
      "Tomorrow is a new day. No compensation needed — just return to protocol.",
      "One day doesn't erase your progress. Get back to low-carb tomorrow. No guilt.",
      "The no-compensation rule: don't restrict tomorrow. Just resume the protocol."
    ], h);
  }

  if (streak >= 30) {
    return variant([
      `${streak}-day streak! Your metabolic flexibility is transforming. Fat is your primary fuel now.`,
      `${streak} days strong. Your insulin sensitivity has measurably improved. This is the new you.`
    ], h);
  }
  if (streak >= 14) {
    return variant([
      `${streak}-day streak! Insulin sensitivity improving. Carb cravings should be fading.`,
      `${streak} days! Your brain is adapting to ketones. Mental clarity increases from here.`
    ], h);
  }
  if (streak >= 7) {
    return variant([
      `${streak}-day streak! Fat adaptation is beginning. Your body is learning to burn fat.`,
      `Week ${Math.floor(streak / 7)} of low-carb! Glycogen depleted — fat oxidation is your engine now.`
    ], h);
  }
  if (streak >= 3) {
    return variant([
      `${streak} days! Glycogen stores depleting. Your body is preparing to switch fuel sources.`,
      `${streak}-day streak building! Push through — day 7 is where fat adaptation kicks in.`
    ], h);
  }
  return variant([
    "Day 1 of a new streak. Every journey starts with a single step.",
    "Low-carb logged! Your insulin is already starting to drop.",
    "First day counts. You're silencing the carb-craving cycle right now."
  ], h);
}

// ===== WALKING =====
export function getWalkingInsight(dayData, profile) {
  const min = dayData.walkingMin;
  const goal = profile.walkGoalMin;
  const pct = Math.round((min / goal) * 100);
  // Rough calorie estimate for ~300lb person walking slowly: ~3.5 cal/min
  const cals = Math.round(min * 3.5);
  const h = dayHash();

  if (pct >= 100) {
    return variant([
      `Goal hit! ${min} min of NEAT = ~${cals} extra calories burned. That adds up fast.`,
      `${min} minutes done! NEAT is the most sustainable fat-burning strategy. You're proving it.`,
      `Walking goal complete! ~${cals} calories burned through movement alone today.`
    ], h);
  }
  if (pct >= 50) {
    return variant([
      `${min} min logged (~${cals} cal). ${goal - min} min to go — every step counts.`,
      `Past halfway! ${min} minutes of low-intensity movement without triggering hunger.`
    ], h);
  }
  return variant([
    `${min} min logged. Low-intensity movement burns fat without spiking hunger.`,
    `+${min} min of NEAT. Unlike cardio, this won't trigger compensatory eating.`,
    `${min} minutes in. Walking tripled calorie burn vs sitting — no gym required.`
  ], h);
}

// ===== CRAVING =====
export function getCravingInsight() {
  const h = dayHash();
  return variant([
    "You made it through. The craving has passed. Your prefrontal cortex is back in charge.",
    "5 minutes of breathing beats 5 minutes of regret. Well done.",
    "Craving survived! You just proved that urges are temporary. You are in control.",
    "The craving wave has broken. Each time you ride it out, the next one is weaker.",
    "You paused, you breathed, you chose yourself. That's the protocol working."
  ], h);
}

// ===== SLEEP =====
export function getSleepInsight(quality) {
  const h = dayHash();
  if (quality >= 4) {
    return variant([
      `${quality}/5 sleep — great foundation. Good sleep predicts strong adherence today.`,
      `Solid rest (${quality}/5). Your cortisol and leptin are better regulated today.`
    ], h);
  }
  if (quality >= 3) {
    return variant([
      `${quality}/5 sleep — decent. Watch for extra cravings today and drink extra water.`,
      `Average sleep. Be extra mindful today — fatigue can mimic hunger.`
    ], h);
  }
  return variant([
    `Rough night (${quality}/5). Be gentle with yourself — lean on the protocol structure today.`,
    `Poor sleep triggers cortisol spikes. Stick to mechanical eating today — it'll carry you through.`
  ], h);
}

// ===== PMR =====
export function getPmrInsight() {
  const h = dayHash();
  return variant([
    "PMR done! Clinical trials show this reduces evening food intake. Sleep well.",
    "Relaxation logged. Lowering systemic arousal helps prevent nighttime eating.",
    "PMR complete. You're resetting your nervous system for quality sleep and metabolic repair."
  ], h);
}

// ===== MORNING =====
export function getMorningQuote() {
  const quotes = [
    "Mechanical eating over intuitive eating — your hunger signals are still recalibrating. Trust the schedule.",
    "This transformation is a marathon of consistency, not a sprint of deprivation.",
    "Your path from 310 to your goal is a journey of biological alignment. One day at a time.",
    "Waiting too long without a plan crashes blood sugar and hijacks decisions. Eat at noon, on schedule.",
    "The 5-minute rule: when a craving hits, pause and breathe. Let the prefrontal cortex re-engage.",
    "If a lapse happens, you are forbidden from restricting tomorrow. Return to protocol. No self-punishment.",
    "Staying away from sugar and bread is a move for cognitive preservation, not just weight loss.",
    "Low-intensity movement is the most sustainable energy expenditure multiplier. Walk, don't run.",
    "You're not fighting willpower — you're recalibrating your endocrine system. Science is on your side.",
    "Every day you stick to the window, you're re-anchoring cortisol and leptin. The hormones follow the schedule.",
    "Evening mood dips are normal during transformation. They pass. The protocol holds you through them.",
    "Your feeding window isn't about deprivation — it's about giving your body time to access fat stores.",
    "Each day of low-carb eating silences the neurochemical pull toward carbohydrates a little more.",
    "Water is the silent accelerator. Dehydration mimics hunger and stalls fat loss.",
    "Managing your emotional environment is as critical as the food on your plate."
  ];
  return quotes[dayHash() % quotes.length];
}

export function getMorningGreeting() {
  const hour = new Date().getHours();
  const dayNum = getDayNumber();
  if (hour < 12) return `Good morning — Day ${dayNum}`;
  if (hour < 17) return `Good afternoon — Day ${dayNum}`;
  return `Good evening — Day ${dayNum}`;
}
