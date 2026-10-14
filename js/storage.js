/**
 * My Daily Habit Tracker - Storage Manager
 * Handles data persistence, auto-initialization, streaks, and data cleanup.
 */

const DEFAULT_HABITS_INITIAL = [];

export const CATEGORIES = [
  { id: "diet", name: "Diet", icon: "🥗", color: "#22C55E", class: "diet-header" },
  { id: "skincare", name: "Skin Care", icon: "🧴", color: "#EC4899", class: "skincare-header" },
  { id: "haircare", name: "Hair Care", icon: "💇", color: "#A855F7", class: "haircare-header" },
  { id: "routine", name: "Routine", icon: "📅", color: "#3B82F6", class: "routine-header" },
  { id: "others", name: "Others", icon: "📦", color: "#F59E0B", class: "others-header" }
];

export const DEFAULT_HABITS = [...DEFAULT_HABITS_INITIAL];

// Load custom habits if present in localStorage
try {
  if (typeof localStorage !== 'undefined') {
    let customHabitsJson = localStorage.getItem("dailyHabits");
    if (!customHabitsJson) {
      // Migration fallback
      customHabitsJson = localStorage.getItem("HabitsList");
    }
    if (customHabitsJson) {
      const parsed = JSON.parse(customHabitsJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        DEFAULT_HABITS.length = 0;
        DEFAULT_HABITS.push(...parsed);
      }
    }
  }
} catch (e) {
  console.error("Error loading custom habits from storage:", e);
}

export class StorageManager {
  static STORAGE_KEY = "HabitTracker";
  static cache = null;

