/**
 * My Daily Habit Tracker - Main Application
 * Coordinates UI rendering, event listeners, trackers, notifications, and heatmap.
 */

import { DEFAULT_HABITS, StorageManager } from './storage.js';
import { 
  getDailyQuote, 
  formatHeaderDate, 
  toISODateString, 
  updateDigitalClock, 
  playSuccessChime, 
  playNotificationSound,
  initTheme, 
  toggleTheme,
  registerServiceWorker
} from './utils.js';

class HabitTrackerApp {
  constructor() {
    this.currentDate = new Date();
    this.todayStr = StorageManager.formatDate(this.currentDate);
    this.snoozedHabits = {}; // id -> timestamp to remind again
    this.notifiedHabits = new Set(); // ids notified today to prevent repeat spam
    this.notifiedGroups10Min = new Set(); // time groups warned today

    // Initialize theme and storage
    initTheme();
    registerServiceWorker();
    StorageManager.runAutoCleanup();
    StorageManager.initToday(this.todayStr);



    // Cache DOM Elements
    this.dom = {
      loadingOverlay: document.getElementById('loadingOverlay'),
      currentDayDate: document.getElementById('currentDayDate'),
      navClockDisplay: document.getElementById('navClockDisplay'),
      dashboardGreeting: document.getElementById('dashboardGreeting'),
      dashboardHeaderQuote: document.getElementById('dashboardHeaderQuote'),
      todayProgressPercent: document.getElementById('todayProgressPercent'),
      todayProgressRing: document.getElementById('todayProgressRing'),
      completedCountLabel: document.getElementById('completedCountLabel'),
      remainingCountLabel: document.getElementById('remainingCountLabel'),
      streakStatusText: document.getElementById('streakStatusText'),
      dailyQuoteText: document.getElementById('dailyQuoteText'),
      timelineSchedule: document.getElementById('timelineSchedule'),
      dailyNotesInput: document.getElementById('dailyNotesInput'),
      heatmapTitle: document.getElementById('heatmapTitle'),
      heatmapGridContainer: document.getElementById('heatmapGridContainer'),
      celebrationOverlay: document.getElementById('celebrationOverlay'),
      dismissCelebrationBtn: document.getElementById('dismissCelebrationBtn'),
      notificationContainer: document.getElementById('notificationContainer'),
      themeToggleBtn: document.getElementById('themeToggleBtn'),
      
      // Trackers
      moodTrackerCard: document.getElementById('moodTrackerCard'),
      waterTrackerCard: document.getElementById('waterTrackerCard'),
      sleepTrackerCard: document.getElementById('sleepTrackerCard'),
      togglesTrackerCard: document.getElementById('togglesTrackerCard'),
      waterAmountText: document.getElementById('waterAmountText'),
      sleepHoursText: document.getElementById('sleepHoursText'),
      toggleGymBtn: document.getElementById('toggleGymBtn'),
      toggleFruitBtn: document.getElementById('toggleFruitBtn'),
      waterMinusBtn: document.getElementById('waterMinusBtn'),
      waterPlusBtn: document.getElementById('waterPlusBtn'),
      sleepMinusBtn: document.getElementById('sleepMinusBtn'),
      sleepPlusBtn: document.getElementById('sleepPlusBtn'),
      
      // Schedule Modal Elements
      scheduleModal: document.getElementById('scheduleModal'),
      scheduleModalTitle: document.getElementById('scheduleModalTitle'),
      closeScheduleModalBtn: document.getElementById('closeScheduleModalBtn'),
      scheduleTimeInput: document.getElementById('scheduleTimeInput'),
      scheduleCategorySelect: document.getElementById('scheduleCategorySelect'),
      scheduleItemsList: document.getElementById('scheduleItemsList'),
      addScheduleItemBtn: document.getElementById('addScheduleItemBtn'),
      deleteScheduleBtn: document.getElementById('deleteScheduleBtn'),
      cancelScheduleBtn: document.getElementById('cancelScheduleBtn'),
      saveScheduleBtn: document.getElementById('saveScheduleBtn'),
      addScheduleBtn: document.getElementById('addScheduleBtn')
    };

    // Binding methods
    this.init();
  }

  init() {
    this.setupLiveClockAndDates();
    this.setupEventListeners();
    this.renderChecklist();
    this.renderTrackers();
    this.renderHeatmap();
    this.updateDashboardProgress();
    this.startNotificationChecks();

    // Hide loader with a premium fade-out effect
    setTimeout(() => {
      this.dom.loadingOverlay.classList.add('fade-out');
    }, 400);

    // Setup PWA install promotion trigger
    this.setupPwaPromo();
  }

