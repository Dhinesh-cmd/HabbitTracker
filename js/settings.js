/**
 * My Daily Habit Tracker - Settings Page Controller
 * Handles user profile config, notification/sound preferences, JSON import/export, CSV reporting, and database resets.
 */

import { StorageManager } from './storage.js';
import {
  formatHeaderDate,
  updateDigitalClock,
  initTheme,
  toggleTheme,
  playSuccessChime,
  downloadCSVReport,
  exportPDFReport,
  registerServiceWorker
} from './utils.js';

class SettingsPageController {
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

      // Form fields
      userNameInput: document.getElementById('userNameInput'),
      soundsToggleInput: document.getElementById('soundsToggleInput'),
      themeToggleSwitch: document.getElementById('themeToggleSwitch'),
      whatsappToggleInput: document.getElementById('whatsappToggleInput'),
      whatsappConfigRow: document.getElementById('whatsappConfigRow'),
      whatsappPhoneInput: document.getElementById('whatsappPhoneInput'),
      testWhatsappBtn: document.getElementById('testWhatsappBtn'),

      // JSON backups
      importJsonFileInput: document.getElementById('importJsonFileInput'),
      importJsonBtn: document.getElementById('importJsonBtn'),
      exportJsonBtn: document.getElementById('exportJsonBtn'),

      // Reporting
      exportCsvBtn: document.getElementById('exportCsvBtn'),
      exportPdfBtn: document.getElementById('exportPdfBtn'),

      // Resets
      resetTodayBtn: document.getElementById('resetTodayBtn'),
      clearAllHistoryBtn: document.getElementById('clearAllHistoryBtn'),

