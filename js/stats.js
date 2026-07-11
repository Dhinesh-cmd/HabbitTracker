/**
 * My Daily Habit Tracker - Stats Page Controller
 * Calculates advanced analytics, ranks habits, and renders custom SVG line/bar charts without external libraries.
 */

import { DEFAULT_HABITS, StorageManager } from './storage.js';
import { 
  formatHeaderDate, 
  updateDigitalClock, 
  initTheme, 
  toggleTheme,
  registerServiceWorker
} from './utils.js';

class StatsPageController {
  constructor() {
    this.currentDate = new Date();
    this.todayStr = StorageManager.formatDate(this.currentDate);

    // Initialize layout
    initTheme();
    registerServiceWorker();


    // Cache elements
    this.dom = {
      loadingOverlay: document.getElementById('loadingOverlay'),
      currentDayDate: document.getElementById('currentDayDate'),
      themeToggleBtn: document.getElementById('themeToggleBtn'),
      
      // Metric fields
      todayScoreVal: document.getElementById('todayScoreVal'),
      todayScoreFraction: document.getElementById('todayScoreFraction'),
      avgRateVal: document.getElementById('avgRateVal'),
      trackedDaysCount: document.getElementById('trackedDaysCount'),
      currentStreakVal: document.getElementById('currentStreakVal'),
      currentStreakSubtext: document.getElementById('currentStreakSubtext'),
      longestStreakVal: document.getElementById('longestStreakVal'),
      
      // Charts
      weeklyChartContainer: document.getElementById('weeklyChartContainer'),
      categoryChartContainer: document.getElementById('categoryChartContainer'),
      
      // Lists
      consistentHabitsList: document.getElementById('consistentHabitsList'),
      missedHabitsList: document.getElementById('missedHabitsList'),
      bestDayDate: document.getElementById('bestDayDate'),
      bestDayName: document.getElementById('bestDayName'),
      bestDayScore: document.getElementById('bestDayScore'),
      worstDayDate: document.getElementById('worstDayDate'),
      worstDayName: document.getElementById('worstDayName'),
      worstDayScore: document.getElementById('worstDayScore')
    };

    this.init();
  }

  init() {
    // Setup clock and dates
    updateDigitalClock('navClockDisplay');
    this.dom.currentDayDate.textContent = formatHeaderDate(this.currentDate);

    // Bind theme
    this.dom.themeToggleBtn.addEventListener('click', () => {
      toggleTheme();
      // Re-render charts to adjust for light/dark style details
      this.renderCharts();
    });

    // Load data and draw views
    this.calculateMetrics();
    this.renderCharts();

    // Hide loader
    setTimeout(() => {
      this.dom.loadingOverlay.classList.add('fade-out');
    }, 300);
  }

  calculateMetrics() {
    const rawData = StorageManager.getRawData();
    const dates = Object.keys(rawData).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
    const totalDaysCount = dates.length;

    // Today's Score
    const todayStats = StorageManager.getDayCompletionStats(this.todayStr);
    this.dom.todayScoreVal.textContent = `${todayStats.percent}%`;
    this.dom.todayScoreFraction.textContent = `${todayStats.completedCount} / ${todayStats.totalCount} completed`;

    // Streaks
    const streaks = StorageManager.getStreakMetrics();
    this.dom.currentStreakVal.innerHTML = `${streaks.currentStreak} <span>Days</span>`;
    this.dom.longestStreakVal.innerHTML = `${streaks.longestStreak} <span>Days</span>`;

    // Average Rate
    let sumPercentages = 0;
    dates.forEach(dStr => {
      const stats = StorageManager.getDayCompletionStats(dStr);
      sumPercentages += stats.percent;
    });

    const averageRate = totalDaysCount > 0 ? Math.round(sumPercentages / totalDaysCount) : 0;
    this.dom.avgRateVal.textContent = `${averageRate}%`;
    this.dom.trackedDaysCount.textContent = `${totalDaysCount} day${totalDaysCount === 1 ? '' : 's'} tracked`;

    // Extremes (Best and Worst Days)
    if (totalDaysCount > 0) {
      let bestDay = { date: "", percent: -1 };
      let worstDay = { date: "", percent: 101 };

      dates.forEach(dStr => {
        const stats = StorageManager.getDayCompletionStats(dStr);
        if (stats.percent > bestDay.percent) {
          bestDay = { date: dStr, percent: stats.percent };
        }
        if (stats.percent < worstDay.percent) {
          worstDay = { date: dStr, percent: stats.percent };
        }
      });

      const bestDateObj = new Date(bestDay.date);
      this.dom.bestDayDate.textContent = bestDateObj.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
      this.dom.bestDayName.textContent = bestDateObj.toLocaleDateString("en-GB", { weekday: 'long' });
      this.dom.bestDayScore.textContent = `${bestDay.percent}%`;

      const worstDateObj = new Date(worstDay.date);
      this.dom.worstDayDate.textContent = worstDateObj.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
      this.dom.worstDayName.textContent = worstDateObj.toLocaleDateString("en-GB", { weekday: 'long' });
      this.dom.worstDayScore.textContent = `${worstDay.percent}%`;
    }

    // Habit Consistency Calculations
    this.calculateHabitConsistency(rawData, dates);
  }

