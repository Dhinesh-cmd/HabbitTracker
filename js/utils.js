/**
 * My Daily Habit Tracker - Utilities
 * Contains dates, custom sound chime, motivational quotes, theme toggle, and export.
 */

import { DEFAULT_HABITS, StorageManager, CATEGORIES } from './storage.js';

// Random motivational quotes
const MOTIVATIONAL_QUOTES = [
  "Consistency beats motivation.",
  "Small progress every day.",
  "Never skip twice.",
  "Small habits build big results.",
  "You are what you repeatedly do.",
  "The secret of your future is hidden in your daily routine.",
  "Habits are the compound interest of self-improvement.",
  "Focus on the process, not the outcome.",
  "Day by day, step by step.",
  "First we make our habits, then our habits make us."
];

/**
 * Get a pseudo-random quote based on the day of the year.
 */
export function getDailyQuote(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[index];
}

/**
 * Format date for header (e.g. Wednesday, 08 July 2026)
 */
export function formatHeaderDate(date) {
  const options = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
}

/**
 * Format simple date to YYYY-MM-DD
 */
export function toISODateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Digital clock tick update
 */
export function updateDigitalClock(elementId) {
  const clockEl = document.getElementById(elementId);
  if (!clockEl) return;

  const tick = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    clockEl.textContent = `${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
  };

  tick();
  setInterval(tick, 1000);
}

/**
 * Play a high-quality synth chime using Web Audio API
 */
export function playSuccessChime() {
  try {
    // Check settings first (if user disabled sound)
    const settingsRaw = localStorage.getItem("HabitTracker");
    if (settingsRaw) {
      const parsed = JSON.parse(settingsRaw);
      if (parsed.settings && parsed.settings.sounds === false) {
        return; // Muted
      }
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    
    // Primary chime node
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc1.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.12); // G5

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
    osc2.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.12); // C6

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
    
    osc1.stop(audioCtx.currentTime + 0.8);
    osc2.stop(audioCtx.currentTime + 0.8);
  } catch (err) {
    console.warn("Chime playback error/blocked: ", err);
  }
}

/**
 * Play a low tone for notifications
 */
export function playNotificationSound() {
  try {
    const settingsRaw = localStorage.getItem("HabitTracker");
    if (settingsRaw) {
      const parsed = JSON.parse(settingsRaw);
      if (parsed.settings && parsed.settings.sounds === false) {
        return;
      }
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
    osc.frequency.linearRampToValueAtTime(349.23, audioCtx.currentTime + 0.2); // F4

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (err) {
    console.warn("Notification sound blocked: ", err);
  }
}

/**
 * Dynamic theme loader & manager
 */
export function initTheme() {
  const getThemePreference = () => {
    try {
      const raw = localStorage.getItem("HabitTracker");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.settings && parsed.settings.theme) {
          return parsed.settings.theme;
        }
      }
    } catch(e){}
    return "dark"; // default dark
  };

  const currentTheme = getThemePreference();
  document.documentElement.setAttribute("data-theme", currentTheme);
  return currentTheme;
}

export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);

  // Update localStorage
  try {
    const raw = localStorage.getItem("HabitTracker") || "{}";
    const parsed = JSON.parse(raw);
    if (!parsed.settings) parsed.settings = {};
    parsed.settings.theme = newTheme;
    localStorage.setItem("HabitTracker", JSON.stringify(parsed));
  } catch(e){}
  
  return newTheme;
}

/**
 * Export history as CSV
 */
export function downloadCSVReport(historyData, selectedMonth) {
  let csvContent = "data:text/csv;charset=utf-8,Date,Day,Completion Rate %,Completed HabitsCount,Total HabitsCount,Notes,Water Glasses,Sleep Hours,Gym\n";
  
  Object.keys(historyData).sort().forEach(dateStr => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
    const day = historyData[dateStr];
    
    // Calculate stats
    let completed = 0;
    let total = 0;
    Object.keys(day).forEach(key => {
      if (key.indexOf("__") !== 0 && typeof day[key] === "boolean") {
        total++;
        if (day[key]) completed++;
      }
    });

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const notes = (day.__tracker_notes || "").replace(/"/g, '""');
    const water = day.__tracker_water || 0;
    const sleep = day.__tracker_sleep || 0;
    const gym = day.__tracker_gym ? "Yes" : "No";

    // Day name
    const d = new Date(dateStr);
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });

    csvContent += `"${dateStr}","${dayName}",${percent},${completed},${total},"${notes}",${water},${sleep},"${gym}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `HabitTracker_Report_${selectedMonth || 'All'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Print simple CSS-styled page report (trigger browser print)
 */
export function exportPDFReport(selectedMonth) {
  // 1. Get raw tracking data
  const rawData = StorageManager.getRawData();
  
  // If selectedMonth is not provided, default to current month
  let targetMonth = selectedMonth;
  if (!targetMonth) {
    const d = new Date();
    targetMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  
  // Filter history records for this month
  const monthlyKeys = Object.keys(rawData).filter(k => k.startsWith(targetMonth) && /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
  
  // Month display name
  const [yr, mn] = targetMonth.split('-');
  const monthDate = new Date(parseInt(yr), parseInt(mn) - 1, 1);
  const monthNameStr = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  if (monthlyKeys.length === 0) {
    alert(`No habit data found for the selected month: ${monthNameStr}`);
    return;
  }
  
  // 2. Calculations for Page 1 (Analytics Summary)
  let totalHabitsCount = 0;
  let totalCompletedCount = 0;
  let totalMissedCount = 0;
  let dailyRates = []; // { date, percent }
  
  // Category metrics
  const categorySummary = {};
  CATEGORIES.forEach(cat => {
    categorySummary[cat.id] = { completed: 0, total: 0 };
  });
  
  // Habit metrics
  const habitSummary = {};
  
  monthlyKeys.forEach(dateStr => {
    const dayData = rawData[dateStr];
    let dayTotal = 0;
    let dayCompleted = 0;
    
    Object.keys(dayData).forEach(key => {
      if (key.indexOf('__') !== 0 && typeof dayData[key] === 'boolean') {
        dayTotal++;
        if (dayData[key]) dayCompleted++;
        
        // Find category
        const habitItem = DEFAULT_HABITS.find(h => h.id === key || h.name === key || (h.time && key.endsWith(h.name)));
        const catId = habitItem ? habitItem.category : 'others';
        if (categorySummary[catId]) {
          categorySummary[catId].total++;
          if (dayData[key]) categorySummary[catId].completed++;
        }
        
        // Habit stats
        const habitName = habitItem ? habitItem.name : key.split('|').pop();
        if (!habitSummary[habitName]) {
          habitSummary[habitName] = { completed: 0, total: 0 };
        }
        habitSummary[habitName].total++;
        if (dayData[key]) habitSummary[habitName].completed++;
      }
    });
    
    totalHabitsCount += dayTotal;
    totalCompletedCount += dayCompleted;
    totalMissedCount += (dayTotal - dayCompleted);
    
    const rate = dayTotal > 0 ? Math.round((dayCompleted / dayTotal) * 100) : 0;
    dailyRates.push({ date: parseInt(dateStr.split('-')[2]), percent: rate });
  });
  
  const overallSuccessRate = totalHabitsCount > 0 ? Math.round((totalCompletedCount / totalHabitsCount) * 100) : 0;
  const daysTracked = monthlyKeys.length;
  
  // Streak calculations
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  for (let d = 1; d <= 31; d++) {
    const dateKey = `${targetMonth}-${String(d).padStart(2, '0')}`;
    const dayData = rawData[dateKey];
    if (dayData) {
      let completed = 0;
      Object.keys(dayData).forEach(k => {
        if (k.indexOf('__') !== 0 && typeof dayData[k] === 'boolean' && dayData[k]) {
          completed++;
        }
      });
      if (completed > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    } else {
      tempStreak = 0;
    }
  }
  currentStreak = tempStreak;
  
  const globalStreaks = StorageManager.getStreakMetrics ? StorageManager.getStreakMetrics() : null;
  if (globalStreaks && targetMonth === new Date().toISOString().split('T')[0].substring(0, 7)) {
    currentStreak = globalStreaks.currentStreak || currentStreak;
    longestStreak = globalStreaks.longestStreak || longestStreak;
  }
  
  // Consistency rankings
  const rankings = [];
  Object.keys(habitSummary).forEach(name => {
    const stats = habitSummary[name];
    const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    rankings.push({ name, rate });
  });
  
  const mostConsistent = [...rankings].sort((a, b) => b.rate - a.rate).slice(0, 5);
  const needsImprovement = [...rankings].sort((a, b) => a.rate - b.rate).slice(0, 5);
  
  // Motivation text
  let motivationTitle = "Keep pushing!";
  let motivationMsg = "A little more consistency can significantly improve next month. Focus on small daily habits.";
  if (overallSuccessRate >= 80) {
    motivationTitle = "Excellent work!";
    motivationMsg = "You maintained strong consistency throughout the month. Keep building your streak.";
  } else if (overallSuccessRate >= 50) {
    motivationTitle = "Good progress.";
    motivationMsg = "Good consistency. Focusing on routine checks next month will lead to even better results.";
  }
  
  // Generate SVG chart
  const lastDay = new Date(parseInt(yr), parseInt(mn), 0).getDate();
  const chartWidth = 700;
  const chartHeight = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  
  let chartPoints = "";
  let gridLines = "";
  
  for (let yVal = 0; yVal <= 100; yVal += 20) {
    const yPos = paddingTop + (chartHeight - paddingTop - paddingBottom) * (1 - yVal / 100);
    gridLines += `<line x1="${paddingLeft}" y1="${yPos}" x2="${chartWidth - paddingRight}" y2="${yPos}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4" />`;
    gridLines += `<text x="${paddingLeft - 8}" y="${yPos + 4}" fill="#64748b" font-size="10" font-family="Poppins" text-anchor="end">${yVal}%</text>`;
  }
  
  const pointsArray = [];
  for (let d = 1; d <= lastDay; d++) {
    const xPos = paddingLeft + (chartWidth - paddingLeft - paddingRight) * ((d - 1) / (lastDay - 1));
    const dayRate = dailyRates.find(r => r.date === d);
    
    if (d === 1 || d % 5 === 0 || d === lastDay) {
      gridLines += `<text x="${xPos}" y="${chartHeight - paddingBottom + 16}" fill="#64748b" font-size="10" font-family="Poppins" text-anchor="middle">${d}</text>`;
    }
    
    if (dayRate) {
      const yPos = paddingTop + (chartHeight - paddingTop - paddingBottom) * (1 - dayRate.percent / 100);
      pointsArray.push(`${xPos},${yPos}`);
      chartPoints += `<circle cx="${xPos}" cy="${yPos}" r="3.5" fill="#3b82f6" />`;
    }
  }
  
  const polylinePoints = pointsArray.join(' ');
  const chartPath = polylinePoints ? `<polyline fill="none" stroke="#3b82f6" stroke-width="3" points="${polylinePoints}" />` : '';
  
  const svgChart = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" style="width: 100%; height: auto;">
      ${gridLines}
      ${chartPath}
      ${chartPoints}
      <line x1="${paddingLeft}" y1="${chartHeight - paddingBottom}" x2="${chartWidth - paddingRight}" y2="${chartHeight - paddingBottom}" stroke="#cbd5e1" stroke-width="1.5" />
    </svg>
  `;
  
  // Category table rows
  let categoryTableRows = "";
  let categoryStrengthProgress = "";
  CATEGORIES.forEach(cat => {
    const stats = categorySummary[cat.id] || { completed: 0, total: 0 };
    const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    
    categoryTableRows += `
      <tr>
        <td style="font-weight: 600; color: #1e293b;">${cat.icon} ${cat.name}</td>
        <td>${stats.completed}</td>
        <td>${stats.total}</td>
        <td style="font-weight: 700; color: #3b82f6;">${rate}%</td>
      </tr>
    `;
    
    categoryStrengthProgress += `
      <div class="pdf-progress-bar-row">
        <div class="pdf-progress-bar-label">
          <span>${cat.icon} ${cat.name}</span>
          <span>${rate}%</span>
        </div>
        <div class="pdf-progress-bar-track">
          <div class="pdf-progress-bar-fill" style="width: ${rate}%; background: ${cat.color || '#3b82f6'};"></div>
        </div>
      </div>
    `;
  });
  
  // Rankings rows
  let rankingsHTML = "";
  for (let i = 0; i < 5; i++) {
    const cons = mostConsistent[i];
    const imp = needsImprovement[i];
    
    rankingsHTML += `
      <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
        <div style="flex: 1; padding-right: 8px;">
          ${cons ? `<div class="pdf-ranking-item"><span class="rank-name">${cons.name}</span><span class="rank-rate">${cons.rate}%</span></div>` : ''}
        </div>
        <div style="flex: 1; padding-left: 8px;">
          ${imp ? `<div class="pdf-ranking-item" style="border-bottom-color: #fee2e2;"><span class="rank-name">${imp.name}</span><span class="rank-rate" style="color: #dc2626;">${imp.rate}%</span></div>` : ''}
        </div>
      </div>
    `;
  }
  
  // 4. Generate Daily Pages
  let dailyPagesHTML = "";
  monthlyKeys.forEach((dateStr, idx) => {
    const dayData = rawData[dateStr];
    const d = new Date(dateStr);
    const formattedDate = d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
    
    let completed = 0;
    let total = 0;
    Object.keys(dayData).forEach(k => {
      if (k.indexOf('__') !== 0 && typeof dayData[k] === 'boolean') {
        total++;
        if (dayData[k]) completed++;
      }
    });
    
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const moodEmoji = dayData.__tracker_mood || "😐";
    const waterCups = dayData.__tracker_water || 0;
    const sleepHours = dayData.__tracker_sleep || 0;
    const gymDone = dayData.__tracker_gym === true ? "🏋️ Gym Done" : "❌ No Gym";
    const reflection = dayData.__tracker_notes || "No reflection recorded.";
    
    const groupedHabits = {};
    CATEGORIES.forEach(cat => {
      groupedHabits[cat.id] = [];
    });
    
    Object.keys(dayData).forEach(k => {
      if (k.indexOf('__') !== 0 && typeof dayData[k] === 'boolean') {
        const habitItem = DEFAULT_HABITS.find(h => h.id === k || h.name === k || (h.time && k.endsWith(h.name)));
        const catId = habitItem ? habitItem.category : 'others';
        
        if (groupedHabits[catId]) {
          groupedHabits[catId].push({
            name: habitItem ? habitItem.name : k.split('|').pop(),
            completed: dayData[k],
            time: habitItem ? habitItem.time : k.split('|')[0]
          });
        }
      }
    });
    
    let checklistHTML = "";
    CATEGORIES.forEach(cat => {
      const habits = groupedHabits[cat.id];
      if (habits && habits.length > 0) {
        checklistHTML += `
          <div class="pdf-category-section">
            <h4 class="pdf-category-header">${cat.icon} ${cat.name.toUpperCase()}</h4>
            <div class="pdf-habits-list">
        `;
        habits.forEach(h => {
          checklistHTML += `
              <div class="pdf-habit-row">
                <span class="pdf-habit-name">${h.name}</span>
                <span class="pdf-habit-time">${h.time || ""}</span>
                <span class="pdf-habit-status ${h.completed ? 'done' : 'missed'}">
                  ${h.completed ? '✓ Done' : '✗ Missed'}
                </span>
              </div>
          `;
        });
        checklistHTML += `
            </div>
          </div>
        `;
      }
    });
    
    dailyPagesHTML += `
      <div class="pdf-page page-break-before">
        <div class="pdf-header">
          <span class="pdf-app-title">My Habit Tracker</span>
          <span class="pdf-report-type">Daily Log Summary</span>
        </div>
        
        <div class="pdf-daily-hero">
          <div class="pdf-daily-hero-text">
            <h2>${formattedDate}</h2>
            <p class="pdf-day-name">${dayName}</p>
          </div>
          <div class="pdf-circular-progress">
            <div class="pdf-progress-text">${rate}%</div>
            <p class="pdf-progress-sub">Completed</p>
          </div>
        </div>
        
        <div class="pdf-vitals-row">
          <div class="pdf-vital-card">
            <span class="pdf-vital-icon">🎭</span>
            <span class="pdf-vital-label">Mood</span>
            <span class="pdf-vital-value">${moodEmoji}</span>
          </div>
          <div class="pdf-vital-card">
            <span class="pdf-vital-icon">💧</span>
            <span class="pdf-vital-label">Water</span>
            <span class="pdf-vital-value">${waterCups} glasses</span>
          </div>
          <div class="pdf-vital-card">
            <span class="pdf-vital-icon">💤</span>
            <span class="pdf-vital-label">Sleep</span>
            <span class="pdf-vital-value">${sleepHours} hours</span>
          </div>
          <div class="pdf-vital-card">
            <span class="pdf-vital-icon">💪</span>
            <span class="pdf-vital-label">Gym</span>
            <span class="pdf-vital-value">${gymDone}</span>
          </div>
        </div>
        
        <div class="pdf-card">
          <h3 class="pdf-card-title">✍ Daily Reflection</h3>
          <p class="pdf-reflection-text">${reflection}</p>
        </div>
        
        <div class="pdf-card">
          <h3 class="pdf-card-title">📋 Habits Checklist</h3>
          ${checklistHTML}
        </div>
        
        <div class="pdf-daily-stats-footer">
          <div class="pdf-stat-col">
            <span class="pdf-stat-val">${completed}</span>
            <span class="pdf-stat-lbl">Completed</span>
          </div>
          <div class="pdf-stat-col">
            <span class="pdf-stat-val">${total - completed}</span>
            <span class="pdf-stat-lbl">Missed</span>
          </div>
          <div class="pdf-stat-col">
            <span class="pdf-stat-val">${rate}%</span>
            <span class="pdf-stat-lbl">Completion Rate</span>
          </div>
        </div>
        
        <div class="pdf-footer">
          <span>Generated by My Habit Tracker</span>
          <span>${monthNameStr}</span>
          <span>Page ${idx + 2} / ${monthlyKeys.length + 1}</span>
        </div>
      </div>
    `;
  });
  
  // 5. Build Print Output
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${monthNameStr} Monthly Habit Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          background-color: #ffffff;
          color: #0f172a;
          font-family: 'Poppins', 'Inter', sans-serif;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .pdf-page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 20mm 20mm 20mm;
          margin: 0 auto;
          box-sizing: border-box;
          position: relative;
          background: #ffffff;
          display: flex;
          flex-direction: column;
        }
        .page-break-before {
          page-break-before: always;
        }
        .pdf-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 6px;
          margin-bottom: 20px;
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 500;
        }
        .pdf-app-title {
          font-weight: 700;
          color: #3b82f6;
        }
        .pdf-title-section {
          text-align: center;
          margin-bottom: 24px;
        }
        .pdf-title-section h1 {
          font-size: 2.2rem;
          font-weight: 800;
          color: #1e3a8a;
          margin: 0 0 4px 0;
        }
        .pdf-title-section p {
          font-size: 1rem;
          color: #64748b;
          margin: 0;
          font-weight: 600;
        }
        .pdf-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .pdf-stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
          text-align: center;
        }
        .pdf-stat-label {
          display: block;
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .pdf-stat-value {
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
        }
        .pdf-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .pdf-card-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1e3a8a;
          margin-top: 0;
          margin-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .pdf-table {
          width: 100%;
          border-collapse: collapse;
        }
        .pdf-table th {
          text-align: left;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #64748b;
          padding: 6px 8px;
          border-bottom: 2px solid #e2e8f0;
        }
        .pdf-table td {
          font-size: 0.85rem;
          padding: 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .pdf-table tr:last-child td {
          border-bottom: none;
        }
        .pdf-progress-bar-row {
          margin-bottom: 8px;
        }
        .pdf-progress-bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 2px;
        }
        .pdf-progress-bar-track {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
        .pdf-progress-bar-fill {
          height: 100%;
          border-radius: 4px;
        }
        .pdf-rankings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .pdf-ranking-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          padding: 4px 0;
          border-bottom: 1px dashed #e2e8f0;
        }
        .pdf-ranking-item:last-child {
          border-bottom: none;
        }
        .pdf-ranking-item .rank-name {
          font-weight: 500;
        }
        .pdf-ranking-item .rank-rate {
          font-weight: 700;
          color: #3b82f6;
        }
        .pdf-motivation-card {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          margin-bottom: 20px;
        }
        .pdf-motivation-card h3 {
          color: #1e40af;
          margin-top: 0;
          margin-bottom: 4px;
          font-size: 1.1rem;
          font-weight: 700;
        }
        .pdf-motivation-card p {
          color: #1e3a8a;
          margin: 0;
          font-size: 0.85rem;
        }
        .pdf-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
          font-size: 0.75rem;
          color: #94a3b8;
        }
        .pdf-daily-hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          background: #f8fafc;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #e2e8f0;
        }
        .pdf-daily-hero h2 {
          font-size: 1.6rem;
          margin: 0;
          color: #0f172a;
          font-weight: 800;
        }
        .pdf-day-name {
          margin: 4px 0 0 0;
          color: #64748b;
          font-size: 0.95rem;
          font-weight: 600;
        }
        .pdf-circular-progress {
          text-align: center;
          background: #3b82f6;
          color: #ffffff;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
        }
        .pdf-progress-text {
          font-size: 1.15rem;
          font-weight: 800;
        }
        .pdf-progress-sub {
          font-size: 0.5rem;
          margin: 0;
          text-transform: uppercase;
          font-weight: 700;
        }
        .pdf-vitals-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .pdf-vital-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .pdf-vital-icon {
          font-size: 1.2rem;
          margin-bottom: 2px;
        }
        .pdf-vital-label {
          font-size: 0.65rem;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
        }
        .pdf-vital-value {
          font-size: 0.85rem;
          font-weight: 700;
          color: #0f172a;
          margin-top: 2px;
        }
        .pdf-reflection-text {
          font-size: 0.85rem;
          color: #334155;
          margin: 0;
          line-height: 1.5;
          font-style: italic;
        }
        .pdf-category-section {
          margin-bottom: 12px;
        }
        .pdf-category-section:last-child {
          margin-bottom: 0;
        }
        .pdf-category-header {
          font-size: 0.8rem;
          color: #475569;
          margin: 0 0 6px 0;
          padding-bottom: 2px;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 700;
        }
        .pdf-habits-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .pdf-habit-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
          padding: 2px 0;
        }
        .pdf-habit-name {
          font-weight: 500;
          flex: 1;
        }
        .pdf-habit-time {
          color: #94a3b8;
          font-size: 0.75rem;
          margin-right: 12px;
        }
        .pdf-habit-status {
          font-weight: 700;
          font-size: 0.75rem;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .pdf-habit-status.done {
          color: #16a34a;
          background: #dcfce7;
        }
        .pdf-habit-status.missed {
          color: #dc2626;
          background: #fee2e2;
        }
        .pdf-daily-stats-footer {
          display: flex;
          justify-content: space-around;
          background: #f8fafc;
          border-radius: 12px;
          padding: 12px;
          border: 1px solid #e2e8f0;
          margin-bottom: 20px;
        }
        .pdf-stat-col {
          text-align: center;
        }
        .pdf-stat-lbl {
          display: block;
          font-size: 0.65rem;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
        }
        .pdf-stat-val {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
        }
        @media print {
          body {
            background: #ffffff;
            color: #0f172a;
          }
          .pdf-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 10mm 15mm 15mm 15mm !important;
            page-break-after: always;
          }
        }
      </style>
    </head>
    <body>
      <!-- Page 1: cover / Summary -->
      <div class="pdf-page">
        <div class="pdf-header">
          <span class="pdf-app-title">My Habit Tracker</span>
          <span class="pdf-report-type">Monthly Report</span>
        </div>
        
        <div class="pdf-title-section">
          <h1>Monthly Habit Report</h1>
          <p>${monthNameStr}</p>
        </div>
        
        <div class="pdf-stats-grid">
          <div class="pdf-stat-card">
            <span class="pdf-stat-label">Success Rate</span>
            <span class="pdf-stat-value">${overallSuccessRate}%</span>
          </div>
          <div class="pdf-stat-card">
            <span class="pdf-stat-label">Current Streak</span>
            <span class="pdf-stat-value">${currentStreak} Days</span>
          </div>
          <div class="pdf-stat-card">
            <span class="pdf-stat-label">Longest Streak</span>
            <span class="pdf-stat-value">${longestStreak} Days</span>
          </div>
          <div class="pdf-stat-card">
            <span class="pdf-stat-label">Days Tracked</span>
            <span class="pdf-stat-value">${daysTracked}</span>
          </div>
          <div class="pdf-stat-card">
            <span class="pdf-stat-label">Completed</span>
            <span class="pdf-stat-value">${totalCompletedCount}</span>
          </div>
          <div class="pdf-stat-card">
            <span class="pdf-stat-label">Missed</span>
            <span class="pdf-stat-value">${totalMissedCount}</span>
          </div>
        </div>
        
        <div class="pdf-card">
          <h3 class="pdf-card-title">📈 Weekly / Monthly Performance Chart</h3>
          <div style="margin: 8px 0;">
            ${svgChart}
          </div>
        </div>
        
        <div style="display: flex; gap: 16px; margin-bottom: 20px;">
          <div class="pdf-card" style="flex: 1.2; margin-bottom: 0;">
            <h3 class="pdf-card-title">🥗 Category Performance</h3>
            <table class="pdf-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Completed</th>
                  <th>Total</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                ${categoryTableRows}
              </tbody>
            </table>
          </div>
          
          <div class="pdf-card" style="flex: 0.8; margin-bottom: 0;">
            <h3 class="pdf-card-title">💪 Category Strength</h3>
            ${categoryStrengthProgress}
          </div>
        </div>
        
        <div class="pdf-card">
          <h3 class="pdf-card-title">🏆 Habit Consistency Rankings</h3>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 600; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">
            <span style="flex: 1; padding-right: 8px;">Most Consistent</span>
            <span style="flex: 1; padding-left: 8px;">Needs Improvement</span>
          </div>
          ${rankingsHTML}
        </div>
        
        <div class="pdf-motivation-card">
          <h3>${motivationTitle}</h3>
          <p>${motivationMsg}</p>
        </div>
        
        <div class="pdf-footer">
          <span>Generated by My Habit Tracker</span>
          <span>${monthNameStr}</span>
          <span>Page 1 / ${monthlyKeys.length + 1}</span>
        </div>
      </div>
      
      <!-- Daily Pages -->
      ${dailyPagesHTML}
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  
  // Wait a small duration for graphics and rendering to stabilize, then trigger browser print
  setTimeout(() => {
    printWindow.print();
  }, 750);
}

/**
 * Register Service Worker for PWA
 */
export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .then(reg => console.log("Service Worker registered successfully:", reg.scope))
        .catch(err => console.error("Service Worker registration failed:", err));
    });
  }
}

// Setup mobile menu dynamically
function initMobileMenu() {
  const navbarContainer = document.querySelector(".navbar-container");
  if (!navbarContainer) return;
  if (document.getElementById("navMenuToggleBtn")) return;

  // Create menu toggle button
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "nav-menu-toggle";
  toggleBtn.id = "navMenuToggleBtn";
  toggleBtn.ariaLabel = "Toggle Navigation Menu";
  toggleBtn.innerHTML = `
    <span class="bar"></span>
    <span class="bar"></span>
    <span class="bar"></span>
  `;
  navbarContainer.appendChild(toggleBtn);

  // Create drawer HTML
  const drawerContainer = document.createElement("div");
  drawerContainer.innerHTML = `
    <div class="mobile-nav-drawer" id="mobileNavDrawer">
      <div class="drawer-header">
        <div class="drawer-brand">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary); filter: drop-shadow(0 0 4px var(--primary));">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
          Habits Menu
        </div>
        <button class="drawer-close-btn" id="drawerCloseBtn" aria-label="Close menu">&times;</button>
      </div>
      <div class="drawer-body">
        <a href="index.html" class="drawer-link" id="drawerTodayBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Dashboard
        </a>
        <a href="history.html" class="drawer-link" id="drawerHistoryBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          History Logs
        </a>
        <a href="stats.html" class="drawer-link" id="drawerStatsBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          Analytics Stats
        </a>
        <a href="settings.html" class="drawer-link" id="drawerSettingsBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.5 1z"/></svg>
          Settings
        </a>
      </div>
      <div class="drawer-footer">
        <button class="drawer-theme-toggle" id="drawerThemeToggleBtn" aria-label="Toggle light/dark theme">
          <span class="theme-label">Theme Mode</span>
          <span class="drawer-theme-icon">🌙</span>
        </button>
      </div>
    </div>
    <div class="drawer-overlay" id="drawerOverlay"></div>
  `;
  document.body.appendChild(drawerContainer);

  const drawer = document.getElementById("mobileNavDrawer");
  const overlay = document.getElementById("drawerOverlay");
  const closeBtn = document.getElementById("drawerCloseBtn");
  const drawerThemeToggleBtn = document.getElementById("drawerThemeToggleBtn");
  const drawerThemeIcon = drawerContainer.querySelector(".drawer-theme-icon");

  // Sync initial theme icon inside drawer
  const updateDrawerThemeIcon = () => {
    const theme = document.documentElement.getAttribute("data-theme") || "dark";
    if (drawerThemeIcon) {
      drawerThemeIcon.textContent = theme === "dark" ? "🌙" : "☀️";
    }
  };
  updateDrawerThemeIcon();

  // Toggle drawer open/close
  const toggleDrawer = () => {
    drawer.classList.toggle("active");
    overlay.classList.toggle("active");
    toggleBtn.classList.toggle("active");
    updateDrawerThemeIcon();
  };

  toggleBtn.addEventListener("click", toggleDrawer);
  closeBtn.addEventListener("click", toggleDrawer);
  overlay.addEventListener("click", toggleDrawer);

  // Handle drawer theme toggle click
  drawerThemeToggleBtn.addEventListener("click", () => {
    toggleTheme();
    updateDrawerThemeIcon();
    
    // Check if there is an active theme toggle switch in settings.html or app.js and sync them
    const themeToggleSwitch = document.getElementById("themeToggleSwitch");
    if (themeToggleSwitch) {
      const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
      themeToggleSwitch.checked = currentTheme === "dark";
    }
  });

  // Determine and mark active link
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf("/") + 1);
  const activeId = page === "history.html" ? "drawerHistoryBtn" :
                   page === "stats.html" ? "drawerStatsBtn" :
                   page === "settings.html" ? "drawerSettingsBtn" : 
                   "drawerTodayBtn"; // default index.html
  
  const activeLink = document.getElementById(activeId);
  if (activeLink) {
    activeLink.classList.add("active");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMobileMenu);
} else {
  initMobileMenu();
}

/**
 * Retrieve the active notification container or create it if not present.
 * This prevents duplicate container elements.
 */
export function getOrCreateNotificationContainer() {
  let container = document.getElementById('notificationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'notification-container';
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Standard Toast Notification system
 * Renders in the top-right corner, stacks vertically, handles auto-dismissal and close animations.
 */
export function showToast(options = {}) {
  const {
    title = "",
    message = "",
    bodyHtml = "",
    type = "info",
    actions = [],
    duration = 3000,
    onDismiss = null
  } = options;

  const container = getOrCreateNotificationContainer();

  const toast = document.createElement('div');
  toast.className = "notification-toast";

  // Set borders dynamically according to type
  if (type === "warning") {
    toast.style.borderColor = "var(--warning)";
  } else if (type === "success") {
    toast.style.borderColor = "var(--success)";
  } else if (type === "info") {
    toast.style.borderColor = "var(--primary)";
  } else {
    toast.style.borderColor = "var(--accent)";
  }

  // Determine emoji icon
  let emoji = "ℹ️";
  if (type === "success") emoji = "✅";
  else if (type === "warning") emoji = "⚠️";
  else if (type === "bell") emoji = "🔔";

  // HTML template
  toast.innerHTML = `
    <div class="notification-header">
      <span>${emoji}</span>
      <span class="notification-title">${title}</span>
      <button class="toast-close-btn" aria-label="Close notification">&times;</button>
    </div>
    <div class="notification-body">
      ${bodyHtml ? bodyHtml : message}
    </div>
  `;

  // Render actions if specified
  if (actions && actions.length > 0) {
    const actionsContainer = document.createElement('div');
    actionsContainer.className = "notification-actions";
    
    actions.forEach(act => {
      const btn = document.createElement('button');
      btn.className = `notify-btn ${act.className || ''}`;
      if (act.id) btn.id = act.id;
      if (act.style) {
        Object.assign(btn.style, act.style);
      }
      btn.textContent = act.text;
      
      btn.addEventListener('click', (e) => {
        if (act.onClick) {
          act.onClick(e, dismiss);
        } else {
          dismiss();
        }
      });
      
      actionsContainer.appendChild(btn);
    });
    
    toast.appendChild(actionsContainer);
  }

  let isDismissed = false;
  let timerId = null;

  // Dismiss action helper
  const dismiss = () => {
    if (isDismissed) return;
    isDismissed = true;

    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }

    toast.classList.add('dismissing');

    // Wait for the exit animation to complete (300ms) before removing from DOM
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      if (onDismiss) {
        onDismiss();
      }
    }, 300);
  };

  // Add click listener to close button
  const closeBtn = toast.querySelector('.toast-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
    });
  }

  container.appendChild(toast);

  // Auto dismissal after specified duration
  if (duration && duration > 0) {
    timerId = setTimeout(dismiss, duration);
  }

  return {
    element: toast,
    dismiss: dismiss
  };
}