      // Modals
      wipeDatabaseConfirmModal: document.getElementById('wipeDatabaseConfirmModal'),
      cancelWipeBtn: document.getElementById('cancelWipeBtn'),
      confirmWipeBtn: document.getElementById('confirmWipeBtn'),
      notificationContainer: document.getElementById('notificationContainer')
    };

    this.init();
  }

  init() {
    // Setup clock and dates
    updateDigitalClock('navClockDisplay');
    this.dom.currentDayDate.textContent = formatHeaderDate(this.currentDate);

    // Load initial settings preference
    this.loadSavedPreferences();

    // Hook listeners
    this.setupEventListeners();

    // Hide loader
    setTimeout(() => {
      this.dom.loadingOverlay.classList.add('fade-out');
    }, 300);
  }

  loadSavedPreferences() {
    const rawData = StorageManager.getRawData();
    const settings = rawData.settings || {};

    // Name (default "Dhinesh")
    this.dom.userNameInput.value = settings.userName || "Dhinesh";

    // Sounds
    this.dom.soundsToggleInput.checked = settings.sounds !== false;

    // Theme (checkbox logic matches html tag state)
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    this.dom.themeToggleSwitch.checked = currentTheme === "dark";

    // WhatsApp
    const waEnabled = settings.whatsappEnabled === true;
    this.dom.whatsappToggleInput.checked = waEnabled;
    this.dom.whatsappPhoneInput.value = settings.whatsappPhone || "";
    this.dom.whatsappConfigRow.style.display = waEnabled ? "flex" : "none";
  }


  setupEventListeners() {
    // Top Nav Theme Toggle
    this.dom.themeToggleBtn.addEventListener('click', () => {
      const newTheme = toggleTheme();
      this.dom.themeToggleSwitch.checked = newTheme === "dark";
    });

    // Settings Card Theme Switch
    this.dom.themeToggleSwitch.addEventListener('change', () => {
      const newTheme = toggleTheme();
      this.showLocalToast("Theme Synced", `Workspace toggled to ${newTheme} mode.`, "success");
    });

    // Username config save on change
    this.dom.userNameInput.addEventListener('input', (e) => {
      this.saveSettingKey("userName", e.target.value.trim() || "Dhinesh");
    });

    // Sound toggle config save on change
    this.dom.soundsToggleInput.addEventListener('change', (e) => {
      this.saveSettingKey("sounds", e.target.checked);
      if (e.target.checked) {
        playSuccessChime();
      }
      this.showLocalToast("Audio Updated", `Reminders sound cues: ${e.target.checked ? 'Enabled' : 'Muted'}.`, "success");
    });

    // WhatsApp Reminder toggle change
    this.dom.whatsappToggleInput.addEventListener('change', (e) => {
      const waEnabled = e.target.checked;
      this.saveSettingKey("whatsappEnabled", waEnabled);
      this.dom.whatsappConfigRow.style.display = waEnabled ? "flex" : "none";
      this.showLocalToast("WhatsApp Reminders", `WhatsApp meal warnings ${waEnabled ? 'Enabled' : 'Disabled'}.`, "success");
    });

    // WhatsApp Phone number validation & save
    this.dom.whatsappPhoneInput.addEventListener('input', (e) => {
      const phoneVal = e.target.value.trim();
      const phoneRegex = /^\+?[1-9]\d{9,14}$/;

      if (phoneVal === "") {
        this.dom.whatsappPhoneInput.style.borderColor = "var(--border-color)";
        this.saveSettingKey("whatsappPhone", "");
        return;
      }

      if (phoneRegex.test(phoneVal)) {
        this.dom.whatsappPhoneInput.style.borderColor = "var(--success)";
        this.saveSettingKey("whatsappPhone", phoneVal);
      } else {
        this.dom.whatsappPhoneInput.style.borderColor = "var(--danger)";
      }
    });

    // WhatsApp Test message trigger
    this.dom.testWhatsappBtn.addEventListener('click', () => {
      const rawData = StorageManager.getRawData();
      const phoneNum = rawData.settings?.whatsappPhone || "";

      if (!phoneNum) {
        this.showLocalToast("Validation Error", "Please enter a valid phone number with country code first.", "warning");
        this.dom.whatsappPhoneInput.style.borderColor = "var(--danger)";
        this.dom.whatsappPhoneInput.focus();
        return;
      }

      const text = "🔔 *Habit Tracker test message*: Your WhatsApp notification reminders are configured successfully! Get ready for consistency. 💪";
      const url = `https://wa.me/${phoneNum.replace(/\+/g, '')}?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
      this.showLocalToast("Test Dispatched", "Opened WhatsApp Click-to-Chat in a new tab.", "success");
    });

    // Reset Today Checklist trigger
    this.dom.resetTodayBtn.addEventListener('click', () => {
      StorageManager.resetToday();
      playSuccessChime();
      this.showLocalToast("Today Reset", "Today's checklist and sliders have been cleared.", "success");
    });


    // Wipe Database Confirm Modal Trigger
    this.dom.clearAllHistoryBtn.addEventListener('click', () => {
      this.dom.wipeDatabaseConfirmModal.classList.add('active');
    });

    this.dom.cancelWipeBtn.addEventListener('click', () => {
      this.dom.wipeDatabaseConfirmModal.classList.remove('active');
    });

    this.dom.confirmWipeBtn.addEventListener('click', () => {
      StorageManager.clearEntireHistory();
      this.showLocalToast("Wiped Clean", "All historical habit logs have been permanently erased.", "warning");
      this.dom.wipeDatabaseConfirmModal.classList.remove('active');
      this.loadSavedPreferences();
    });

    // Export JSON
    this.dom.exportJsonBtn.addEventListener('click', () => {
      try {
        const data = StorageManager.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `HabitTracker_DatabaseBackup_${this.todayStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showLocalToast("Export Successful", "Database backup file downloaded.", "success");
      } catch (err) {
        this.showLocalToast("Export Failed", "Error creating backup file.", "warning");
      }
    });

    // Import JSON File Picker
    this.dom.importJsonBtn.addEventListener('click', () => {
      this.dom.importJsonFileInput.click();
    });

    this.dom.importJsonFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const success = StorageManager.importData(text);
        if (success) {
          playSuccessChime();
          this.showLocalToast("Restore Complete", "Data imported successfully. Reloading workspace...", "success");
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          this.showLocalToast("Restore Failed", "Invalid backup file or corrupted format.", "warning");
        }
      };
      reader.readAsText(file);
    });

    // Download CSV report
    this.dom.exportCsvBtn.addEventListener('click', () => {
      const data = StorageManager.getRawData();
      // Only export day histories
      const historyOnly = {};
      Object.keys(data).forEach(k => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k)) {
          historyOnly[k] = data[k];
        }
      });
      downloadCSVReport(historyOnly);
      this.showLocalToast("CSV Generated", "Spreadsheet report download started.", "success");
    });

    // Export PDF Print View
    this.dom.exportPdfBtn.addEventListener('click', () => {
      exportPDFReport();
    });
  }

  saveSettingKey(key, value) {
    const raw = StorageManager.getRawData();
    if (!raw.settings) raw.settings = {};
    raw.settings[key] = value;
    StorageManager.saveRawData(raw);
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
}

document.addEventListener('DOMContentLoaded', () => {
  new SettingsPageController();
});
