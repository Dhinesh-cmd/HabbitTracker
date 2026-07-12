/**
 * My Daily Habit Tracker - History Script
 * Handles logs listing, filtering, search, sorting, modal detail inspections, and day record deletions.
 */

import { DEFAULT_HABITS, StorageManager } from './storage.js';
import { 
  getDailyQuote, 
  formatHeaderDate, 
  updateDigitalClock, 
  initTheme, 
  toggleTheme,
  registerServiceWorker
} from './utils.js';

class HistoryPageController {
  constructor() {
    this.currentDate = new Date();
    this.todayStr = StorageManager.formatDate(this.currentDate);
    this.historyData = {};
    this.selectedDayToDelete = null;

    // Initialize layout settings
    initTheme();
    registerServiceWorker();

    
    // Cache DOM Elements
    this.dom = {
      loadingOverlay: document.getElementById('loadingOverlay'),
      currentDayDate: document.getElementById('currentDayDate'),
      themeToggleBtn: document.getElementById('themeToggleBtn'),
      historySearchInput: document.getElementById('historySearchInput'),
      completionFilterSelect: document.getElementById('completionFilterSelect'),
      historySortSelect: document.getElementById('historySortSelect'),
      historyGridContainer: document.getElementById('historyGridContainer'),
      
      // Detail Modal
      dayDetailModal: document.getElementById('dayDetailModal'),
      modalDateTitle: document.getElementById('modalDateTitle'),
      modalDayTitle: document.getElementById('modalDayTitle'),
      closeDetailModalBtn: document.getElementById('closeDetailModalBtn'),
      modalProgressRing: document.getElementById('modalProgressRing'),
      modalProgressPercent: document.getElementById('modalProgressPercent'),
      modalCompletedLabel: document.getElementById('modalCompletedLabel'),
      modalTotalLabel: document.getElementById('modalTotalLabel'),
      modalQuoteLabel: document.getElementById('modalQuoteLabel'),
      modalMoodVal: document.getElementById('modalMoodVal'),
      modalWaterVal: document.getElementById('modalWaterVal'),
      modalSleepVal: document.getElementById('modalSleepVal'),
      modalGymVal: document.getElementById('modalGymVal'),
      modalNotesWrapper: document.getElementById('modalNotesWrapper'),
      modalNotesVal: document.getElementById('modalNotesVal'),
      modalHabitsListContainer: document.getElementById('modalHabitsListContainer'),

      // Delete Confirm Modal
      deleteConfirmModal: document.getElementById('deleteConfirmModal'),
      deleteTargetDateLabel: document.getElementById('deleteTargetDateLabel'),
      cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
      confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
      notificationContainer: document.getElementById('notificationContainer')
    };

    this.init();
  }

  init() {
    // Setup clock and dates
    updateDigitalClock('navClockDisplay');
    this.dom.currentDayDate.textContent = formatHeaderDate(this.currentDate);

    // Setup events
    this.setupEventListeners();

    // Fetch and render data
    this.loadAndDisplayLogs();

    // Check for search query params (heatmap redirects)
    this.handleUrlQueryParameters();

    this.setupPageTransitions();
  }

  setupEventListeners() {
    // Theme Toggle
    this.dom.themeToggleBtn.addEventListener('click', () => {
      toggleTheme();
    });

    // Filtering & Sorting listeners
    this.dom.historySearchInput.addEventListener('input', () => this.loadAndDisplayLogs());
    this.dom.completionFilterSelect.addEventListener('change', () => this.loadAndDisplayLogs());
    this.dom.historySortSelect.addEventListener('change', () => this.loadAndDisplayLogs());

    // Close Detail Modal
    this.dom.closeDetailModalBtn.addEventListener('click', () => {
      this.dom.dayDetailModal.classList.remove('active');
    });

    // Close details when clicking outside content frame
    this.dom.dayDetailModal.addEventListener('click', (e) => {
      if (e.target === this.dom.dayDetailModal) {
        this.dom.dayDetailModal.classList.remove('active');
      }
    });

    // Delete Modal Actions
    this.dom.cancelDeleteBtn.addEventListener('click', () => {
      this.dom.deleteConfirmModal.classList.remove('active');
      this.selectedDayToDelete = null;
    });

    this.dom.confirmDeleteBtn.addEventListener('click', () => {
      if (this.selectedDayToDelete) {
        if (this.dom.loadingOverlay) {
          this.dom.loadingOverlay.classList.remove('fade-out');
        }
        
        StorageManager.deleteDayData(this.selectedDayToDelete);
        const deletedDay = this.selectedDayToDelete;
        this.selectedDayToDelete = null;
        
        setTimeout(() => {
          this.showLocalToast("Deleted", `History record for ${deletedDay} was deleted.`, "warning");
          this.dom.deleteConfirmModal.classList.remove('active');
          this.loadAndDisplayLogs();
          if (this.dom.loadingOverlay) {
            this.dom.loadingOverlay.classList.add('fade-out');
          }
        }, 300);
      }
    });

    // Bottom Nav FAB click
    const bottomNavAddBtn = document.getElementById('bottomNavAddBtn');
    if (bottomNavAddBtn) {
      bottomNavAddBtn.addEventListener('click', () => {
        window.location.href = 'index.html?openAdd=true';
      });
    }
  }