  setupLiveClockAndDates() {
    // Start Clock
    updateDigitalClock('navClockDisplay');

    // Render Current Day & Date
    this.dom.currentDayDate.textContent = formatHeaderDate(this.currentDate);

    // Greeting based on time
    const hours = this.currentDate.getHours();
    let greeting = "Good Evening";
    if (hours < 12) {
      greeting = "Good Morning";
    } else if (hours < 17) {
      greeting = "Good Afternoon";
    }
    
    // Retrieve username from settings (default "Dhinesh")
    let userName = "Dhinesh";
    const rawData = StorageManager.getRawData();
    if (rawData.settings && rawData.settings.userName) {
      userName = rawData.settings.userName;
    }
    this.dom.dashboardGreeting.textContent = `${greeting}, ${userName} 👋`;

    // Render Daily Inspiration quote
    const dailyQuote = getDailyQuote(this.todayStr);
    this.dom.dailyQuoteText.textContent = `"${dailyQuote}"`;
  }

  setupEventListeners() {
    // Theme Toggle
    this.dom.themeToggleBtn.addEventListener('click', () => {
      toggleTheme();
    });

    // Notes auto-save on typing
    this.dom.dailyNotesInput.value = StorageManager.getDayData(this.todayStr)?.__tracker_notes || "";
    this.dom.dailyNotesInput.addEventListener('input', (e) => {
      StorageManager.updateTracker(this.todayStr, "notes", e.target.value);
    });

    // Water Tracker Buttons
    this.dom.waterMinusBtn.addEventListener('click', () => this.adjustWater(-1));
    this.dom.waterPlusBtn.addEventListener('click', () => this.adjustWater(1));

    // Sleep Tracker Buttons
    this.dom.sleepMinusBtn.addEventListener('click', () => this.adjustSleep(-1));
    this.dom.sleepPlusBtn.addEventListener('click', () => this.adjustSleep(1));

    // Mood click selectors
    const moodButtons = this.dom.moodTrackerCard.querySelectorAll('.mood-btn');
    moodButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.getAttribute('data-mood');
        moodButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        StorageManager.updateTracker(this.todayStr, "mood", mood);
      });
    });

    // Check pre-selected mood on load
    const savedMood = StorageManager.getDayData(this.todayStr)?.__tracker_mood;
    if (savedMood) {
      const activeMoodBtn = this.dom.moodTrackerCard.querySelector(`.mood-btn[data-mood="${savedMood}"]`);
      if (activeMoodBtn) activeMoodBtn.classList.add('selected');
    }

    // Daily Toggles buttons
    this.dom.toggleGymBtn.addEventListener('click', () => this.toggleSimpleTracker("gym", this.dom.toggleGymBtn));
    this.dom.toggleFruitBtn.addEventListener('click', () => this.toggleSimpleTracker("fruit", this.dom.toggleFruitBtn));

    // Dismiss Celebration overlay
    this.dom.dismissCelebrationBtn.addEventListener('click', () => {
      this.dom.celebrationOverlay.classList.remove('active');
    });

    // Schedule Editor Modal Events
    this.dom.closeScheduleModalBtn.addEventListener('click', () => {
      this.dom.scheduleModal.classList.remove('active');
    });
    this.dom.cancelScheduleBtn.addEventListener('click', () => {
      this.dom.scheduleModal.classList.remove('active');
    });
    this.dom.scheduleModal.addEventListener('click', (e) => {
      if (e.target === this.dom.scheduleModal) {
        this.dom.scheduleModal.classList.remove('active');
      }
    });

    this.dom.addScheduleItemBtn.addEventListener('click', () => {
      this.addNewHabitInputRow("");
    });

    this.dom.saveScheduleBtn.addEventListener('click', () => {
      this.saveScheduleChanges();
    });

    this.dom.deleteScheduleBtn.addEventListener('click', () => {
      this.deleteScheduleGroup();
    });

    this.dom.addScheduleBtn.addEventListener('click', () => {
      this.openScheduleCreator();
    });

    // Handle offline status notification
    window.addEventListener('offline', () => {
      this.showLocalNotification("Offline Mode", "Working offline. Changes will save locally.", "info");
    });
    window.addEventListener('online', () => {
      this.showLocalNotification("Back Online", "Your progress is synced with Local Storage.", "success");
    });
  }

  // Adjust water level
  adjustWater(amount) {
    const dayData = StorageManager.getDayData(this.todayStr);
    let water = (dayData?.__tracker_water || 0) + amount;
    if (water < 0) water = 0;
    StorageManager.updateTracker(this.todayStr, "water", water);
    this.dom.waterAmountText.innerHTML = `${water} <span>Glasses</span>`;
  }

  // Adjust sleep hours
  adjustSleep(amount) {
    const dayData = StorageManager.getDayData(this.todayStr);
    let sleep = (dayData?.__tracker_sleep || 0) + amount;
    if (sleep < 0) sleep = 0;
    if (sleep > 24) sleep = 24;
    StorageManager.updateTracker(this.todayStr, "sleep", sleep);
    this.dom.sleepHoursText.innerHTML = `${sleep} <span>Hrs</span>`;
  }

  // Toggle simple true/false trackers (Gym, Fruits)
  toggleSimpleTracker(key, element) {
    const dayData = StorageManager.getDayData(this.todayStr);
    const active = !(dayData?.[`__tracker_${key}`] || false);
    StorageManager.updateTracker(this.todayStr, key, active);
    if (active) {
      element.classList.add('active');
      element.setAttribute('aria-checked', 'true');
    } else {
      element.classList.remove('active');
      element.setAttribute('aria-checked', 'false');
    }
  }

  renderTrackers() {
    const data = StorageManager.getDayData(this.todayStr) || {};
    
    // Water
    const water = data.__tracker_water || 0;
    this.dom.waterAmountText.innerHTML = `${water} <span>Glasses</span>`;

    // Sleep
    const sleep = data.__tracker_sleep || 0;
    this.dom.sleepHoursText.innerHTML = `${sleep} <span>Hrs</span>`;

    // Gym toggle UI
    if (data.__tracker_gym) {
      this.dom.toggleGymBtn.classList.add('active');
      this.dom.toggleGymBtn.setAttribute('aria-checked', 'true');
    }

    // Fruit toggle UI
    if (data.__tracker_fruit) {
      this.dom.toggleFruitBtn.classList.add('active');
      this.dom.toggleFruitBtn.setAttribute('aria-checked', 'true');
    }
  }

  renderChecklist() {
    this.dom.timelineSchedule.innerHTML = "";
    
    // Group habits by time slots
    const grouped = {};
    DEFAULT_HABITS.forEach(habit => {
      if (!grouped[habit.time]) {
        grouped[habit.time] = [];
      }
      grouped[habit.time].push(habit);
    });

    const dayData = StorageManager.getDayData(this.todayStr) || {};

    Object.keys(grouped).forEach(timeSlot => {
      const habits = grouped[timeSlot];
      
      // Determine if all habits in this time slot are checked
      const allChecked = habits.every(h => dayData[h.id] === true);

      // Create Group Container
      const groupEl = document.createElement('div');
      groupEl.className = "time-slot-group";
      groupEl.innerHTML = `
        <div class="time-slot-header">
          <span class="time-slot-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${timeSlot}
          </span>
          <button class="group-toggle-btn ${allChecked ? 'all-checked' : ''}" data-time="${timeSlot}" aria-label="Mark all habits in slot as complete">
            ${allChecked ? '✓ Checked All' : 'Toggle All'}
          </button>
        </div>
        <div class="habit-list" id="list-${timeSlot.replace(/\s+/g, '-')}"></div>
      `;

      this.dom.timelineSchedule.appendChild(groupEl);
      
      const headerEl = groupEl.querySelector('.time-slot-header');
      headerEl.setAttribute('title', 'Double-click to edit this schedule');
      headerEl.addEventListener('dblclick', (e) => {
        if (e.target.closest('.group-toggle-btn')) return;
        this.openScheduleEditor(timeSlot);
      });

      const listContainer = groupEl.querySelector('.habit-list');

      // Render each habit row
      habits.forEach(habit => {
        const completed = dayData[habit.id] === true;
        const timestamp = dayData.__timestamps?.[habit.id] || "";

        const habitRow = document.createElement('div');
        habitRow.className = `habit-item ${completed ? 'completed' : ''}`;
        habitRow.setAttribute('data-id', habit.id);
        habitRow.innerHTML = `
          <div class="habit-item-left">
            <div class="custom-checkbox-wrapper">
              <input type="checkbox" class="habit-checkbox-hidden" ${completed ? 'checked' : ''}>
              <span class="checkbox-display">
                <svg viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
            </div>
            <span class="habit-text">${habit.name}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${timestamp ? `<span class="habit-time-stamp">${timestamp}</span>` : ''}
            <span class="habit-status-badge">${completed ? 'Completed' : 'Todo'}</span>
          </div>
        `;

        // Click event on whole item row (makes tapping targets very large)
        habitRow.addEventListener('click', (e) => {
          // Avoid double triggers if clicked on inputs directly
          if (e.target.tagName === 'INPUT') return;
          
          const checkbox = habitRow.querySelector('.habit-checkbox-hidden');
          checkbox.checked = !checkbox.checked;
          this.handleHabitToggle(habit.id, checkbox.checked, habitRow);
        });

        // Trigger checkbox changes
        const checkboxInput = habitRow.querySelector('.habit-checkbox-hidden');
        checkboxInput.addEventListener('change', (e) => {
          this.handleHabitToggle(habit.id, e.target.checked, habitRow);
        });

        listContainer.appendChild(habitRow);
      });

      // Hook up slot Group toggle click
      const toggleGroupBtn = groupEl.querySelector('.group-toggle-btn');
      toggleGroupBtn.addEventListener('click', () => {
        const currentlyAllChecked = toggleGroupBtn.classList.contains('all-checked');
        const makeCompleted = !currentlyAllChecked;

        habits.forEach(habit => {
          const habitItemRow = listContainer.querySelector(`[data-id="${habit.id}"]`);
          const cb = habitItemRow.querySelector('.habit-checkbox-hidden');
          if (cb.checked !== makeCompleted) {
            cb.checked = makeCompleted;
            this.handleHabitToggle(habit.id, makeCompleted, habitItemRow, false); // batch mode, play chime once later
          }
        });

        // Play chime on completion batch
        if (makeCompleted) {
          playSuccessChime();
        }

        // Re-evaluate group button label
        if (makeCompleted) {
          toggleGroupBtn.classList.add('all-checked');
          toggleGroupBtn.textContent = '✓ Checked All';
        } else {
          toggleGroupBtn.classList.remove('all-checked');
          toggleGroupBtn.textContent = 'Toggle All';
        }
        
        this.updateDashboardProgress();
      });
    });
  }

  handleHabitToggle(habitId, completed, habitRowEl, updateProgressImmediately = true) {
    StorageManager.setHabitStatus(this.todayStr, habitId, completed);
    
    // Audio feedback on checking (Web Audio oscillator)
    if (completed && updateProgressImmediately) {
      playSuccessChime();
    }

    // Animate item
    const badge = habitRowEl.querySelector('.habit-status-badge');
    const timestampWrapper = habitRowEl.querySelector('.habit-item-left').nextElementSibling;
    
    if (completed) {
      habitRowEl.classList.add('completed');
      badge.textContent = 'Completed';
      
      // Render timestamp
      const freshDayData = StorageManager.getDayData(this.todayStr);
      const timeStampVal = freshDayData.__timestamps?.[habitId] || "";
      
      timestampWrapper.innerHTML = `
        <span class="habit-time-stamp">${timeStampVal}</span>
        <span class="habit-status-badge">Completed</span>
      `;
    } else {
      habitRowEl.classList.remove('completed');
      badge.textContent = 'Todo';
      timestampWrapper.innerHTML = `<span class="habit-status-badge">Todo</span>`;
    }

    // Sync group-level parent button states
    this.refreshGroupHeaders();

    if (updateProgressImmediately) {
      this.updateDashboardProgress();
    }
  }

  refreshGroupHeaders() {
    const dayData = StorageManager.getDayData(this.todayStr) || {};
    const grouped = {};
    DEFAULT_HABITS.forEach(habit => {
      if (!grouped[habit.time]) grouped[habit.time] = [];
      grouped[habit.time].push(habit);
    });

    Object.keys(grouped).forEach(timeSlot => {
      const habits = grouped[timeSlot];
      const allChecked = habits.every(h => dayData[h.id] === true);
      const btn = this.dom.timelineSchedule.querySelector(`.group-toggle-btn[data-time="${timeSlot}"]`);
      if (btn) {
        if (allChecked) {
          btn.className = "group-toggle-btn all-checked";
          btn.textContent = "✓ Checked All";
        } else {
          btn.className = "group-toggle-btn";
          btn.textContent = "Toggle All";
        }
      }
    });
  }

  updateDashboardProgress() {
    const stats = StorageManager.getDayCompletionStats(this.todayStr);
    
    // Percentage text
    this.dom.todayProgressPercent.textContent = `${stats.percent}%`;
    this.dom.completedCountLabel.textContent = stats.completedCount;
    this.dom.remainingCountLabel.textContent = stats.totalCount - stats.completedCount;

    // SVG Circular Ring stroke-dashoffset calculation
    // Circle circumference = 301.6
    const offset = 301.6 - (301.6 * stats.percent) / 100;
    this.dom.todayProgressRing.style.strokeDashoffset = offset;

    // Streaks metrics display
    const streaks = StorageManager.getStreakMetrics();
    this.dom.streakStatusText.textContent = `Streak: ${streaks.currentStreak} day${streaks.currentStreak === 1 ? '' : 's'} 🔥`;

    // Trigger full screen celebration if 100% completed
    if (stats.percent === 100 && stats.totalCount > 0) {
      // Check if we already celebrated today (prevent annoying popups on reloading)
      const sessionCelebrated = sessionStorage.getItem(`celebrated_${this.todayStr}`);
      if (!sessionCelebrated) {
        this.triggerCelebration();
        sessionStorage.setItem(`celebrated_${this.todayStr}`, 'true');
      }
    }

    // Refresh monthly heatmap to update today's square
    this.renderHeatmap();
  }

  triggerCelebration() {
    this.dom.celebrationOverlay.classList.add('active');
    
    // Run lightweight HTML5 canvas confetti
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '10001';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#3B82F6', '#60A5FA', '#22C55E', '#EAB308', '#EC4899', '#A855F7'];
    const particles = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.4,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        velX: (Math.random() - 0.5) * 16,
        velY: (Math.random() - 0.7) * 20,
        gravity: 0.45,
        drag: 0.98,
        spin: Math.random() * 360,
        spinSpeed: (Math.random() - 0.5) * 10
      });
    }

    const animateConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.velY += p.gravity;
        p.velX *= p.drag;
        p.velY *= p.drag;
        p.x += p.velX;
        p.y += p.velY;
        p.spin += p.spinSpeed;

        if (p.y < canvas.height + 20) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.spin * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (alive) {
        requestAnimationFrame(animateConfetti);
      } else {
        document.body.removeChild(canvas);
      }
    };

    animateConfetti();
  }

  // Render contribution style heatmap calendar grid for CURRENT MONTH
  renderHeatmap() {
    this.dom.heatmapGridContainer.innerHTML = "";

    const currentYear = this.currentDate.getFullYear();
    const currentMonth = this.currentDate.getMonth(); // 0-indexed

    // Format Month Header (e.g. "July 2026")
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    this.dom.heatmapTitle.textContent = `${monthNames[currentMonth]} ${currentYear} Heatmap`;

    // Render Weekday Labels (S, M, T, W, T, F, S)
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    labels.forEach(label => {
      const labelEl = document.createElement('div');
      labelEl.className = "heatmap-day-label";
      labelEl.textContent = label;
      this.dom.heatmapGridContainer.appendChild(labelEl);
    });

    // Get first day and length of the month
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Pad starting days of month
    for (let i = 0; i < firstDayIndex; i++) {
      const spacer = document.createElement('div');
      spacer.className = "heatmap-day disabled-day";
      spacer.innerHTML = `<span>&nbsp;</span>`;
      this.dom.heatmapGridContainer.appendChild(spacer);
    }

    const rawData = StorageManager.getRawData();

    // Render actual day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDateObj = new Date(currentYear, currentMonth, day);
      const dayStr = StorageManager.formatDate(dayDateObj);
      
      const dayEl = document.createElement('div');
      dayEl.className = "heatmap-day";
      dayEl.innerHTML = `<span>${day}</span>`;

      // Hover tooltip content
      let tooltipText = `${day} ${monthNames[currentMonth]} - No Data`;

      // Determine state color
      const isFuture = dayDateObj > this.currentDate;
      const isToday = dayStr === this.todayStr;

      if (isFuture) {
        dayEl.classList.add('future');
        tooltipText = `${day} ${monthNames[currentMonth]} (Future)`;
      } else {
        const stats = StorageManager.getDayCompletionStats(dayStr);
        const dayRecordExists = rawData[dayStr] !== undefined;

        if (!dayRecordExists) {
          // Empty state: disable symbol
          dayEl.classList.add('empty');
          tooltipText = `${day} ${monthNames[currentMonth]} - Unmarked`;
        } else {
          // Color based on percentage thresholds
          tooltipText = `${day} ${monthNames[currentMonth]} - ${stats.percent}% (${stats.completedCount}/${stats.totalCount})`;
          
          if (stats.completedCount === 0) {
            dayEl.classList.add('empty');
          } else if (stats.percent < 30) {
            dayEl.classList.add('low');
          } else if (stats.percent < 80) {
            dayEl.classList.add('medium');
          } else {
            dayEl.classList.add('high');
          }
        }
      }

      // Add tooltip
      const tooltip = document.createElement('div');
      tooltip.className = "heatmap-day-tooltip";
      tooltip.textContent = tooltipText;
      dayEl.appendChild(tooltip);

      // Modal detailed review popup on past days click
      if (!isFuture) {
        dayEl.addEventListener('click', () => {
          // Redirect to history page and pass the selected date in query params
          window.location.href = `history.html?date=${dayStr}`;
        });
      }

      this.dom.heatmapGridContainer.appendChild(dayEl);
    }
  }

  getMinutesFromTimeString(timeStr) {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  }

  // Habits live notification scheduler check
  startNotificationChecks() {
    const checkScheduleTimes = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const timeStr = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;

      const currentSecs = now.getTime();
      const dayData = StorageManager.getDayData(this.todayStr) || {};

      // 1. Standard Due Now Alarms
      DEFAULT_HABITS.forEach(habit => {
        const cleanHabitTime = habit.time.split('–')[0].trim();
        
        let formattedCheckTime = cleanHabitTime;
        if (/^\d\:\d{2}/.test(cleanHabitTime)) {
          formattedCheckTime = "0" + cleanHabitTime;
        }

        const isHabitDue = timeStr === formattedCheckTime;
        const alreadyCompleted = dayData[habit.id] === true;

        if (isHabitDue && !alreadyCompleted) {
          const snoozeExpiry = this.snoozedHabits[habit.id];
          const isSnoozed = snoozeExpiry && currentSecs < snoozeExpiry;

          if (!isSnoozed && !this.notifiedHabits.has(habit.id)) {
            this.showHabitReminderNotification(habit);
            this.notifiedHabits.add(habit.id);
          }
        }
      });

      // 2. WhatsApp 10-Minute Meal Warnings
      const rawSettings = StorageManager.getRawData().settings || {};
      const waEnabled = rawSettings.whatsappEnabled === true;
      const waPhone = rawSettings.whatsappPhone || "";

      if (waEnabled && waPhone) {
        const groupedByTime = {};
        DEFAULT_HABITS.forEach(h => {
          if (!groupedByTime[h.time]) groupedByTime[h.time] = [];
          groupedByTime[h.time].push(h);
        });

        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        Object.keys(groupedByTime).forEach(timeSlot => {
          const habits = groupedByTime[timeSlot];
          const cleanTime = timeSlot.split('–')[0].trim();
          const scheduledMinutes = this.getMinutesFromTimeString(cleanTime);
          
          if (scheduledMinutes === null) return; // skip skincare/sleep categories without times

          const triggerMinutes = scheduledMinutes - 10;

          if (currentMinutes === triggerMinutes) {
            const pending = habits.filter(h => dayData[h.id] !== true);

            if (pending.length > 0 && !this.notifiedGroups10Min.has(timeSlot)) {
              this.show10MinWarningNotification(timeSlot, pending, waPhone);
              this.notifiedGroups10Min.add(timeSlot);
            }
          }
        });
      }
    };

    // Run check immediately and check every 30 seconds
    checkScheduleTimes();
    setInterval(checkScheduleTimes, 30000);
  }

  show10MinWarningNotification(timeSlot, pendingHabits, phone) {
    playNotificationSound();

    const toast = document.createElement('div');
    toast.className = "notification-toast";
    toast.style.borderColor = "var(--accent)";
    
    const waMsg = `🔔 *Meal Reminder (10m Warning)*: In 10 minutes, it is time to:\n${pendingHabits.map(h => `- ${h.name}`).join('\n')}\n\nConsistency builds results! 💪`;
    const waUrl = `https://wa.me/${phone.replace(/\+/g, '')}?text=${encodeURIComponent(waMsg)}`;
    const timeSlotClean = timeSlot.replace(/[^a-zA-Z0-9]/g, '');

    toast.innerHTML = `
      <div class="notification-header">
        <span class="notification-bell">🔔</span>
        <span class="notification-title" style="color:var(--accent); font-weight:700;">Meal Warning (10m)</span>
      </div>
      <div class="notification-body">
        In 10 minutes (at <strong>${timeSlot}</strong>), it is time to:
        <ul style="margin: 6px 0 0 16px; padding: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">
          ${pendingHabits.map(h => `<li>${h.name}</li>`).join('')}
        </ul>
      </div>
      <div class="notification-actions">
        <button class="notify-btn dismiss" id="wa-dismiss-${timeSlotClean}">Dismiss</button>
        <button class="notify-btn complete" id="wa-complete-${timeSlotClean}" style="background:var(--accent); color:#fff;">Mark Done</button>
        <a href="${waUrl}" target="_blank" class="notify-btn complete" id="wa-send-${timeSlotClean}" style="background:var(--success); color:#fff; text-decoration:none; display:inline-flex; align-items:center; gap:4px; font-weight:600;">📲 Send WhatsApp</a>
      </div>
    `;

    this.dom.notificationContainer.appendChild(toast);

    // Bind event clicks
    document.getElementById(`wa-dismiss-${timeSlotClean}`).addEventListener('click', () => {
      this.dismissToast(toast);
    });

    document.getElementById(`wa-complete-${timeSlotClean}`).addEventListener('click', () => {
      pendingHabits.forEach(h => {
        const row = this.dom.timelineSchedule.querySelector(`[data-id="${h.id}"]`);
        if (row) {
          const checkbox = row.querySelector('.habit-checkbox-hidden');
          checkbox.checked = true;
          this.handleHabitToggle(h.id, true, row, false);
        } else {
          StorageManager.setHabitStatus(this.todayStr, h.id, true);
        }
      });
      playSuccessChime();
      this.updateDashboardProgress();
      this.dismissToast(toast);
    });

    document.getElementById(`wa-send-${timeSlotClean}`).addEventListener('click', () => {
      this.showLocalNotification("WhatsApp Alert", "Redirected to WhatsApp message dispatch.", "success");
    });
  }


  showHabitReminderNotification(habit) {
    playNotificationSound();

    const toast = document.createElement('div');
    toast.className = "notification-toast";
    toast.innerHTML = `
      <div class="notification-header">
        <span class="notification-bell">🔔</span>
        <span class="notification-title">Habit Reminder</span>
      </div>
      <div class="notification-body">
        Time to complete your habit: <strong>${habit.name}</strong> (${habit.time})
      </div>
      <div class="notification-actions">
        <button class="notify-btn dismiss" id="dismiss-${habit.id.replace(/[^a-zA-Z0-9]/g, '')}">Dismiss</button>
        <button class="notify-btn snooze" id="snooze-${habit.id.replace(/[^a-zA-Z0-9]/g, '')}">Snooze 10m</button>
        <button class="notify-btn complete" id="complete-${habit.id.replace(/[^a-zA-Z0-9]/g, '')}">Complete</button>
      </div>
    `;

    this.dom.notificationContainer.appendChild(toast);

    // Event hooks
    const escapeId = habit.id.replace(/[^a-zA-Z0-9]/g, '');
    
    document.getElementById(`dismiss-${escapeId}`).addEventListener('click', () => {
      this.dismissToast(toast);
    });

    document.getElementById(`snooze-${escapeId}`).addEventListener('click', () => {
      // Snooze for 10 minutes in milliseconds
      this.snoozedHabits[habit.id] = new Date().getTime() + 10 * 60 * 1000;
      this.notifiedHabits.delete(habit.id); // clear from notified set to trigger again later
      this.dismissToast(toast);
      this.showLocalNotification("Snoozed", `Reminding you in 10 minutes for ${habit.name}.`, "info");
    });

    document.getElementById(`complete-${escapeId}`).addEventListener('click', () => {
      const timelineRow = this.dom.timelineSchedule.querySelector(`[data-id="${habit.id}"]`);
      if (timelineRow) {
        const checkbox = timelineRow.querySelector('.habit-checkbox-hidden');
        checkbox.checked = true;
        this.handleHabitToggle(habit.id, true, timelineRow);
      } else {
        // Fallback if not rendered
        StorageManager.setHabitStatus(this.todayStr, habit.id, true);
        playSuccessChime();
        this.updateDashboardProgress();
      }
      this.dismissToast(toast);
    });
  }

  dismissToast(toastEl) {
    toastEl.classList.add('dismissing');
    setTimeout(() => {
      if (toastEl.parentNode) {
        this.dom.notificationContainer.removeChild(toastEl);
      }
    }, 300);
  }

  showLocalNotification(title, message, type = "info") {
    const toast = document.createElement('div');
    toast.className = "notification-toast";
    
    let emoji = "ℹ️";
    if (type === "success") emoji = "✅";
    else if (type === "warning") emoji = "⚠️";

    toast.innerHTML = `
      <div class="notification-header">
        <span>${emoji}</span>
        <span class="notification-title">${title}</span>
      </div>
      <div class="notification-body">${message}</div>
    `;

    this.dom.notificationContainer.appendChild(toast);
    setTimeout(() => this.dismissToast(toast), 4000);
  }

  // PWA Add-to-Homescreen promo integration
  setupPwaPromo() {
    let deferredPrompt;
    const banner = document.getElementById('pwaPromoBanner');
    const installBtn = document.getElementById('pwaInstallBtn');
    const dismissBtn = document.getElementById('pwaDismissBtn');

    if (!banner) return;

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Mini-infobar from appearing on mobile
      e.preventDefault();
      deferredPrompt = e;
      
      // Check if user dismissed previously in this session
      if (!sessionStorage.getItem('pwa_dismissed')) {
        banner.style.display = 'flex';
      }
    });

    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      banner.style.display = 'none';
      deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      deferredPrompt = null;
    });

    dismissBtn.addEventListener('click', () => {
      banner.style.display = 'none';
      sessionStorage.setItem('pwa_dismissed', 'true');
    });
  }

  // --- Schedule Editor Methods ---

  openScheduleEditor(timeSlot) {
    this.editingTimeSlot = timeSlot;
    this.dom.scheduleModalTitle.textContent = `Edit Schedule: ${timeSlot}`;
    this.dom.deleteScheduleBtn.style.display = "block"; // Show delete button in edit mode

    // Fetch habits in this time slot
    const groupHabits = DEFAULT_HABITS.filter(h => h.time === timeSlot);
    
    // Set fields
    this.dom.scheduleTimeInput.value = timeSlot;
    this.dom.scheduleCategorySelect.value = groupHabits[0]?.category || "morning";

    // Populate habit rows
    this.dom.scheduleItemsList.innerHTML = "";
    groupHabits.forEach(h => {
      this.addNewHabitInputRow(h.name, h.id);
    });

    if (groupHabits.length === 0) {
      this.addNewHabitInputRow("");
    }

    this.dom.scheduleModal.classList.add('active');
  }

  openScheduleCreator() {
    this.editingTimeSlot = null;
    this.dom.scheduleModalTitle.textContent = "Add New Schedule";
    this.dom.deleteScheduleBtn.style.display = "none"; // Hide delete button in create mode

    // Reset fields
    this.dom.scheduleTimeInput.value = "";
    this.dom.scheduleCategorySelect.value = "morning";
    
    // Reset items list with one empty row
    this.dom.scheduleItemsList.innerHTML = "";
    this.addNewHabitInputRow("");

    this.dom.scheduleModal.classList.add('active');
    this.dom.scheduleTimeInput.focus();
  }

  addNewHabitInputRow(name = "", habitId = "") {
    const row = document.createElement('div');
    row.className = "schedule-item-row";
    
    const input = document.createElement('input');
    input.type = "text";
    input.className = "schedule-input habit-item-input";
    input.value = name;
    input.placeholder = "e.g. Drink Water";
    if (habitId) {
      input.setAttribute('data-id', habitId);
    }
    
    const deleteBtn = document.createElement('button');
    deleteBtn.type = "button";
    deleteBtn.className = "delete-item-btn";
    deleteBtn.title = "Remove Item";
    deleteBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
    `;
    deleteBtn.addEventListener('click', () => {
      row.remove();
    });
    
    row.appendChild(input);
    row.appendChild(deleteBtn);
    this.dom.scheduleItemsList.appendChild(row);
    
    if (!name) {
      input.focus();
    }
  }

  saveScheduleChanges() {
    const newTime = this.dom.scheduleTimeInput.value.trim();
    if (!newTime) {
      this.showLocalNotification("Validation Error", "Please enter a time slot name.", "warning");
      this.dom.scheduleTimeInput.focus();
      return;
    }

    const category = this.dom.scheduleCategorySelect.value;
    
    // Collect non-empty habit item names
    const itemInputs = this.dom.scheduleItemsList.querySelectorAll('.habit-item-input');
    const newItems = [];
    itemInputs.forEach(input => {
      const val = input.value.trim();
      if (val) {
        newItems.push({
          id: input.getAttribute('data-id') || null,
          name: val
        });
      }
    });

    if (newItems.length === 0) {
      this.showLocalNotification("Validation Error", "Please add at least one habit item.", "warning");
      return;
    }

    let updatedHabits;

    if (this.editingTimeSlot === null) {
      // Creator Mode: append new group
      const habitsToAppend = newItems.map(item => {
        const id = `${newTime}|${item.name}`;
        return {
          id,
          time: newTime,
          name: item.name,
          category
        };
      });
      updatedHabits = [...DEFAULT_HABITS, ...habitsToAppend];
      StorageManager.saveHabits(updatedHabits);
    } else {
      // Editor Mode: replace old group
      const otherHabits = DEFAULT_HABITS.filter(h => h.time !== this.editingTimeSlot);
      const currentGroupHabits = DEFAULT_HABITS.filter(h => h.time === this.editingTimeSlot);
      
      const updatedGroupHabits = newItems.map(item => {
        const id = `${newTime}|${item.name}`;
        return {
          id,
          time: newTime,
          name: item.name,
          category
        };
      });

      // Data Migration logic for completion state today
      const todayStr = this.todayStr;
      const rawData = StorageManager.getRawData();
      const dayData = rawData[todayStr];
      const migrationMap = {};
      
      currentGroupHabits.forEach((oldHabit, idx) => {
        const newHabit = updatedGroupHabits[idx];
        if (newHabit && oldHabit.id !== newHabit.id) {
          migrationMap[oldHabit.id] = newHabit.id;
        }
      });

      if (dayData) {
        Object.keys(migrationMap).forEach(oldId => {
          const newId = migrationMap[oldId];
          if (dayData[oldId] !== undefined) {
            dayData[newId] = dayData[oldId];
            delete dayData[oldId];
          }
          if (dayData.__timestamps && dayData.__timestamps[oldId] !== undefined) {
            dayData.__timestamps[newId] = dayData.__timestamps[oldId];
            delete dayData.__timestamps[oldId];
          }
        });
        StorageManager.saveRawData(rawData);
      }

      updatedHabits = [...otherHabits, ...updatedGroupHabits];
      StorageManager.saveHabits(updatedHabits);
    }

    // Close Modal
    this.dom.scheduleModal.classList.remove('active');
    
    // UI Feedback
    playSuccessChime();
    this.showLocalNotification("Schedule Saved", "Your habits schedule has been updated.", "success");
    
    // Refresh Today
    this.renderChecklist();
    this.updateDashboardProgress();
  }

  deleteScheduleGroup() {
    if (!this.editingTimeSlot) return;

    if (!confirm(`Are you sure you want to delete the schedule group for "${this.editingTimeSlot}"? All habits in this group will be removed.`)) {
      return;
    }

    const updatedHabits = DEFAULT_HABITS.filter(h => h.time !== this.editingTimeSlot);
    StorageManager.saveHabits(updatedHabits);

    this.dom.scheduleModal.classList.remove('active');
    this.showLocalNotification("Deleted Group", `Removed all habits for "${this.editingTimeSlot}".`, "warning");
    
    this.renderChecklist();
    this.updateDashboardProgress();
  }
}

// Instantiate App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new HabitTrackerApp();
});