  calculateHabitConsistency(rawData, dates) {
    const totalDays = dates.length;
    if (totalDays === 0) {
      this.dom.consistentHabitsList.innerHTML = `<span style="font-size:0.85rem;color:var(--text-muted);">No entries tracked yet.</span>`;
      this.dom.missedHabitsList.innerHTML = `<span style="font-size:0.85rem;color:var(--text-muted);">No entries tracked yet.</span>`;
      return;
    }

    const habitCounters = {};
    DEFAULT_HABITS.forEach(h => {
      habitCounters[h.id] = { name: h.name, completed: 0 };
    });

    dates.forEach(dateStr => {
      const dayData = rawData[dateStr];
      DEFAULT_HABITS.forEach(h => {
        if (dayData[h.id] === true) {
          habitCounters[h.id].completed++;
        }
      });
    });

    // Convert to list with rate
    const habitStats = Object.keys(habitCounters).map(id => {
      const count = habitCounters[id].completed;
      const rate = Math.round((count / totalDays) * 100);
      return {
        id,
        name: habitCounters[id].name,
        completedCount: count,
        rate
      };
    });

    // Sort for Consistent (highest rate first) and Missed (lowest rate first)
    const sortedConsistent = [...habitStats].sort((a, b) => b.rate - a.rate || b.completedCount - a.completedCount);
    const sortedMissed = [...habitStats].sort((a, b) => a.rate - b.rate || a.completedCount - b.completedCount);

    this.renderHabitAnalytics(sortedConsistent.slice(0, 3), this.dom.consistentHabitsList, false);
    this.renderHabitAnalytics(sortedMissed.slice(0, 3), this.dom.missedHabitsList, true);
  }

