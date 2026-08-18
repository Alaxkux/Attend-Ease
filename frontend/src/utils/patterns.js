// Derive attendance pattern from history array of "present"|"late"|"absent"
export function detectPattern(history = []) {
  if (!history.length) return { label: "No data yet", color: "muted", emoji: "📊" };

  const total = history.length;
  const present = history.filter(h => h === "present").length;
  const late = history.filter(h => h === "late").length;
  const absent = history.filter(h => h === "absent").length;

  const pct = {
    present: Math.round((present / total) * 100),
    late: Math.round((late / total) * 100),
    absent: Math.round((absent / total) * 100),
  };

  // Streak of consecutive present/late (not absent)
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] !== "absent") streak++;
    else break;
  }

  // Risk threshold
  const attendanceRate = Math.round(((present + late) / total) * 100);
  const atRisk = attendanceRate < 75;

  // Pattern label
  let label, color, emoji;
  if (pct.present >= 85) { label = "Always Present"; color = "green"; emoji = "🌟"; }
  else if (pct.absent >= 30) { label = "Often Absent"; color = "red"; emoji = "⚠️"; }
  else if (pct.late >= 25) { label = "Frequently Late"; color = "amber"; emoji = "⏰"; }
  else if (pct.present >= 70) { label = "Mostly On Time"; color = "green"; emoji = "✅"; }
  else { label = "Inconsistent"; color = "amber"; emoji = "📉"; }

  // Monday pattern detection
  const mondayAbsences = history.filter((h, i) => i % 5 === 0 && h === "absent").length;
  const mondayTotal = Math.ceil(total / 5);
  const missesMondaysOften = mondayTotal > 2 && mondayAbsences / mondayTotal > 0.5;

  return { label, color, emoji, pct, streak, atRisk, attendanceRate, missesMondaysOften, total };
}

export function buildInsightText(pattern, name = "You") {
  const { label, pct, streak, missesMondaysOften, atRisk, attendanceRate } = pattern;

  if (atRisk) return `⚠️ ${name}'s attendance is at ${attendanceRate}% — below the 75% required threshold.`;
  if (label === "Always Present") return `${name} ${streak > 5 ? `has a ${streak}-session streak and` : ""} maintains excellent attendance. Keep it up!`;
  if (label === "Often Absent") return `${name} misses ${pct.absent}% of classes. Consistent attendance is critical.`;
  if (label === "Frequently Late") {
    if (missesMondaysOften) return `${name} tends to be late, especially on Mondays. Try arriving 5 mins early.`;
    return `${name} is late ${pct.late}% of the time. Small habit changes can make a big difference.`;
  }
  if (label === "Mostly On Time") return `${name} is mostly punctual with ${pct.present}% full attendance. Solid record.`;
  return `${name}'s attendance pattern is inconsistent. A more regular schedule is recommended.`;
}