  /**
   * Get the main HabitTracker storage object.
   */
  static getRawData() {
    if (this.cache) return this.cache;
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      this.cache = data ? JSON.parse(data) : {};
      return this.cache;
    } catch (e) {
      console.error("Failed to parse HabitTracker local storage data", e);
      return {};
    }
  }

  /**
   * Save the main HabitTracker storage object.
   */
  static saveRawData(data) {
    this.cache = data;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save HabitTracker local storage data", e);
    }
  }

  /**
   * Get formatting string YYYY-MM-DD for a Date object in local time.
   */
  static formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /**
   * Initialize a day's checklist and other tracker fields if they don't exist.
   */
  static initToday(dateStr = this.formatDate(new Date())) {
    const data = this.getRawData();
    
    // Check if the date exists
    if (!data[dateStr]) {
      data[dateStr] = {};
    }

    // Set default values for all default habits if they are not defined
    DEFAULT_HABITS.forEach(habit => {
      if (data[dateStr][habit.id] === undefined) {
        data[dateStr][habit.id] = false;
      }
    });

    // Initialize trackers inside the same object
    const trackers = ["water", "sleep", "gym", "fruit", "faceCareMorning", "faceCareNight", "mood", "notes", "weight"];
    trackers.forEach(key => {
      const trackerKey = `__tracker_${key}`;
      if (data[dateStr][trackerKey] === undefined) {
        if (key === "water") data[dateStr][trackerKey] = 0; // glasses
        else if (key === "sleep") data[dateStr][trackerKey] = 0; // hours
        else if (key === "weight") data[dateStr][trackerKey] = ""; // kg
        else if (key === "notes") data[dateStr][trackerKey] = ""; // text
        else if (key === "mood") data[dateStr][trackerKey] = ""; // emoji
        else data[dateStr][trackerKey] = false; // boolean toggles
      }
    });

    // Initialize timestamps sub-object
    if (!data[dateStr]["__timestamps"]) {
      data[dateStr]["__timestamps"] = {};
    }

    this.saveRawData(data);
  }

  /**
   * Get all storage keys/records for a specific day.
   */
  static getDayData(dateStr) {
    const data = this.getRawData();
    return data[dateStr] || null;
  }

  /**
   * Set a habit completion status for a given day.
   */
  static setHabitStatus(dateStr, habitId, completed, timeStr = null) {
    const data = this.getRawData();
    if (!data[dateStr]) {
      this.initToday(dateStr);
      // Reload updated data
      return this.setHabitStatus(dateStr, habitId, completed, timeStr);
    }

    data[dateStr][habitId] = completed;
    
    if (!data[dateStr]["__timestamps"]) {
      data[dateStr]["__timestamps"] = {};
    }

    if (completed) {
      if (!timeStr) {
        const now = new Date();
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        timeStr = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
      }
      data[dateStr]["__timestamps"][habitId] = timeStr;
    } else {
      delete data[dateStr]["__timestamps"][habitId];
    }

    this.saveRawData(data);
  }

  /**
   * Get completion status and timestamps of habits for a day.
   */
  static getDayCompletionStats(dateStr) {
    const dayData = this.getDayData(dateStr);
    if (!dayData) return { completedCount: 0, totalCount: DEFAULT_HABITS.length, percent: 0 };

    let completedCount = 0;
    DEFAULT_HABITS.forEach(habit => {
      if (dayData[habit.id] === true) {
        completedCount++;
      }
    });

    const totalCount = DEFAULT_HABITS.length;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    return { completedCount, totalCount, percent };
  }

  /**
   * Get completion stats for a specific category on a specific date.
   */
  static getCategoryStats(dateStr, categoryId) {
    const dayData = this.getDayData(dateStr) || {};
    let completed = 0;
    let total = 0;

    DEFAULT_HABITS.forEach(habit => {
      const cat = (habit.category || 'diet').toLowerCase();
      if (cat === categoryId.toLowerCase()) {
        total++;
        if (dayData[habit.id] === true) {
          completed++;
        }
      }
    });

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }

  /**
   * Update tracker value.
   */
  static updateTracker(dateStr, trackerName, value) {
    const data = this.getRawData();
    if (!data[dateStr]) {
      this.initToday(dateStr);
      return this.updateTracker(dateStr, trackerName, value);
    }
    data[dateStr][`__tracker_${trackerName}`] = value;
    this.saveRawData(data);
  }

  /**
   * Delete a single day's history.
   */
  static deleteDayData(dateStr) {
    const data = this.getRawData();
    if (data[dateStr]) {
      delete data[dateStr];
      this.saveRawData(data);
      return true;
    }
    return false;
  }

  /**
   * Clean up data older than 30 days (run at application start).
   */
  static runAutoCleanup() {
    const data = this.getRawData();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = this.formatDate(cutoffDate);

    let deletedAny = false;
    Object.keys(data).forEach(dateStr => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        if (dateStr < cutoffStr) {
          delete data[dateStr];
          deletedAny = true;
        }
      }
    });

    if (deletedAny) {
      this.saveRawData(data);
      console.log("Auto-cleanup completed: removed history older than 30 days.");
    }
  }

  /**
   * Calculate habit streaks (Daily & Weekly) and other analytics.
   */
  static getStreakMetrics() {
    const data = this.getRawData();
    const dates = Object.keys(data)
      .filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key))
      .sort((a, b) => new Date(b) - new Date(a));

    let currentStreak = 0;
    let tempStreak = 0;
    let longestStreak = 0;

    const STREAK_THRESHOLD = 80;

    const isDaySuccessful = (dateStr) => {
      const stats = this.getDayCompletionStats(dateStr);
      return stats.percent >= STREAK_THRESHOLD;
    };

    let checkDate = new Date();
    let currentCheckStr = this.formatDate(checkDate);
    
    if (!isDaySuccessful(currentCheckStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      currentCheckStr = this.formatDate(checkDate);
    }

    while (isDaySuccessful(currentCheckStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
      currentCheckStr = this.formatDate(checkDate);
    }

    const chronoDates = [...dates].reverse();
    tempStreak = 0;
    chronoDates.forEach(dStr => {
      if (isDaySuccessful(dStr)) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    });

    longestStreak = Math.max(longestStreak, currentStreak);

    let weeklyStreakCount = 0;
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(this.formatDate(d));
    }
    last7Days.forEach(dStr => {
      if (isDaySuccessful(dStr)) {
        weeklyStreakCount++;
      }
    });

    return {
      currentStreak,
      longestStreak,
      weeklyStreak: weeklyStreakCount
    };
  }

  /**
   * Clear all history.
   */
  static clearEntireHistory() {
    const data = this.getRawData();
    const cleaned = {
      settings: data.settings || {}
    };
    this.saveRawData(cleaned);
  }

  /**
   * Reset today's data.
   */
  static resetToday() {
    const todayStr = this.formatDate(new Date());
    const data = this.getRawData();
    if (data[todayStr]) {
      delete data[todayStr];
      this.saveRawData(data);
      this.initToday(todayStr);
    }
  }

  /**
   * Import settings and history JSON (Legacy compatibility).
   */
  static importData(jsonString) {
    try {
      const res = this.restoreBackup(jsonString, ["entire_data"]);
      return res.success;
    } catch (e) {
      console.error("JSON Import failed", e);
      return false;
    }
  }

  /**
   * Export all data to JSON string (Legacy compatibility).
   */
  static exportData() {
    return JSON.stringify(this.generateBackup(["entire_data"]), null, 2);
  }

  /**
   * Normalize category ID string for robust matching.
   */
  static normalizeCategory(cat) {
    if (!cat) return "others";
    const clean = String(cat).toLowerCase().replace(/[\s\-_]+/g, "");
    if (clean === "skincare") return "skincare";
    if (clean === "haircare") return "haircare";
    if (clean === "routine") return "routine";
    if (clean === "diet") return "diet";
    if (clean === "others" || clean === "other") return "others";
    return clean;
  }

  /**
   * Get human-readable category display label.
   */
  static getCategoryDisplayName(cat) {
    const clean = this.normalizeCategory(cat);
    const map = {
      diet: "Diet",
      skincare: "Skin Care",
      haircare: "Hair Care",
      routine: "Routine",
      others: "Others",
      entire_data: "Entire Data",
      entire_habits: "Entire Habits"
    };
    return map[clean] || (clean.charAt(0).toUpperCase() + clean.slice(1));
  }

  /**
   * Format category array into natural readable text (e.g. "Diet and Skin Care").
   */
  static formatCategoryList(cats) {
    const names = cats.map(c => this.getCategoryDisplayName(c));
    if (names.length === 0) return "";
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  }

  /**
   * Generate a versioned structured backup payload filtered by selected categories.
   * @param {string[]} selectedCategories Array of category IDs e.g. ['entire_data'], ['entire_habits'], ['diet', 'routine']
   */
  static generateBackup(selectedCategories = ["entire_data"]) {
    const isEntireData = selectedCategories.includes("entire_data") || selectedCategories.includes("all");
    const isEntireHabits = isEntireData || selectedCategories.includes("entire_habits");

    const normalizedSelectedCats = selectedCategories.map(c => this.normalizeCategory(c));

    // Profile data
    const profile = isEntireData ? (this.getUser() || {}) : {};

    // Settings data
    const rawData = this.getRawData();
    const settings = isEntireData ? (rawData.settings || {}) : {};

    // Habits filtering
    let exportedHabits = [];
    if (isEntireHabits) {
      exportedHabits = [...DEFAULT_HABITS];
    } else {
      exportedHabits = DEFAULT_HABITS.filter(h => {
        const cat = this.normalizeCategory(h.category);
        return normalizedSelectedCats.includes(cat);
      });
    }

    const exportedHabitIds = new Set(exportedHabits.map(h => h.id));

    // History filtering
    const exportedHistory = {};
    Object.keys(rawData).forEach(dateStr => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const day = rawData[dateStr] || {};
        if (isEntireData) {
          // Complete date object
          exportedHistory[dateStr] = JSON.parse(JSON.stringify(day));
        } else {
          // Export only status and timestamps for exported habits
          const dayEntry = {};
          let hasAnyData = false;

          exportedHabitIds.forEach(id => {
            if (day[id] !== undefined) {
              dayEntry[id] = day[id];
              hasAnyData = true;
            }
          });

          if (day.__timestamps) {
            dayEntry.__timestamps = {};
            exportedHabitIds.forEach(id => {
              if (day.__timestamps[id] !== undefined) {
                dayEntry.__timestamps[id] = day.__timestamps[id];
                hasAnyData = true;
              }
            });
          }

          if (isEntireHabits) {
            // Also include tracker values when exporting entire habits
            Object.keys(day).forEach(k => {
              if (k.startsWith("__tracker_")) {
                dayEntry[k] = day[k];
                hasAnyData = true;
              }
            });
          }

          if (hasAnyData) {
            exportedHistory[dateStr] = dayEntry;
          }
        }
      }
    });

    const statistics = this.getStreakMetrics();

    return {
      app: "My Habit Tracker",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      backupType: isEntireData ? "entire_data" : (isEntireHabits ? "entire_habits" : "categories"),
      categories: selectedCategories,
      exportedCategories: isEntireData 
        ? ["entire_data"] 
        : (isEntireHabits ? ["entire_habits"] : Array.from(new Set(exportedHabits.map(h => this.normalizeCategory(h.category))))),
      data: {
        profile,
        habits: exportedHabits,
        settings,
        history: exportedHistory,
        statistics
      }
    };
  }

  /**
   * Validate a backup object or JSON string before importing.
   * Enforces strict category matching against user selections.
   * @param {string|object} input 
   * @param {string[]} selectedCategories 
   */
  static validateBackup(input, selectedCategories = ["entire_data"]) {
    let parsed = null;
    try {
      parsed = typeof input === "string" ? JSON.parse(input) : input;
    } catch (e) {
      return { valid: false, error: "Invalid JSON format: Unable to parse file." };
    }

    if (!parsed || typeof parsed !== "object") {
      return { valid: false, error: "Invalid backup content: Expected a JSON object." };
    }

    // Check version if present
    if (parsed.formatVersion !== undefined && parsed.formatVersion > 1) {
      return { valid: false, error: `Unsupported backup version (${parsed.formatVersion}). Please update the application.` };
    }

    // Normalize payload to standard structure
    let normalizedData = {
      profile: {},
      settings: {},
      habits: [],
      history: {},
      statistics: {}
    };

    if (parsed.data && typeof parsed.data === "object") {
      // Versioned format
      normalizedData.profile = parsed.data.profile || {};
      normalizedData.settings = parsed.data.settings || {};
      normalizedData.habits = Array.isArray(parsed.data.habits) ? parsed.data.habits : [];
      normalizedData.history = (parsed.data.history && typeof parsed.data.history === "object") ? parsed.data.history : {};
      normalizedData.statistics = parsed.data.statistics || {};
    } else if (Array.isArray(parsed)) {
      // Legacy habits array format
      normalizedData.habits = parsed;
    } else if (parsed.settings || Object.keys(parsed).some(k => /^\d{4}-\d{2}-\d{2}$/.test(k))) {
      // Legacy raw HabitTracker object
      normalizedData.settings = parsed.settings || {};
      Object.keys(parsed).forEach(k => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k)) {
          normalizedData.history[k] = parsed[k];
        }
      });
      // Try to read habits if present
      if (Array.isArray(parsed.habits)) {
        normalizedData.habits = parsed.habits;
      }
    } else {
      return { valid: false, error: "Unrecognized backup structure. No habits, settings, or history found." };
    }

    // Extract categories present in backup habits and metadata
    const habitsCategoriesFound = new Set();
    normalizedData.habits.forEach(h => {
      if (h.category) {
        habitsCategoriesFound.add(this.normalizeCategory(h.category));
      }
    });

    const metaCategories = new Set();
    if (Array.isArray(parsed.exportedCategories)) {
      parsed.exportedCategories.forEach(c => metaCategories.add(this.normalizeCategory(c)));
    } else if (Array.isArray(parsed.categories)) {
      parsed.categories.forEach(c => metaCategories.add(this.normalizeCategory(c)));
    }

    const backupIsEntireData = parsed.backupType === "entire_data" || 
      metaCategories.has("entire_data") || 
      metaCategories.has("all");

    const backupIsEntireHabits = backupIsEntireData || 
      parsed.backupType === "entire_habits" || 
      metaCategories.has("entire_habits");

    const backupIsCategorySpecific = parsed.backupType === "categories" || 
      (metaCategories.size > 0 && !backupIsEntireData && !backupIsEntireHabits);

    const allFileCategories = new Set([...habitsCategoriesFound]);
    metaCategories.forEach(c => {
      if (c !== "entire_data" && c !== "entire_habits" && c !== "all") {
        allFileCategories.add(c);
      }
    });

    // Check user selection
    const isEntireData = selectedCategories.includes("entire_data") || selectedCategories.includes("all");
    const isEntireHabits = isEntireData || selectedCategories.includes("entire_habits");
    const normalizedSelectedCats = selectedCategories
      .filter(c => c !== "entire_data" && c !== "entire_habits" && c !== "all")
      .map(c => this.normalizeCategory(c));

    // 1. Entire Data validation
    if (isEntireData) {
      if (backupIsCategorySpecific) {
        const foundCats = Array.from(allFileCategories);
        const fileCatDisplay = foundCats.length > 0 ? this.formatCategoryList(foundCats) : "category-specific";
        return {
          valid: false,
          error: `Category Mismatch: You selected Entire Data, but the uploaded file contains ${fileCatDisplay} data. Please select the matching category or upload a complete Entire Data backup file.`
        };
      }

      const hasAnyHabits = normalizedData.habits.length > 0;
      const hasAnyHistory = Object.keys(normalizedData.history).length > 0;
      const hasProfile = Boolean(normalizedData.profile && (normalizedData.profile.name || normalizedData.profile.email));
      const hasSettings = Boolean(normalizedData.settings && Object.keys(normalizedData.settings).length > 0);

      if (!hasAnyHabits && !hasAnyHistory && !hasProfile && !hasSettings) {
        return { valid: false, error: "The uploaded file does not contain any valid application data to restore." };
      }
    } 
    // 2. Entire Habits validation
    else if (isEntireHabits) {
      if (backupIsCategorySpecific) {
        const foundCats = Array.from(allFileCategories);
        const fileCatDisplay = foundCats.length > 0 ? this.formatCategoryList(foundCats) : "category-specific";
        return {
          valid: false,
          error: `Category Mismatch: You selected Entire Habits, but the uploaded file contains ${fileCatDisplay} data. Please select the matching category or upload an Entire Habits backup file.`
        };
      }
      if (normalizedData.habits.length === 0) {
        return { valid: false, error: "The uploaded file does not contain any habit data." };
      }
    }
    // 3. Category-specific validation
    else if (normalizedSelectedCats.length > 0) {
      const matchingCats = normalizedSelectedCats.filter(c => allFileCategories.has(c));
      const missingCats = normalizedSelectedCats.filter(c => !allFileCategories.has(c));

      if (matchingCats.length === 0) {
        const selectedDisplay = this.formatCategoryList(normalizedSelectedCats);
        const foundCats = Array.from(allFileCategories);
        const foundDisplay = foundCats.length > 0 ? this.formatCategoryList(foundCats) : "different";
        return {
          valid: false,
          error: `Category Mismatch: You selected ${selectedDisplay}, but the uploaded file contains ${foundDisplay} data. Please select the matching category or upload the correct backup file.`
        };
      }

      if (missingCats.length > 0) {
        const selectedDisplay = this.formatCategoryList(normalizedSelectedCats);
        const missingDisplay = this.formatCategoryList(missingCats);
        return {
          valid: false,
          error: `Category Mismatch: You selected ${selectedDisplay}, but the uploaded file is missing ${missingDisplay} data. Please select the matching category or upload the correct backup file.`
        };
      }
    }

    let matchingHabits = [];
    if (isEntireHabits) {
      matchingHabits = [...normalizedData.habits];
    } else {
      matchingHabits = normalizedData.habits.filter(h => {
        const cat = this.normalizeCategory(h.category);
        return normalizedSelectedCats.includes(cat);
      });
    }

    if (!isEntireData && matchingHabits.length === 0) {
      const selectedDisplay = this.formatCategoryList(normalizedSelectedCats);
      return {
        valid: false,
        error: `Category Mismatch: You selected ${selectedDisplay}, but the uploaded file does not contain any matching habit data. Please select the matching category or upload the correct backup file.`
      };
    }

    const historyDays = Object.keys(normalizedData.history).length;

    return {
      valid: true,
      normalizedData,
      summary: {
        habitCount: matchingHabits.length,
        totalBackupHabits: normalizedData.habits.length,
        historyDays: historyDays,
        categoriesFound: Array.from(allFileCategories).map(c => this.getCategoryDisplayName(c)),
        hasProfile: Boolean(normalizedData.profile && (normalizedData.profile.name || normalizedData.profile.email)),
        hasSettings: Boolean(normalizedData.settings && Object.keys(normalizedData.settings).length > 0)
      }
    };
  }

  /**
   * Safely restore application data from a validated backup with automatic rollback on error.
   * @param {string|object} input 
   * @param {string[]} selectedCategories 
   */
  static restoreBackup(input, selectedCategories = ["entire_data"]) {
    const validation = this.validateBackup(input, selectedCategories);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { normalizedData } = validation;
    const isEntireData = selectedCategories.includes("entire_data") || selectedCategories.includes("all");
    const isEntireHabits = isEntireData || selectedCategories.includes("entire_habits");
    const normalizedSelectedCats = selectedCategories.map(c => this.normalizeCategory(c));

    // Create an in-memory rollback snapshot of localStorage
    const snapshot = {
      HabitTracker: localStorage.getItem("HabitTracker"),
      dailyHabits: localStorage.getItem("dailyHabits"),
      HabitsList: localStorage.getItem("HabitsList"),
      habitTrackerUser: localStorage.getItem("habitTrackerUser")
    };

    try {
      // 1. Restore Profile if Entire Data
      if (isEntireData && normalizedData.profile && Object.keys(normalizedData.profile).length > 0) {
        this.saveUser(normalizedData.profile);
      }

      // 2. Load current raw data
      const currentRawData = this.getRawData();

      // 3. Restore Settings if Entire Data
      if (isEntireData && normalizedData.settings) {
        currentRawData.settings = Object.assign({}, currentRawData.settings || {}, normalizedData.settings);
      }

      // 4. Restore Habits & History
      let restoredHabitsCount = 0;
      let restoredCategories = new Set();

      if (isEntireData) {
        // Overwrite habits completely
        if (normalizedData.habits && normalizedData.habits.length > 0) {
          localStorage.setItem("dailyHabits", JSON.stringify(normalizedData.habits));
          DEFAULT_HABITS.length = 0;
          DEFAULT_HABITS.push(...normalizedData.habits);
          restoredHabitsCount = normalizedData.habits.length;
          normalizedData.habits.forEach(h => restoredCategories.add(this.normalizeCategory(h.category)));
        }

        // Overwrite history dates
        Object.keys(currentRawData).forEach(k => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(k)) {
            delete currentRawData[k];
          }
        });
        Object.keys(normalizedData.history).forEach(k => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(k)) {
            currentRawData[k] = normalizedData.history[k];
          }
        });
      } else if (isEntireHabits) {
        // Replace habits with imported habits
        if (normalizedData.habits) {
          localStorage.setItem("dailyHabits", JSON.stringify(normalizedData.habits));
          DEFAULT_HABITS.length = 0;
          DEFAULT_HABITS.push(...normalizedData.habits);
          restoredHabitsCount = normalizedData.habits.length;
          normalizedData.habits.forEach(h => restoredCategories.add(this.normalizeCategory(h.category)));
        }

        // Merge history for all imported habits into existing dates
        Object.keys(normalizedData.history).forEach(dateStr => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            if (!currentRawData[dateStr]) currentRawData[dateStr] = {};
            if (!currentRawData[dateStr].__timestamps) currentRawData[dateStr].__timestamps = {};

            const importedDay = normalizedData.history[dateStr] || {};
            normalizedData.habits.forEach(habit => {
              if (importedDay[habit.id] !== undefined) {
                currentRawData[dateStr][habit.id] = importedDay[habit.id];
              }
              if (importedDay.__timestamps && importedDay.__timestamps[habit.id] !== undefined) {
                currentRawData[dateStr].__timestamps[habit.id] = importedDay.__timestamps[habit.id];
              }
            });

            // Preserve trackers if imported
            Object.keys(importedDay).forEach(k => {
              if (k.startsWith("__tracker_") && currentRawData[dateStr][k] === undefined) {
                currentRawData[dateStr][k] = importedDay[k];
              }
            });
          }
        });
      } else {
        // Individual or multiple category-specific restoration
        const importedCategoryHabits = normalizedData.habits.filter(h => {
          const cat = this.normalizeCategory(h.category);
          return normalizedSelectedCats.includes(cat);
        });

        // Keep habits from unselected categories
        const keptHabits = DEFAULT_HABITS.filter(h => {
          const cat = this.normalizeCategory(h.category);
          return !normalizedSelectedCats.includes(cat);
        });

        // Combine kept habits and newly imported category habits
        const newCombinedHabits = [...keptHabits, ...importedCategoryHabits];
        localStorage.setItem("dailyHabits", JSON.stringify(newCombinedHabits));
        DEFAULT_HABITS.length = 0;
        DEFAULT_HABITS.push(...newCombinedHabits);

        restoredHabitsCount = importedCategoryHabits.length;
        importedCategoryHabits.forEach(h => restoredCategories.add(this.normalizeCategory(h.category)));

        // Merge history only for the selected habits
        const importedHabitIds = new Set(importedCategoryHabits.map(h => h.id));
        Object.keys(normalizedData.history).forEach(dateStr => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            if (!currentRawData[dateStr]) currentRawData[dateStr] = {};
            if (!currentRawData[dateStr].__timestamps) currentRawData[dateStr].__timestamps = {};

            const importedDay = normalizedData.history[dateStr] || {};
            importedHabitIds.forEach(id => {
              if (importedDay[id] !== undefined) {
                currentRawData[dateStr][id] = importedDay[id];
              }
              if (importedDay.__timestamps && importedDay.__timestamps[id] !== undefined) {
                currentRawData[dateStr].__timestamps[id] = importedDay.__timestamps[id];
              }
            });
          }
        });
      }

      this.saveRawData(currentRawData);

      // Re-initialize today's record structure
      const todayStr = this.formatDate(new Date());
      this.initToday(todayStr);

      return {
        success: true,
        importedHabitCount: restoredHabitsCount,
        restoredCategories: Array.from(restoredCategories),
        historyDaysCount: Object.keys(normalizedData.history || {}).length
      };
    } catch (err) {
      console.error("Error during backup restoration, rolling back:", err);
      // Rollback to prior snapshot
      Object.keys(snapshot).forEach(k => {
        if (snapshot[k] !== null) {
          localStorage.setItem(k, snapshot[k]);
        } else {
          localStorage.removeItem(k);
        }
      });
      this.cache = null;

      // Restore DEFAULT_HABITS in memory from snapshot
      try {
        const rawDailyHabits = snapshot.dailyHabits || snapshot.HabitsList;
        const parsedHabits = rawDailyHabits ? JSON.parse(rawDailyHabits) : [];
        DEFAULT_HABITS.length = 0;
        DEFAULT_HABITS.push(...parsedHabits);
      } catch (e) {}

      return { success: false, error: err.message || "Failed to restore backup." };
    }
  }

  /**
   * Permanently clears all habit records and associated completion history,
   * while preserving user settings, preferences, theme, sound, sleep time, and profile.
   */
  static clearAllHabits() {
    const snapshot = {
      HabitTracker: localStorage.getItem("HabitTracker"),
      dailyHabits: localStorage.getItem("dailyHabits"),
      HabitsList: localStorage.getItem("HabitsList")
    };

    try {
      // 1. Clear habits arrays
      DEFAULT_HABITS.length = 0;
      localStorage.setItem("dailyHabits", JSON.stringify([]));
      localStorage.removeItem("HabitsList");

      // 2. Clear habit completion flags and timestamps in HabitTracker
      const rawData = this.getRawData();
      Object.keys(rawData).forEach(k => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k)) {
          const day = rawData[k];
          if (day && typeof day === "object") {
            Object.keys(day).forEach(subKey => {
              if (!subKey.startsWith("__tracker_") && subKey !== "__timestamps") {
                delete day[subKey];
              }
            });
            day.__timestamps = {};
          }
        }
      });

      this.saveRawData(rawData);

      // 3. Clear notified slot cache
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("notified_slots_")) {
          localStorage.removeItem(key);
        }
      });

      // 4. Re-initialize today cleanly
      const todayStr = this.formatDate(new Date());
      this.initToday(todayStr);

      return true;
    } catch (err) {
      console.error("Error during clearAllHabits, rolling back:", err);
      Object.keys(snapshot).forEach(k => {
        if (snapshot[k] !== null) localStorage.setItem(k, snapshot[k]);
        else localStorage.removeItem(k);
      });
      this.cache = null;
      return false;
    }
  }

  /**
   * Save custom habits to localStorage and update DEFAULT_HABITS array.
   */
  static saveHabits(newHabits) {
    try {
      localStorage.setItem("dailyHabits", JSON.stringify(newHabits));
      DEFAULT_HABITS.length = 0;
      DEFAULT_HABITS.push(...newHabits);
      
      // Make sure today's record contains entries for any new habits
      const todayStr = this.formatDate(new Date());
      this.initToday(todayStr);
      return true;
    } catch (e) {
      console.error("Failed to save custom habits", e);
      return false;
    }
  }

  /**
   * Get user registration details.
   */
  static getUser() {
    try {
      const user = localStorage.getItem("habitTrackerUser");
      return user ? JSON.parse(user) : null;
    } catch (e) {
      console.error("Failed to get user registration details", e);
      return null;
    }
  }

  /**
   * Save user registration details.
   */
  static saveUser(user) {
    try {
      localStorage.setItem("habitTrackerUser", JSON.stringify(user));
    } catch (e) {
      console.error("Failed to save user registration details", e);
    }
  }
}

