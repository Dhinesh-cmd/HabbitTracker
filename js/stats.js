/**
 * My Daily Habit Tracker - Stats Page Controller
 * Calculates advanced analytics, ranks habits, and renders custom SVG line/bar charts without external libraries.
 */

import { DEFAULT_HABITS, StorageManager, CATEGORIES } from './storage.js';
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
      trackedDaysVal: document.getElementById('trackedDaysVal'),
      trackedDaysFooter: document.getElementById('trackedDaysFooter'),
      avgRateVal: document.getElementById('avgRateVal'),
      currentStreakVal: document.getElementById('currentStreakVal'),
      currentStreakSubtext: document.getElementById('currentStreakSubtext'),
      longestStreakVal: document.getElementById('longestStreakVal'),
      
      // Charts
      weeklyChartContainer: document.getElementById('weeklyChartContainer'),
      categoryChartContainer: document.getElementById('categoryChartContainer'),
      todayProgressBreakdown: document.getElementById('todayProgressBreakdown'),
      categoryLeaderboardList: document.getElementById('categoryLeaderboardList'),
      
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

    // Bottom Nav FAB click
    const bottomNavAddBtn = document.getElementById('bottomNavAddBtn');
    if (bottomNavAddBtn) {
      bottomNavAddBtn.addEventListener('click', () => {
        window.location.href = 'index.html?openAdd=true';
      });
    }

    // Load data and draw views
    this.calculateMetrics();
    this.renderCharts();



    this.setupPageTransitions();
  }

  calculateMetrics() {
    const rawData = StorageManager.getRawData();
    const dates = Object.keys(rawData).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
    const totalDaysCount = dates.length;

    // Streaks
    const streaks = StorageManager.getStreakMetrics();
    this.dom.currentStreakVal.innerHTML = `${streaks.currentStreak} <span>Days</span>`;
    this.dom.longestStreakVal.innerHTML = `${streaks.longestStreak} <span>Days</span>`;

    // Days Tracked
    this.dom.trackedDaysVal.innerHTML = `${totalDaysCount} <span>Days</span>`;
    this.dom.trackedDaysFooter.textContent = totalDaysCount === 1 ? "1 day logged" : `${totalDaysCount} total records`;

    // Average Rate
    let sumPercentages = 0;
    dates.forEach(dStr => {
      const stats = StorageManager.getDayCompletionStats(dStr);
      sumPercentages += stats.percent;
    });

    const averageRate = totalDaysCount > 0 ? Math.round(sumPercentages / totalDaysCount) : 0;
    this.dom.avgRateVal.textContent = `${averageRate}%`;

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
    } else {
      this.dom.bestDayDate.textContent = "No Data";
      this.dom.bestDayName.textContent = "No entries tracked";
      this.dom.bestDayScore.textContent = "0%";
      this.dom.worstDayDate.textContent = "No Data";
      this.dom.worstDayName.textContent = "No entries tracked";
      this.dom.worstDayScore.textContent = "0%";
    }

    // Habit Consistency Calculations
    this.calculateHabitConsistency(rawData, dates);
    
    // Today's Progress Breakdown
    this.calculateTodayBreakdown(rawData);
  }

  calculateTodayBreakdown(rawData) {
    this.dom.todayProgressBreakdown.innerHTML = "";

    if (DEFAULT_HABITS.length === 0) {
      this.dom.todayProgressBreakdown.innerHTML = `<span style="font-size:0.85rem;color:var(--text-muted);">No routines scheduled for today.</span>`;
      return;
    }

    let overallCompleted = 0;
    let overallTotal = 0;

    // Filter categories that actually have habits defined today
    const activeCategories = CATEGORIES.filter(cat => {
      const stats = StorageManager.getCategoryStats(this.todayStr, cat.id);
      return stats.total > 0;
    });

    activeCategories.forEach(c => {
      const stats = StorageManager.getCategoryStats(this.todayStr, c.id);
      overallCompleted += stats.completed;
      overallTotal += stats.total;

      const row = document.createElement('div');
      row.className = "today-breakdown-row";
      row.innerHTML = `
        <div class="today-breakdown-meta">
          <span style="font-weight:600;"><span style="color:${c.color}; font-size:1.1rem; margin-right:4px;">${c.icon}</span>${c.name}</span>
          <span style="font-weight:700;">${stats.completed} / ${stats.total}</span>
        </div>
      `;
      this.dom.todayProgressBreakdown.appendChild(row);
    });

    const overallRate = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;
    const overallRow = document.createElement('div');
    overallRow.className = "today-breakdown-row today-breakdown-overall";
    overallRow.innerHTML = `
      <div class="today-breakdown-meta">
        <span>Overall</span>
        <span style="color:var(--success); font-weight:800;">${overallCompleted} / ${overallTotal} (${overallRate}%)</span>
      </div>
    `;
    this.dom.todayProgressBreakdown.appendChild(overallRow);
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
    if (list.length === 0) {
      containerEl.innerHTML = `<span style="font-size:0.85rem;color:var(--text-muted);">No routines defined.</span>`;
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    list.forEach((item, idx) => {
      const medal = isMissed ? '' : (medals[idx] ? medals[idx] + ' ' : '');
      const row = document.createElement('div');
      row.className = "habit-analytics-row";
      row.innerHTML = `
        <div class="habit-analytics-left">
          <span class="habit-analytics-name">${medal}${item.name}</span>
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

    const rawData = StorageManager.getRawData();
    const dates = Object.keys(rawData).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));

    if (dates.length === 0) {
      this.dom.weeklyChartContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: var(--text-secondary); width: 100%;">
          <span style="font-size: 0.9rem; font-weight: 500;">No analytics available yet.</span>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">Complete your habits for a few days to unlock insights.</p>
        </div>
      `;
      return;
    }

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

    if (totalDays === 0) {
      this.dom.categoryChartContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: var(--text-secondary); width: 100%;">
          <span style="font-size: 0.9rem; font-weight: 500;">No analytics available yet.</span>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">Complete your habits for a few days to unlock insights.</p>
        </div>
      `;
      if (this.dom.categoryLeaderboardList) {
        this.dom.categoryLeaderboardList.innerHTML = `<span style="font-size:0.85rem;color:var(--text-muted);">No entries tracked yet.</span>`;
      }
      return;
    }

    // Map each category to its current day statistics
    const sortedCategories = CATEGORIES.map(c => {
      const stats = StorageManager.getCategoryStats(this.todayStr, c.id);
      return {
        cat: c.id,
        rate: stats.percentage,
        completed: stats.completed,
        total: stats.total,
        meta: { label: `${c.icon} ${c.name}`, color: c.color }
      };
    }).filter(item => item.total > 0); // only show categories with scheduled habits

    sortedCategories.forEach(item => {
      const strengthRow = document.createElement('div');
      strengthRow.style.width = "100%";
      strengthRow.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 1.15rem;">${item.meta.label.split(' ')[0]}</span>
            <span>${item.meta.label.substring(item.meta.label.indexOf(' ') + 1)}</span>
          </span>
          <span style="font-weight: 700; color: var(--accent);">${item.rate}%</span>
        </div>
        <div class="card-progress-bar-bg" style="height: 8px; margin-top: 0;">
          <div class="card-progress-bar-fill high" style="width: ${item.rate}%; background-color: ${item.meta.color};"></div>
        </div>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 6px;">
          ${item.completed} / ${item.total} Habits
        </div>
      `;
      this.dom.categoryChartContainer.appendChild(strengthRow);
    });

    // Populate Leaderboard list
    if (this.dom.categoryLeaderboardList) {
      this.dom.categoryLeaderboardList.innerHTML = "";
      const leaderboardData = [...sortedCategories].sort((a, b) => b.rate - a.rate || b.completed - a.completed);
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣'];
      
      leaderboardData.forEach((item, idx) => {
        const medal = medals[idx] ? medals[idx] + ' ' : `${idx + 1} `;
        const row = document.createElement('div');
        row.className = "leaderboard-row";
        row.innerHTML = `
          <div class="leaderboard-info">
            <span class="leaderboard-rank">${medal}</span>
            <span class="leaderboard-name">${item.meta.label.substring(item.meta.label.indexOf(' ') + 1)}</span>
          </div>
          <span class="leaderboard-rate">${item.rate}%</span>
        `;
        this.dom.categoryLeaderboardList.appendChild(row);
      });
    }
  }

  setupPageTransitions() {
    // Hide loader with a premium fade-out effect
    setTimeout(() => {
      if (this.dom.loadingOverlay) {
        this.dom.loadingOverlay.classList.add('fade-out');
      }
    }, 50);

    const navLinks = document.querySelectorAll('.bottom-nav-item, .nav-links a, .nav-brand');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || href === '#' || href === window.location.pathname.split('/').pop()) return;
        
        e.preventDefault();
        
        if (link.classList.contains('bottom-nav-item')) {
          document.querySelectorAll('.bottom-nav-item').forEach(item => item.classList.remove('active'));
          link.classList.add('active');
        }
        
        if (this.dom.loadingOverlay) {
          this.dom.loadingOverlay.classList.remove('fade-out');
        }
        
        setTimeout(() => {
          window.location.href = href;
        }, 50);
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new StatsPageController();
});
