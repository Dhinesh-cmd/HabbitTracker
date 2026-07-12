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
      scheduleItemsList: document.getElementById('scheduleItemsList'),
      addScheduleItemBtn: document.getElementById('addScheduleItemBtn'),
      deleteScheduleBtn: document.getElementById('deleteScheduleBtn'),
      cancelScheduleBtn: document.getElementById('cancelScheduleBtn'),
      saveScheduleBtn: document.getElementById('saveScheduleBtn'),
      
      // Redesigned UI Caches
      addRoutineHeaderBtn: document.getElementById('addRoutineHeaderBtn'),
      habitSearchInput: document.getElementById('habitSearchInput'),
      habitSortBtn: document.getElementById('habitSortBtn'),
      sortDropdownMenu: document.getElementById('sortDropdownMenu'),
      currentSortLabel: document.getElementById('currentSortLabel'),
      statTotalHabits: document.getElementById('statTotalHabits'),
      statCompletedHabits: document.getElementById('statCompletedHabits'),
      statPercentHabits: document.getElementById('statPercentHabits'),
      statActiveCategories: document.getElementById('statActiveCategories'),
      newHabitItemInput: document.getElementById('newHabitItemInput'),
      
      // Onboarding & Custom Edit Elements
      registrationModal: document.getElementById('registrationModal'),
      registrationForm: document.getElementById('registrationForm')
    };

    // Redesigned state variables
    this.activeFilter = 'all'; 
    this.activeSort = 'time'; 
    this.searchQuery = '';
    this.editorCategory = 'diet'; 
    this.editorHabitList = [];

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
    this.checkUserRegistration();

    // Hide loader with a premium fade-out effect
    setTimeout(() => {
      this.dom.loadingOverlay.classList.add('fade-out');
    }, 400);

    // Setup PWA install promotion trigger
    this.setupPwaPromo();

    // Check if openAdd query parameter is set to true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openAdd') === 'true') {
      setTimeout(() => {
        this.openScheduleCreator();
      }, 500);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    this.setupPageTransitions();
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
    
    // Retrieve username from habitTrackerUser or fallback
    let userName = "Dhinesh";
    const user = StorageManager.getUser();
    if (user && user.name) {
      userName = user.name;
    } else {
      const rawData = StorageManager.getRawData();
      if (rawData.settings && rawData.settings.userName) {
        userName = rawData.settings.userName;
      }
    }
    this.dom.dashboardGreeting.innerHTML = `${greeting},<br>${userName} 👋`;

    // Render Daily Inspiration quote
    const dailyQuote = getDailyQuote(this.todayStr);
    this.dom.dailyQuoteText.textContent = `"${dailyQuote}"`;

    // Also update subtitle if needed
    const subQuote = document.getElementById('dashboardHeaderQuote');
    if (subQuote) {
      subQuote.textContent = "Let's build another consistent day.";
    }
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
    if (this.dom.toggleGymBtn) {
      this.dom.toggleGymBtn.addEventListener('click', () => this.toggleSimpleTracker("gym", this.dom.toggleGymBtn));
    }
    if (this.dom.toggleFruitBtn) {
      this.dom.toggleFruitBtn.addEventListener('click', () => this.toggleSimpleTracker("fruit", this.dom.toggleFruitBtn));
    }

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
      this.addEditorHabitFromInput();
    });

    // Support enter key in modal habit text field
    if (this.dom.newHabitItemInput) {
      this.dom.newHabitItemInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.addEditorHabitFromInput();
        }
      });
    }

    this.dom.saveScheduleBtn.addEventListener('click', () => {
      this.saveScheduleChanges();
    });

    this.dom.deleteScheduleBtn.addEventListener('click', () => {
      this.deleteScheduleGroup();
    });

    // Header Add Routine button click
    if (this.dom.addRoutineHeaderBtn) {
      this.dom.addRoutineHeaderBtn.addEventListener('click', () => {
        this.openScheduleCreator();
      });
    }

    // Search input
    if (this.dom.habitSearchInput) {
      this.dom.habitSearchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderChecklist();
      });
    }

    // Sort Dropdown Trigger
    if (this.dom.habitSortBtn) {
      this.dom.habitSortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dom.sortDropdownMenu.classList.toggle('active');
      });
    }

    // Hide sort dropdown when clicking outside
    document.addEventListener('click', () => {
      if (this.dom.sortDropdownMenu) {
        this.dom.sortDropdownMenu.classList.remove('active');
      }
    });

    // Sort Dropdown options selection
    if (this.dom.sortDropdownMenu) {
      this.dom.sortDropdownMenu.addEventListener('click', (e) => {
        const option = e.target.closest('.sort-option');
        if (!option) return;
        
        const sortValue = option.getAttribute('data-sort');
        this.activeSort = sortValue;
        
        // Update label
        this.dom.currentSortLabel.textContent = option.textContent;
        
        // Toggle active option class
        this.dom.sortDropdownMenu.querySelectorAll('.sort-option').forEach(btn => {
          btn.classList.toggle('active', btn === option);
        });
        
        this.renderChecklist();
      });
    }

    // Filter Chips selection
    const filterContainer = document.querySelector('.filter-chips-container');
    if (filterContainer) {
      filterContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        
        this.activeFilter = chip.getAttribute('data-filter');
        
        filterContainer.querySelectorAll('.filter-chip').forEach(btn => {
          btn.classList.toggle('active', btn === chip);
        });
        
        this.renderChecklist();
      });
    }

    // Redesigned Modal Category Pills
    const modalCategorySelector = document.querySelector('.category-pills-selector');
    if (modalCategorySelector) {
      modalCategorySelector.addEventListener('click', (e) => {
        const pill = e.target.closest('.category-pill-btn');
        if (!pill) return;
        
        this.editorCategory = pill.getAttribute('data-category');
        
        modalCategorySelector.querySelectorAll('.category-pill-btn').forEach(btn => {
          btn.classList.toggle('active', btn === pill);
        });
      });
    }

    // Handle offline status notification
    window.addEventListener('offline', () => {
      this.showLocalNotification("Offline Mode", "Working offline. Changes will save locally.", "info");
    });
    window.addEventListener('online', () => {
      this.showLocalNotification("Back Online", "Your progress is synced with Local Storage.", "success");
    });

    // Onboarding form submit & validation
    if (this.dom.registrationForm) {
      this.dom.registrationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const nameInput = document.getElementById('regName');
        const ageInput = document.getElementById('regAge');
        const weightInput = document.getElementById('regWeight');
        const heightInput = document.getElementById('regHeight');
        const genderInput = this.dom.registrationForm.querySelector('input[name="regGender"]:checked');
        
        let isValid = true;
        
        // Name validation
        if (!nameInput.value.trim()) {
          nameInput.parentElement.classList.add('has-error');
          isValid = false;
        } else {
          nameInput.parentElement.classList.remove('has-error');
        }
        
        // Age validation
        const ageVal = parseInt(ageInput.value, 10);
        if (isNaN(ageVal) || ageVal < 5 || ageVal > 120) {
          ageInput.parentElement.classList.add('has-error');
          isValid = false;
        } else {
          ageInput.parentElement.classList.remove('has-error');
        }
        
        // Gender validation
        const genderError = document.getElementById('errorGender');
        if (!genderInput) {
          genderError.parentElement.classList.add('has-error');
          isValid = false;
        } else {
          genderError.parentElement.classList.remove('has-error');
        }
        
        if (isValid) {
          const userObj = {
            name: nameInput.value.trim(),
            age: ageVal,
            weight: weightInput.value.trim() ? parseFloat(weightInput.value) : "",
            height: heightInput.value.trim() ? parseFloat(heightInput.value) : "",
            gender: genderInput.value,
            createdAt: new Date().toISOString()
          };
          
          StorageManager.saveUser(userObj);
          
          // Hide modal
          if (this.dom.registrationModal) {
            this.dom.registrationModal.classList.remove('active');
          }
          
          // Update greeting
          this.setupLiveClockAndDates();
          this.showLocalNotification("Welcome!", `Let's build another consistent day, ${userObj.name}! 👋`, "success");
        }
      });

      // Clear errors on typing
      const regName = document.getElementById('regName');
      if (regName) {
        regName.addEventListener('input', () => regName.parentElement.classList.remove('has-error'));
      }
      const regAge = document.getElementById('regAge');
      if (regAge) {
        regAge.addEventListener('input', () => regAge.parentElement.classList.remove('has-error'));
      }
      const genderSegments = this.dom.registrationForm.querySelectorAll('input[name="regGender"]');
      genderSegments.forEach(seg => {
        seg.addEventListener('change', () => {
          const genderError = document.getElementById('errorGender');
          if (genderError) {
            genderError.parentElement.classList.remove('has-error');
          }
        });
      });
    }



    // Double click on Today's Habit section background triggers editor
    if (this.dom.timelineSchedule) {
      this.dom.timelineSchedule.addEventListener('dblclick', (e) => {
        // If click is not inside a specific slot header (which has its own dblclick handler), open editor
        if (e.target.closest('.time-slot-header') || e.target.closest('.habit-item')) return;
        this.openHabitEditor();
      });
    }

    // Bottom Nav Center FAB Add click
    const bottomNavAddBtn = document.getElementById('bottomNavAddBtn');
    if (bottomNavAddBtn) {
      bottomNavAddBtn.addEventListener('click', () => {
        this.openScheduleCreator();
      });
    }
  
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
    if (data.__tracker_gym && this.dom.toggleGymBtn) {
      this.dom.toggleGymBtn.classList.add('active');
      this.dom.toggleGymBtn.setAttribute('aria-checked', 'true');
    }

    // Fruit toggle UI
    if (data.__tracker_fruit && this.dom.toggleFruitBtn) {
      this.dom.toggleFruitBtn.classList.add('active');
      this.dom.toggleFruitBtn.setAttribute('aria-checked', 'true');
    }
  }

  renderChecklist() {
    this.dom.timelineSchedule.innerHTML = "";
    const dayData = StorageManager.getDayData(this.todayStr) || {};

    const totalCount = DEFAULT_HABITS.length;
    const completedCount = DEFAULT_HABITS.filter(h => dayData[h.id] === true).length;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    const categoriesSet = new Set(DEFAULT_HABITS.map(h => h.category));
    const activeCategoriesCount = categoriesSet.size;

    if (this.dom.statTotalHabits) this.dom.statTotalHabits.textContent = totalCount;
    if (this.dom.statCompletedHabits) this.dom.statCompletedHabits.textContent = completedCount;
    if (this.dom.statPercentHabits) this.dom.statPercentHabits.textContent = `${percent}%`;
    if (this.dom.statActiveCategories) this.dom.statActiveCategories.textContent = activeCategoriesCount;

    // 1. If NO habits exist at all
    if (totalCount === 0) {
      this.dom.timelineSchedule.innerHTML = `
        <div class="empty-state-container onboarding-empty-state">
          <div class="empty-state-icon">📅</div>
          <h4>No Schedule Yet</h4>
          <p>You haven't added any habits for today.</p>
          <p class="empty-state-subtitle">Add your first routine to start tracking your progress.</p>
          <button type="button" class="empty-build-btn" id="emptyAddFirstBtn">
            <i class="fa-solid fa-plus"></i> Add Your First Routine
          </button>
        </div>
      `;
      const emptyBtn = document.getElementById('emptyAddFirstBtn');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', () => this.openScheduleCreator());
      }
      return;
    }

    // 2. Filter habits for active display
    let filtered = DEFAULT_HABITS.filter(habit => {
      // Category filter
      if (this.activeFilter !== 'all' && habit.category !== this.activeFilter) {
        return false;
      }
      // Search filter
      if (this.searchQuery) {
        const nameMatch = habit.name.toLowerCase().includes(this.searchQuery);
        const categoryMatch = (habit.category || "").toLowerCase().includes(this.searchQuery);
        const timeMatch = habit.time.toLowerCase().includes(this.searchQuery);
        if (!nameMatch && !categoryMatch && !timeMatch) return false;
      }
      return true;
    });

    // 3. If habits exist, but search/filter yields zero results
    if (filtered.length === 0) {
      this.dom.timelineSchedule.innerHTML = `
        <div class="empty-state-container search-empty-state">
          <div class="empty-state-icon">🔍</div>
          <h4>No Matches Found</h4>
          <p>We couldn't find any routines matching your query.</p>
        </div>
      `;
      return;
    }

    // 4. Sort the filtered list
    filtered.sort((a, b) => {
      if (this.activeSort === 'time') {
        return this.timeToMinutes(a.time) - this.timeToMinutes(b.time);
      }
      if (this.activeSort === 'category') {
        const catOrder = { 'diet': 0, 'skincare': 1, 'haircare': 2 };
        return (catOrder[a.category] ?? 99) - (catOrder[b.category] ?? 99);
      }
      if (this.activeSort === 'completed') {
        const aVal = dayData[a.id] === true ? 0 : 1;
        const bVal = dayData[b.id] === true ? 0 : 1;
        return aVal - bVal;
      }
      if (this.activeSort === 'pending') {
        const aVal = dayData[a.id] === true ? 1 : 0;
        const bVal = dayData[b.id] === true ? 1 : 0;
        return aVal - bVal;
      }
      if (this.activeSort === 'newest') {
        return DEFAULT_HABITS.indexOf(b) - DEFAULT_HABITS.indexOf(a);
      }
      if (this.activeSort === 'oldest') {
        return DEFAULT_HABITS.indexOf(a) - DEFAULT_HABITS.indexOf(b);
      }
      return 0;
    });

    // Grouping by Category -> Period -> Time Slot
    const categoryGroups = {
      'diet': { label: '🥗 Diet', class: 'diet-header', periods: {} },
      'skincare': { label: '🧴 Skin Care', class: 'skincare-header', periods: {} },
      'haircare': { label: '💇 Hair Care', class: 'haircare-header', periods: {} }
    };

    // Ensure any custom category added by user is populated in categoryGroups
    filtered.forEach(habit => {
      const cat = habit.category || 'diet';
      if (!categoryGroups[cat]) {
        categoryGroups[cat] = { label: cat.toUpperCase(), class: 'diet-header', periods: {} };
      }
      
      const period = this.deriveTimePeriod(habit.time);
      if (!categoryGroups[cat].periods[period]) {
        categoryGroups[cat].periods[period] = {};
      }
      
      if (!categoryGroups[cat].periods[period][habit.time]) {
        categoryGroups[cat].periods[period][habit.time] = [];
      }
      
      categoryGroups[cat].periods[period][habit.time].push(habit);
    });

    // Determine which categories to render based on the current filter
    let categoriesToRender = ['diet', 'skincare', 'haircare'];
    if (this.activeFilter !== 'all') {
      categoriesToRender = [this.activeFilter];
    }

    categoriesToRender.forEach(cat => {
      const catData = categoryGroups[cat];
      if (!catData) return;

      // Render Category Container wrapper
      const catContainer = document.createElement('div');
      catContainer.className = `category-section-container category-${cat}`;
      this.dom.timelineSchedule.appendChild(catContainer);

      // Render Category Title
      const catTitleEl = document.createElement('h4');
      catTitleEl.className = `dashboard-category-title ${catData.class}`;
      catTitleEl.innerHTML = catData.label;
      catContainer.appendChild(catTitleEl);

      const hasHabits = Object.keys(catData.periods).length > 0;
      if (!hasHabits) {
        // Show the small placeholder: "No routines scheduled."
        const emptyCatEl = document.createElement('div');
        emptyCatEl.className = "category-empty-placeholder";
        emptyCatEl.innerHTML = `<i class="fa-regular fa-calendar-minus"></i> No routines scheduled.`;
        catContainer.appendChild(emptyCatEl);
        return;
      }

      // Render periods: Morning, Afternoon, Evening, Night
      const orderedPeriods = ['Morning', 'Afternoon', 'Evening', 'Night'];
      
      // Create a timeline container to hold periods and items
      const periodListContainer = document.createElement('div');
      periodListContainer.className = "period-list-container";
      catContainer.appendChild(periodListContainer);

      orderedPeriods.forEach(period => {
        const timeSlots = catData.periods[period];
        if (!timeSlots || Object.keys(timeSlots).length === 0) return;

        // Render Period Group wrapper
        const periodGroupEl = document.createElement('div');
        periodGroupEl.className = "timeline-period-group";
        periodListContainer.appendChild(periodGroupEl);

        // Render Period Subtitle Header
        const periodTitleEl = document.createElement('div');
        periodTitleEl.className = "dashboard-period-title";
        let periodEmoji = "🌅";
        if (period === "Afternoon") periodEmoji = "☀️";
        else if (period === "Evening") periodEmoji = "🌇";
        else if (period === "Night") periodEmoji = "🌙";
        
        periodTitleEl.innerHTML = `<span class="period-emoji">${periodEmoji}</span> <span class="period-name">${period}</span>`;
        periodGroupEl.appendChild(periodTitleEl);

        // Sort time slots chronologically within period
        const orderedTimeSlots = Object.keys(timeSlots).sort((a, b) => this.timeToMinutes(a) - this.timeToMinutes(b));

        const cardsContainer = document.createElement('div');
        cardsContainer.className = "period-cards-container";
        periodGroupEl.appendChild(cardsContainer);

        orderedTimeSlots.forEach(timeSlot => {
          const habits = timeSlots[timeSlot];
          const allChecked = habits.every(h => dayData[h.id] === true);

          // Create group container card
          const groupEl = document.createElement('div');
          groupEl.className = `time-slot-group time-slot-group-card`;
          groupEl.innerHTML = `
            <div class="time-slot-header">
              <span class="time-slot-title">
                <i class="fa-regular fa-clock"></i>
                ${timeSlot}
              </span>
              <div class="time-slot-actions">
                <button class="slot-edit-btn" data-time="${timeSlot}" data-category="${cat}" title="Edit Group" aria-label="Edit this group of habits">
                  <i class="fa-solid fa-pencil"></i>
                </button>
                <button class="group-toggle-btn ${allChecked ? 'all-checked' : ''}" data-time="${timeSlot}" data-category="${cat}" aria-label="Mark all habits in slot as complete">
                  ${allChecked ? '✓ Checked All' : 'Toggle All'}
                </button>
              </div>
            </div>
            <div class="habit-list"></div>
          `;

          cardsContainer.appendChild(groupEl);

          // Edit click
          const editBtn = groupEl.querySelector('.slot-edit-btn');
          if (editBtn) {
            editBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.openScheduleEditor(timeSlot, cat);
            });
          }

          // Double click
          const headerEl = groupEl.querySelector('.time-slot-header');
          headerEl.setAttribute('title', 'Double-click to edit this schedule');
          headerEl.addEventListener('dblclick', (e) => {
            if (e.target.closest('.group-toggle-btn')) return;
            this.openScheduleEditor(timeSlot, cat);
          });

          // Render habits
          const listContainer = groupEl.querySelector('.habit-list');
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

            // Tapping anywhere toggles it
            habitRow.addEventListener('click', (e) => {
              if (e.target.closest('input')) return;
              const checkbox = habitRow.querySelector('.habit-checkbox-hidden');
              checkbox.checked = !checkbox.checked;
              this.handleHabitToggle(habit.id, checkbox.checked, habitRow);
            });

            // Tapping checkbox directly toggles it
            const checkboxInput = habitRow.querySelector('.habit-checkbox-hidden');
            checkboxInput.addEventListener('change', (e) => {
              this.handleHabitToggle(habit.id, e.target.checked, habitRow);
            });

            listContainer.appendChild(habitRow);
          });

          // Toggle All buttons click
          const toggleGroupBtn = groupEl.querySelector('.group-toggle-btn');
          toggleGroupBtn.addEventListener('click', () => {
            const currentlyAllChecked = toggleGroupBtn.classList.contains('all-checked');
            const makeCompleted = !currentlyAllChecked;

            habits.forEach(habit => {
              const habitRowEl = listContainer.querySelector(`[data-id="${habit.id}"]`);
              const cb = habitRowEl.querySelector('.habit-checkbox-hidden');
              if (cb.checked !== makeCompleted) {
                cb.checked = makeCompleted;
                this.handleHabitToggle(habit.id, makeCompleted, habitRowEl, false);
              }
            });

            if (makeCompleted) {
              playSuccessChime();
            }

            this.updateDashboardProgress();
          });
        });
      });
    });
  }

  // --- Redesigned Time & Grouping Helpers ---
  deriveTimePeriod(timeStr) {
    let hour = 12;
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      const match = timeStr.match(/^(\d{2}|\d):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        hour = parseInt(match[1], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && hour < 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;
      }
    } else {
      const [h] = timeStr.split(':');
      hour = parseInt(h || '12', 10);
    }
    
    if (hour >= 5 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 17) return "Afternoon";
    if (hour >= 17 && hour < 21) return "Evening";
    return "Night";
  }

  convertTo12Hour(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return "12:00 PM";
    const [hourStr, minStr] = timeStr.split(':');
    let hour = parseInt(hourStr, 10);
    const min = minStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${String(hour).padStart(2, '0')}:${min} ${ampm}`;
  }

  convertTo24Hour(time12h) {
    if (!time12h) return "12:00";
    const match = time12h.match(/^(\d{2}|\d):(\d{2})\s*(AM|PM)$/i);
    if (!match) return "12:00";
    let hour = parseInt(match[1], 10);
    const min = match[2];
    const ampm = match[3].toUpperCase();
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${min}`;
  }

  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    let hour = 0;
    let min = 0;
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      const match = timeStr.match(/^(\d{2}|\d):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        hour = parseInt(match[1], 10);
        min = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && hour < 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;
      }
    } else {
      const parts = timeStr.split(':');
      hour = parseInt(parts[0] || '0', 10);
      min = parseInt(parts[1] || '0', 10);
    }
    return hour * 60 + min;
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

    // Update stats bar dynamically
    const dayData = StorageManager.getDayData(this.todayStr) || {};
    const totalCount = DEFAULT_HABITS.length;
    const completedCount = DEFAULT_HABITS.filter(h => dayData[h.id] === true).length;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    if (this.dom.statCompletedHabits) this.dom.statCompletedHabits.textContent = completedCount;
    if (this.dom.statPercentHabits) this.dom.statPercentHabits.textContent = `${percent}%`;

    // Sync group-level parent button states
    const groupEl = habitRowEl.closest('.time-slot-group');
    if (groupEl) {
      const itemsList = groupEl.querySelectorAll('.habit-item');
      const allChecked = Array.from(itemsList).every(row => row.classList.contains('completed'));
      const btn = groupEl.querySelector('.group-toggle-btn');
      if (btn) {
        btn.className = `group-toggle-btn ${allChecked ? 'all-checked' : ''}`;
        btn.textContent = allChecked ? '✓ Checked All' : 'Toggle All';
      }
    }

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

  openScheduleEditor(timeSlot, category = null) {
    this.editingTimeSlot = timeSlot;
    this.editingCategory = category || DEFAULT_HABITS.find(h => h.time === timeSlot)?.category || 'diet';
    this.editorCategory = this.editingCategory;

    this.dom.scheduleModalTitle.innerHTML = `<i class="fa-solid fa-calendar-day"></i> Edit Routine`;
    this.dom.deleteScheduleBtn.style.display = "block";

    // Set time field
    const time24h = this.convertTo24Hour(timeSlot);
    this.dom.scheduleTimeInput.value = time24h;

    // Toggle active category pill
    const pillsSelector = document.querySelector('.category-pills-selector');
    if (pillsSelector) {
      pillsSelector.querySelectorAll('.category-pill-btn').forEach(btn => {
        const cat = btn.getAttribute('data-category');
        btn.classList.toggle('active', cat === this.editorCategory);
      });
    }

    // Fetch habits inside this group (time + category matching)
    this.editorHabitList = DEFAULT_HABITS.filter(h => h.time === timeSlot && h.category === this.editorCategory).map(h => ({
      id: h.id,
      name: h.name
    }));

    this.renderEditorHabitsList();
    this.dom.newHabitItemInput.value = "";
    this.dom.scheduleModal.classList.add('active');
  }

  openScheduleCreator() {
    this.editingTimeSlot = null;
    this.editingCategory = null;
    this.editorCategory = 'diet';
    this.editorHabitList = [];

    this.dom.scheduleModalTitle.innerHTML = `<i class="fa-solid fa-calendar-day"></i> Add New Routine`;
    this.dom.deleteScheduleBtn.style.display = "none";

    // Defaults
    this.dom.scheduleTimeInput.value = "07:00";
    
    // Toggle active category pill to diet
    const pillsSelector = document.querySelector('.category-pills-selector');
    if (pillsSelector) {
      pillsSelector.querySelectorAll('.category-pill-btn').forEach(btn => {
        const cat = btn.getAttribute('data-category');
        btn.classList.toggle('active', cat === 'diet');
      });
    }

    this.renderEditorHabitsList();
    this.dom.newHabitItemInput.value = "";
    this.dom.scheduleModal.classList.add('active');
    this.dom.newHabitItemInput.focus();
  }

  renderEditorHabitsList() {
    this.dom.scheduleItemsList.innerHTML = "";
    
    if (this.editorHabitList.length === 0) {
      this.dom.scheduleItemsList.innerHTML = `
        <div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 12px 0;">
          No habits added to this slot yet. Add below!
        </div>
      `;
      return;
    }

    this.editorHabitList.forEach((habit, idx) => {
      const row = document.createElement('div');
      row.className = "editor-habit-row";
      row.innerHTML = `
        <span class="editor-habit-name">${habit.name}</span>
        <button type="button" class="delete-habit-btn" title="Delete Habit">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;

      row.querySelector('.delete-habit-btn').addEventListener('click', () => {
        this.editorHabitList.splice(idx, 1);
        this.renderEditorHabitsList();
      });

      this.dom.scheduleItemsList.appendChild(row);
    });
  }

  addEditorHabitFromInput() {
    const val = this.dom.newHabitItemInput.value.trim();
    if (!val) {
      this.showLocalNotification("Validation Error", "Please enter a habit description.", "warning");
      this.dom.newHabitItemInput.focus();
      return;
    }

    this.editorHabitList.push({
      id: null,
      name: val
    });

    this.renderEditorHabitsList();
    this.dom.newHabitItemInput.value = "";
    this.dom.newHabitItemInput.focus();
  }

  saveScheduleChanges() {
    const rawTime = this.dom.scheduleTimeInput.value;
    if (!rawTime) {
      this.showLocalNotification("Validation Error", "Please select a time.", "warning");
      this.dom.scheduleTimeInput.focus();
      return;
    }

    const newTimeSlot = this.convertTo12Hour(rawTime);
    const category = this.editorCategory;

    if (this.editorHabitList.length === 0) {
      this.showLocalNotification("Validation Error", "Please add at least one habit item.", "warning");
      this.dom.newHabitItemInput.focus();
      return;
    }

    let updatedHabits;

    if (this.editingTimeSlot === null) {
      const habitsToAppend = this.editorHabitList.map(item => {
        const id = `${newTimeSlot}|${item.name}`;
        return {
          id,
          time: newTimeSlot,
          name: item.name,
          category
        };
      });
      updatedHabits = [...DEFAULT_HABITS, ...habitsToAppend];
      StorageManager.saveHabits(updatedHabits);
    } else {
      const otherHabits = DEFAULT_HABITS.filter(h => !(h.time === this.editingTimeSlot && h.category === this.editingCategory));
      
      const updatedGroupHabits = this.editorHabitList.map(item => {
        const id = item.id || `${newTimeSlot}|${item.name}`;
        return {
          id,
          time: newTimeSlot,
          name: item.name,
          category
        };
      });

      const todayStr = this.todayStr;
      const rawData = StorageManager.getRawData();
      const dayData = rawData[todayStr];
      const migrationMap = {};
      
      const oldGroupHabits = DEFAULT_HABITS.filter(h => h.time === this.editingTimeSlot && h.category === this.editingCategory);
      oldGroupHabits.forEach((oldHabit, idx) => {
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

    if (this.dom.loadingOverlay) {
      this.dom.loadingOverlay.classList.remove('fade-out');
    }

    setTimeout(() => {
      this.dom.scheduleModal.classList.remove('active');
      playSuccessChime();
      this.showLocalNotification("Schedule Saved", "Your routine schedule has been updated.", "success");
      this.renderChecklist();
      this.updateDashboardProgress();
      if (this.dom.loadingOverlay) {
        this.dom.loadingOverlay.classList.add('fade-out');
      }
    }, 300);
  }

  deleteScheduleGroup() {
    if (!this.editingTimeSlot) return;

    if (!confirm(`Are you sure you want to delete this routine group?`)) {
      return;
    }

    if (this.dom.loadingOverlay) {
      this.dom.loadingOverlay.classList.remove('fade-out');
    }

    const updatedHabits = DEFAULT_HABITS.filter(h => !(h.time === this.editingTimeSlot && h.category === this.editingCategory));
    StorageManager.saveHabits(updatedHabits);

    setTimeout(() => {
      this.dom.scheduleModal.classList.remove('active');
      this.showLocalNotification("Deleted Routine", "Removed all habits in this routine group.", "warning");
      this.renderChecklist();
      this.updateDashboardProgress();
      if (this.dom.loadingOverlay) {
        this.dom.loadingOverlay.classList.add('fade-out');
      }
    }, 300);
  }

  checkUserRegistration() {
    const user = StorageManager.getUser();
    if (!user) {
      if (this.dom.registrationModal) {
        this.dom.registrationModal.classList.add('active');
      }
    }
  }

  openHabitEditor() {
    if (DEFAULT_HABITS.length > 0) {
      this.openScheduleEditor(DEFAULT_HABITS[0].time, DEFAULT_HABITS[0].category);
    } else {
      this.openScheduleCreator();
    }
  }

  setupPageTransitions() {
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

// Instantiate App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new HabitTrackerApp();
});