  renderHabitAnalytics(list, containerEl, isMissed = false) {
    containerEl.innerHTML = "";
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = "habit-analytics-row";
      row.innerHTML = `
        <div class="habit-analytics-left">
          <span class="habit-analytics-name">${item.name}</span>
          <span class="habit-analytics-meta">${item.completedCount} completions across all records</span>
        </div>
        <div class="analytics-percent-badge ${isMissed ? 'danger-badge' : ''}">${item.rate}%</div>
      `;
      containerEl.appendChild(row);
    });
  }

  renderCharts() {
    this.renderWeeklyTrendChart();
    this.renderCategoryChart();
  }

  renderWeeklyTrendChart() {
    this.dom.weeklyChartContainer.innerHTML = "";

    // Generate last 7 days dates YYYY-MM-DD
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(StorageManager.formatDate(d));
    }

    const percentages = last7Days.map(dateStr => {
      return StorageManager.getDayCompletionStats(dateStr).percent;
    });

    // Create SVG Element
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "chart-svg");
    svg.setAttribute("viewBox", "0 0 500 240");

    // Add Gradients for Area fill
    svg.innerHTML = `
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
    `;

    const width = 500;
    const height = 240;
    const paddingX = 40;
    const paddingY = 30;

    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingY * 2;

    const pointsCount = last7Days.length;
    const stepX = chartWidth / (pointsCount - 1);

    // Draw horizontal background grid lines (0%, 25%, 50%, 75%, 100%)
    for (let i = 0; i <= 4; i++) {
      const percentVal = i * 25;
      const yVal = paddingY + chartHeight - (percentVal / 100) * chartHeight;

      // Line
      const gridLine = document.createElementNS(svgNS, "line");
      gridLine.setAttribute("x1", paddingX);
      gridLine.setAttribute("y1", yVal);
      gridLine.setAttribute("x2", paddingX + chartWidth);
      gridLine.setAttribute("y2", yVal);
      gridLine.setAttribute("stroke", "var(--border-color)");
      gridLine.setAttribute("stroke-width", "1");
      if (i > 0 && i < 4) gridLine.setAttribute("stroke-dasharray", "4,4");
      svg.appendChild(gridLine);

      // Label Y axis
      const labelY = document.createElementNS(svgNS, "text");
      labelY.setAttribute("x", paddingX - 10);
      labelY.setAttribute("y", yVal + 4);
      labelY.setAttribute("text-anchor", "end");
      labelY.setAttribute("font-size", "10px");
      labelY.setAttribute("fill", "var(--text-muted)");
      labelY.setAttribute("font-weight", "600");
      labelY.textContent = `${percentVal}%`;
      svg.appendChild(labelY);
    }

    // Coordinates mapping
    const coordinates = percentages.map((percent, idx) => {
      const x = paddingX + idx * stepX;
      const y = paddingY + chartHeight - (percent / 100) * chartHeight;
      return { x, y, percent, dateStr: last7Days[idx] };
    });

    // Build line path
    let pathD = "";
    coordinates.forEach((pt, idx) => {
      if (idx === 0) pathD += `M ${pt.x} ${pt.y}`;
      else pathD += ` L ${pt.x} ${pt.y}`;
    });

    // Draw area path (gradient fill under line)
    if (coordinates.length > 0) {
      let areaD = pathD;
      areaD += ` L ${coordinates[coordinates.length - 1].x} ${paddingY + chartHeight}`;
      areaD += ` L ${coordinates[0].x} ${paddingY + chartHeight} Z`;

      const areaPath = document.createElementNS(svgNS, "path");
      areaPath.setAttribute("d", areaD);
      areaPath.setAttribute("fill", "url(#areaGradient)");
      svg.appendChild(areaPath);
    }

    // Draw main trend stroke line
    const trendLine = document.createElementNS(svgNS, "path");
    trendLine.setAttribute("d", pathD);
    trendLine.setAttribute("fill", "none");
    trendLine.setAttribute("stroke", "var(--primary)");
    trendLine.setAttribute("stroke-width", "3.5");
    trendLine.setAttribute("stroke-linecap", "round");
    svg.appendChild(trendLine);

    // Draw dots and X axis labels
    coordinates.forEach((pt, idx) => {
      // Circle dot
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", pt.x);
      circle.setAttribute("cy", pt.y);
      circle.setAttribute("r", "5.5");
      circle.setAttribute("fill", "var(--bg-color)");
      circle.setAttribute("stroke", "var(--primary)");
      circle.setAttribute("stroke-width", "2.5");
      svg.appendChild(circle);

      // Add small tooltip/value on top of dots
      const textVal = document.createElementNS(svgNS, "text");
      textVal.setAttribute("x", pt.x);
      textVal.setAttribute("y", pt.y - 10);
      textVal.setAttribute("text-anchor", "middle");
      textVal.setAttribute("font-size", "10px");
      textVal.setAttribute("font-weight", "700");
      textVal.setAttribute("fill", "var(--text-primary)");
      textVal.textContent = `${pt.percent}%`;
      svg.appendChild(textVal);

      // Label X axis (e.g. "Wed 08")
      const d = new Date(pt.dateStr);
      const dayAbbrev = d.toLocaleDateString("en-GB", { weekday: "short" });
      const dayNum = String(d.getDate()).padStart(2, "0");

      const labelX = document.createElementNS(svgNS, "text");
      labelX.setAttribute("x", pt.x);
      labelX.setAttribute("y", paddingY + chartHeight + 20);
      labelX.setAttribute("text-anchor", "middle");
      labelX.setAttribute("font-size", "10px");
      labelX.setAttribute("fill", "var(--text-secondary)");
      labelX.setAttribute("font-weight", "500");
      labelX.textContent = `${dayAbbrev} ${dayNum}`;
      svg.appendChild(labelX);
    });

    this.dom.weeklyChartContainer.appendChild(svg);
  }

  renderCategoryChart() {
    this.dom.categoryChartContainer.innerHTML = "";

    const rawData = StorageManager.getRawData();
    const dates = Object.keys(rawData).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
    const totalDays = dates.length;

    // Categories structure definition
    const categories = {
      morning: { label: "Morning", total: 0, completed: 0 },
      afternoon: { label: "Afternoon", total: 0, completed: 0 },
      evening: { label: "Evening", total: 0, completed: 0 },
      skincare: { label: "Skincare", total: 0, completed: 0 },
      night: { label: "Night Routine", total: 0, completed: 0 }
    };

    if (totalDays === 0) {
      this.dom.categoryChartContainer.innerHTML = `<span style="font-size:0.85rem;color:var(--text-muted);">No entries tracked yet.</span>`;
      return;
    }

    // Accumulate total possible checklist counters vs checked count
    dates.forEach(dStr => {
      const dayData = rawData[dStr];
      DEFAULT_HABITS.forEach(habit => {
        const cat = habit.category;
        if (categories[cat]) {
          categories[cat].total++;
          if (dayData[habit.id] === true) {
            categories[cat].completed++;
          }
        }
      });
    });

    // Prepare chart rows
    const dataRows = Object.keys(categories).map(key => {
      const item = categories[key];
      const rate = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
      return {
        label: item.label,
        rate
      };
    });

    // Render bar list dynamically as responsive vector nodes
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "chart-svg");
    svg.setAttribute("viewBox", "0 0 500 240");

    const paddingLeft = 100;
    const paddingRight = 50;
    const paddingTop = 20;
    const paddingBottom = 20;

    const chartWidth = 500 - paddingLeft - paddingRight;
    const chartHeight = 240 - paddingTop - paddingBottom;
    const barSpacing = chartHeight / dataRows.length;
    const barHeight = 16;

    dataRows.forEach((row, idx) => {
      const y = paddingTop + idx * barSpacing + (barSpacing - barHeight) / 2;

      // Label Category
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", paddingLeft - 12);
      label.setAttribute("y", y + 12);
      label.setAttribute("text-anchor", "end");
      label.setAttribute("font-size", "11px");
      label.setAttribute("font-weight", "600");
      label.setAttribute("fill", "var(--text-primary)");
      label.textContent = row.label;
      svg.appendChild(label);

      // Background bar track
      const barTrack = document.createElementNS(svgNS, "rect");
      barTrack.setAttribute("x", paddingLeft);
      barTrack.setAttribute("y", y);
      barTrack.setAttribute("width", chartWidth);
      barTrack.setAttribute("height", barHeight);
      barTrack.setAttribute("rx", "4");
      barTrack.setAttribute("fill", "var(--border-color)");
      svg.appendChild(barTrack);

      // Active fill bar
      const barFillWidth = (row.rate / 100) * chartWidth;
      const barFill = document.createElementNS(svgNS, "rect");
      barFill.setAttribute("x", paddingLeft);
      barFill.setAttribute("y", y);
      barFill.setAttribute("width", barFillWidth);
      barFill.setAttribute("height", barHeight);
      barFill.setAttribute("rx", "4");
      barFill.setAttribute("fill", "var(--primary)");
      svg.appendChild(barFill);

      // Label Percentage text next to bar
      const labelPercent = document.createElementNS(svgNS, "text");
      labelPercent.setAttribute("x", paddingLeft + barFillWidth + 8);
      labelPercent.setAttribute("y", y + 12);
      labelPercent.setAttribute("font-size", "11px");
      labelPercent.setAttribute("font-weight", "700");
      labelPercent.setAttribute("fill", "var(--accent)");
      labelPercent.textContent = `${row.rate}%`;
      svg.appendChild(labelPercent);
    });

    this.dom.categoryChartContainer.appendChild(svg);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new StatsPageController();
});
