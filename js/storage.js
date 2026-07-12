/**
 * My Daily Habit Tracker - Storage Manager
 * Handles data persistence, auto-initialization, streaks, and data cleanup.
 */

const DEFAULT_HABITS_INITIAL = [];

export const DEFAULT_HABITS = [...DEFAULT_HABITS_INITIAL];

// Load custom habits if present in localStorage
try {
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
} catch (e) {
  console.error("Error loading custom habits from storage:", e);
}

export class StorageManager {
  static STORAGE_KEY = "HabitTracker";

  /**
   * Get the main HabitTracker storage object.
   */
  static getRawData() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error("Failed to parse HabitTracker local storage data", e);
      return {};
    }
  }

  /**
   * Save the main HabitTracker storage object.
   */
  static saveRawData(data) {
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
   * Import settings and history JSON.
   */
  static importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== "object" || parsed === null) return false;
      this.saveRawData(parsed);
      return true;
    } catch (e) {
      console.error("JSON Import failed", e);
      return false;
    }
  }

  /**
   * Export all data to JSON string.
   */
  static exportData() {
    return JSON.stringify(this.getRawData(), null, 2);
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