  loadAndDisplayLogs() {
    this.dom.historyGridContainer.innerHTML = "";

    const rawData = StorageManager.getRawData();
    
    // Filter keys for date formats (YYYY-MM-DD)
    const dates = Object.keys(rawData).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));

    if (dates.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Map log objects with stats
    let logs = dates.map(dateStr => {
      const stats = StorageManager.getDayCompletionStats(dateStr);
      const dayData = rawData[dateStr];
      return {
        date: dateStr,
        stats,
        notes: dayData.__tracker_notes || "",
        mood: dayData.__tracker_mood || "",
        water: dayData.__tracker_water || 0,
        sleep: dayData.__tracker_sleep || 0,
        gym: dayData.__tracker_gym || false
      };
    });

    // Apply Search matching notes, dates or habits
    const searchQuery = this.dom.historySearchInput.value.toLowerCase().trim();
    if (searchQuery) {
      logs = logs.filter(log => {
        // Date match
        if (log.date.includes(searchQuery)) return true;
        
        // Notes match
        if (log.notes.toLowerCase().includes(searchQuery)) return true;

        // Matches completed habit name list
        const matchingHabits = DEFAULT_HABITS.some(habit => {
          const wasCompleted = rawData[log.date][habit.id] === true;
          return wasCompleted && habit.name.toLowerCase().includes(searchQuery);
        });
        if (matchingHabits) return true;

        return false;
      });
    }

    // Apply Completion Filter Select range
    const filterType = this.dom.completionFilterSelect.value;
    if (filterType === "full") {
      logs = logs.filter(l => l.stats.percent === 100);
    } else if (filterType === "high") {
      logs = logs.filter(l => l.stats.percent >= 80);
    } else if (filterType === "med") {
      logs = logs.filter(l => l.stats.percent >= 30 && l.stats.percent < 80);
    } else if (filterType === "low") {
      logs = logs.filter(l => l.stats.percent < 30);
    }

    // Apply Sorting order
    const sortType = this.dom.historySortSelect.value;
    logs.sort((a, b) => {
      if (sortType === "newest") {
        return new Date(b.date) - new Date(a.date);
      } else if (sortType === "oldest") {
        return new Date(a.date) - new Date(b.date);
      } else if (sortType === "highest") {
        return b.stats.percent - a.stats.percent || new Date(b.date) - new Date(a.date);
      } else if (sortType === "lowest") {
        return a.stats.percent - b.stats.percent || new Date(b.date) - new Date(a.date);
      }
      return 0;
    });

    // Check empty lists after filters
    if (logs.length === 0) {
      this.renderEmptyState("No results match your filters. Try resetting search fields.");
      return;
    }

    // Render list
    logs.forEach(log => {
      const card = this.createHistoryCardElement(log);
      this.dom.historyGridContainer.appendChild(card);
    });
  }

  createHistoryCardElement(log) {
    const card = document.createElement('div');
    card.className = "glass-card history-card";
    
    const d = new Date(log.date);
    const dateFormatted = d.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
    const dayName = d.toLocaleDateString("en-GB", { weekday: 'long' });

    // Pick percentage color tag
    let colorClass = "low";
    if (log.stats.percent >= 80) colorClass = "high";
    else if (log.stats.percent >= 30) colorClass = "med";

    card.innerHTML = `
      <div>
        <div class="history-card-header">
          <div>
            <h3 class="history-card-date">${dateFormatted}</h3>
            <span class="history-card-day">${dayName}</span>
          </div>
          <button class="card-delete-btn" title="Delete log entry" aria-label="Delete entry">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
        
        <div class="history-card-stats">
          <div class="history-percent-badge ${colorClass}">${log.stats.percent}%</div>
          <span class="history-fraction">${log.stats.completedCount} / ${log.stats.totalCount} completed</span>
        </div>
      </div>
      
      <div class="card-progress-bar-bg">
        <div class="card-progress-bar-fill ${colorClass}" style="width: ${log.stats.percent}%"></div>
      </div>
    `;

    // Row Click leads to detail modal popup
    card.addEventListener('click', (e) => {
      // Avoid firing if delete button is clicked
      if (e.target.closest('.card-delete-btn')) {
        e.stopPropagation();
        this.openDeleteConfirmationModal(log.date);
        return;
      }
      this.openDayDetailModal(log.date);
    });

    return card;
  }

  renderEmptyState(message = "No habits tracked yet. Complete habits on the home page dashboard to log your progress here!") {
    this.dom.historyGridContainer.innerHTML = `
      <div class="empty-state-container" style="grid-column: 1 / -1;">
        <div class="empty-state-illustration">🗓️</div>
        <h3>No History Found</h3>
        <p style="margin-top: 8px; font-size: 0.9rem; max-width: 320px;">${message}</p>
      </div>
    `;
  }

  openDayDetailModal(dateStr) {
    const rawData = StorageManager.getRawData();
    const dayData = rawData[dateStr];
    if (!dayData) return;

    const stats = StorageManager.getDayCompletionStats(dateStr);
    const d = new Date(dateStr);
    
    // Set Header
    this.dom.modalDateTitle.textContent = d.toLocaleDateString("en-GB", { day: '2-digit', month: 'long', year: 'numeric' });
    this.dom.modalDayTitle.textContent = d.toLocaleDateString("en-GB", { weekday: 'long' });

    // Progress circle
    this.dom.modalProgressPercent.textContent = `${stats.percent}%`;
    this.dom.modalCompletedLabel.textContent = stats.completedCount;
    this.dom.modalTotalLabel.textContent = stats.totalCount;

    const offset = 301.6 - (301.6 * stats.percent) / 100;
    this.dom.modalProgressRing.style.strokeDashoffset = offset;

    // Quote
    this.dom.modalQuoteLabel.textContent = `"${getDailyQuote(dateStr)}"`;

    // Mood Emoji conversion
    const moodEmojis = { happy: "😊", neutral: "😐", sad: "😔" };
    this.dom.modalMoodVal.textContent = moodEmojis[dayData.__tracker_mood] || "-";

    // Trackers
    this.dom.modalWaterVal.textContent = `${dayData.__tracker_water || 0} Glasses`;
    this.dom.modalSleepVal.textContent = `${dayData.__tracker_sleep || 0} Hours`;
    this.dom.modalGymVal.textContent = dayData.__tracker_gym ? "💪 Yes" : "No";

    // Notes
    if (dayData.__tracker_notes && dayData.__tracker_notes.trim()) {
      this.dom.modalNotesVal.textContent = dayData.__tracker_notes;
      this.dom.modalNotesWrapper.style.display = "block";
    } else {
      this.dom.modalNotesWrapper.style.display = "none";
    }

    // List of Habits Ticks & Misses
    this.dom.modalHabitsListContainer.innerHTML = "";
    
    DEFAULT_HABITS.forEach(habit => {
      const isCompleted = dayData[habit.id] === true;
      const completeTime = dayData.__timestamps?.[habit.id] || "";
      
      const row = document.createElement('div');
      row.className = "modal-habit-row";
      row.innerHTML = `
        <div class="modal-habit-info">
          <span style="font-size: 1.1rem;">${isCompleted ? '🟢' : '⚫'}</span>
          <span>${habit.name}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${isCompleted && completeTime ? `<span class="habit-time-stamp">${completeTime}</span>` : ''}
          <span class="modal-habit-status ${isCompleted ? 'done' : 'miss'}">
            ${isCompleted ? '✓ Done' : '✕ Missed'}
          </span>
        </div>
      `;
      this.dom.modalHabitsListContainer.appendChild(row);
    });

    // Display modal
    this.dom.dayDetailModal.classList.add('active');
  }

  openDeleteConfirmationModal(dateStr) {
    this.selectedDayToDelete = dateStr;
    this.dom.deleteTargetDateLabel.textContent = dateStr;
    this.dom.deleteConfirmModal.classList.add('active');
  }

  handleUrlQueryParameters() {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      // Auto open detailed popup modal
      this.openDayDetailModal(dateParam);
      
      // Clean query parameters from URL without reloading page
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }
  }

  showLocalToast(title, message, type = "info") {
    const toast = document.createElement('div');
    toast.className = "notification-toast";
    
    let emoji = "ℹ️";
    if (type === "warning") emoji = "⚠️";
    else if (type === "success") emoji = "✅";

    toast.innerHTML = `
      <div class="notification-header">
        <span>${emoji}</span>
        <span class="notification-title">${title}</span>
      </div>
      <div class="notification-body">${message}</div>
    `;

    this.dom.notificationContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('dismissing');
      setTimeout(() => {
        if (toast.parentNode) {
          this.dom.notificationContainer.removeChild(toast);
        }
      }, 300);
    }, 3500);
  }

  setupPageTransitions() {
    // Hide loader with a premium fade-out effect
    setTimeout(() => {
      if (this.dom.loadingOverlay) {
        this.dom.loadingOverlay.classList.add('fade-out');
      }
    }, 300);

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
        }, 150);
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new HistoryPageController();
});
