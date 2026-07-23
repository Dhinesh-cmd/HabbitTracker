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
  registerServiceWorker,
  showToast,
  CustomDialog
} from './utils.js';
import { NotificationManager } from './notification-manager.js';

class SettingsPageController {
  constructor() {
    const user = StorageManager.getUser();
    if (!user) {
      window.location.href = "login.html";
      return;
    }
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
      sleepTimeInput: document.getElementById('sleepTimeInput'),
      soundsToggleInput: document.getElementById('soundsToggleInput'),
      themeToggleSwitch: document.getElementById('themeToggleSwitch'),
      pushToggleInput: document.getElementById('pushToggleInput'),
      testNotificationRow: document.getElementById('testNotificationRow'),
      testNotificationBtn: document.getElementById('testNotificationBtn'),

      // JSON backups
      importJsonFileInput: document.getElementById('importJsonFileInput'),
      importJsonBtn: document.getElementById('importJsonBtn'),
      exportJsonBtn: document.getElementById('exportJsonBtn'),

      // Reporting
      reportMonthInput: document.getElementById('reportMonthInput'),
      exportCsvBtn: document.getElementById('exportCsvBtn'),
      exportPdfBtn: document.getElementById('exportPdfBtn'),

      // Resets
      resetTodayBtn: document.getElementById('resetTodayBtn'),
      clearAllHistoryBtn: document.getElementById('clearAllHistoryBtn'),

      // Modals
      wipeDatabaseConfirmModal: document.getElementById('wipeDatabaseConfirmModal'),
      cancelWipeBtn: document.getElementById('cancelWipeBtn'),
      confirmWipeBtn: document.getElementById('confirmWipeBtn'),
      clearHistoryBtn: document.getElementById('clearHistoryBtn'),
      clearHistoryConfirmModal: document.getElementById('clearHistoryConfirmModal'),
      cancelClearHistoryBtn: document.getElementById('cancelClearHistoryBtn'),
      confirmClearHistoryBtn: document.getElementById('confirmClearHistoryBtn'),
      notificationContainer: document.getElementById('notificationContainer')
    };

    this.init();
  }

  init() {
    console.group("%c🚀 App Started", "color: #10b981; font-weight: bold;");
    console.info("Settings Controller initialized successfully.");
    console.groupEnd();

    // Setup clock and dates
    updateDigitalClock('navClockDisplay');
    this.dom.currentDayDate.textContent = formatHeaderDate(this.currentDate);

    // Load initial settings preference
    this.loadSavedPreferences();

    // Hook listeners
    this.setupEventListeners();

    this.setupPageTransitions();
  }

  loadSavedPreferences() {
    console.group("%c⚙️ Settings Loaded", "color: #6366f1; font-weight: bold;");
    const rawData = StorageManager.getRawData();
    console.log("LocalStorage Loaded successfully:", rawData);
    const settings = rawData.settings || {};

    // Clean up unused legacy WhatsApp keys
    if (settings.whatsappEnabled !== undefined || settings.whatsappPhone !== undefined) {
      delete settings.whatsappEnabled;
      delete settings.whatsappPhone;
      StorageManager.saveRawData(rawData);
    }

    // Name (default "Dhinesh")
    let userName = "Dhinesh";
    const user = StorageManager.getUser();
    if (user && user.name) {
      userName = user.name;
    } else if (settings.userName) {
      userName = settings.userName;
    }
    this.dom.userNameInput.value = userName;

    // Sleep Time (default "22:30")
    this.dom.sleepTimeInput.value = settings.sleepTime || "22:30";

    // Default month selector to current month
    const todayDateObj = new Date();
    const curYear = todayDateObj.getFullYear();
    const curMonth = String(todayDateObj.getMonth() + 1).padStart(2, "0");
    if (this.dom.reportMonthInput) {
      this.dom.reportMonthInput.value = `${curYear}-${curMonth}`;
    }

    // Sounds
    this.dom.soundsToggleInput.checked = settings.sounds !== false;

    // Theme (checkbox logic matches html tag state)
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    this.dom.themeToggleSwitch.checked = currentTheme === "dark";

    // Push Notifications
    const pushEnabled = settings.pushNotificationsEnabled === true;
    console.log("Loaded Push Settings: " + pushEnabled);
    this.dom.pushToggleInput.checked = pushEnabled;
    
    // Validate current notification permission and align UI
    if (pushEnabled && "Notification" in window && Notification.permission === "granted") {
      this.dom.testNotificationRow.style.display = "flex";
    } else {
      this.dom.testNotificationRow.style.display = "none";
      if (pushEnabled) {
        // If saved as active but permission is revoked, sync settings
        this.dom.pushToggleInput.checked = false;
        this.saveSettingKey("pushNotificationsEnabled", false);
      }
    }
    console.groupEnd();
  }


  setupEventListeners() {
    // Top Nav Theme Toggle
    this.dom.themeToggleBtn.addEventListener('click', () => {
      console.group("%c🌗 Theme Changed", "color: #a855f7; font-weight: bold;");
      try {
        const newTheme = toggleTheme();
        this.dom.themeToggleSwitch.checked = newTheme === "dark";
        console.info(`Theme toggled via Top Nav. New mode is: ${newTheme}`);
      } catch (err) {
        console.error("Theme toggle failed:", err);
      } finally {
        console.groupEnd();
      }
    });

    // Settings Card Theme Switch
    this.dom.themeToggleSwitch.addEventListener('change', () => {
      console.group("%c🌗 Theme Changed", "color: #a855f7; font-weight: bold;");
      try {
        const newTheme = toggleTheme();
        this.showLocalToast("Theme Synced", `Workspace toggled to ${newTheme} mode.`, "success");
        console.info(`Theme toggled via Settings Card. New mode is: ${newTheme}`);
      } catch (err) {
        console.error("Theme toggle failed:", err);
      } finally {
        console.groupEnd();
      }
    });

    // Username config save on change
    this.dom.userNameInput.addEventListener('input', (e) => {
      const val = e.target.value.trim() || "Dhinesh";
      this.saveSettingKey("userName", val);
      
      const user = StorageManager.getUser();
      if (user) {
        user.name = val;
        StorageManager.saveUser(user);
      } else {
        StorageManager.saveUser({
          name: val,
          age: 25,
          gender: "Other",
          weight: "",
          height: "",
          createdAt: new Date().toISOString()
        });
      }
    });

    // Sleep time config save on change
    this.dom.sleepTimeInput.addEventListener('change', (e) => {
      const val = e.target.value || "22:30";
      this.saveSettingKey("sleepTime", val);
      
      // Convert to 12-hour AM/PM format
      const [hourStr, minStr] = val.split(':');
      let hour = parseInt(hourStr, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      hour = hour ? hour : 12;
      const formattedTime = `${String(hour).padStart(2, '0')}:${minStr} ${ampm}`;
      
      this.showLocalToast("Sleep Time Updated", `Daily summary scheduled at 5 minutes before ${formattedTime}.`, "success");
    });

    // Sound toggle config save on change
    this.dom.soundsToggleInput.addEventListener('change', (e) => {
      this.saveSettingKey("sounds", e.target.checked);
      if (e.target.checked) {
        playSuccessChime();
      }
      this.showLocalToast("Audio Updated", `Reminders sound cues: ${e.target.checked ? 'Enabled' : 'Muted'}.`, "success");
    });

    // Push Notification toggle change
    this.dom.pushToggleInput.addEventListener('change', async (e) => {
      const isChecked = e.target.checked;
      
      if (isChecked) {
        if (!("Notification" in window)) {
          this.showLocalToast("Not Supported", "Push notifications are not supported by this browser.", "warning");
          this.dom.pushToggleInput.checked = false;
          return;
        }

        try {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            this.saveSettingKey("pushNotificationsEnabled", true);
            this.dom.testNotificationRow.style.display = "flex";
            this.showLocalToast("Notifications Enabled", "You will now receive habit reminder notifications.", "success");
            // Run audit / smoke test immediately
            await NotificationManager.runSmokeTest();
          } else {
            this.dom.pushToggleInput.checked = false;
            this.saveSettingKey("pushNotificationsEnabled", false);
            this.dom.testNotificationRow.style.display = "none";
            this.showLocalToast("Permission Denied", "Notification permission denied.", "warning");
          }
        } catch (err) {
          console.error("Error requesting notification permission:", err);
          this.dom.pushToggleInput.checked = false;
          this.saveSettingKey("pushNotificationsEnabled", false);
          this.dom.testNotificationRow.style.display = "none";
        }
      } else {
        this.saveSettingKey("pushNotificationsEnabled", false);
        this.dom.testNotificationRow.style.display = "none";
        this.showLocalToast("Notifications Disabled", "Push notifications have been disabled.", "info");
      }
    });

    // Test Notification button logic
    this.dom.testNotificationBtn.addEventListener('click', () => {
      if (this.dom.testNotificationBtn.disabled) return;
      
      this.dom.testNotificationBtn.disabled = true;
      this.showLocalToast("Test Started", "Scheduling 5 test notifications (30s intervals).", "success");

      NotificationManager.scheduleTestSequence(() => {
        this.dom.testNotificationBtn.disabled = false;
        this.showLocalToast("Test Completed", "Test notification completed.", "success");
      });
    });

    // Reset Today Checklist trigger
    this.dom.resetTodayBtn.addEventListener('click', () => {
      console.group("%c🧹 Today's Data Reset", "color: #eab308; font-weight: bold;");
      try {
        if (this.dom.loadingOverlay) {
          this.dom.loadingOverlay.classList.remove('fade-out');
        }
        StorageManager.resetToday();
        playSuccessChime();
        console.log("Today's checklist data has been reset to defaults.");
        setTimeout(() => {
          this.showLocalToast("Today Reset", "Today's checklist and sliders have been cleared.", "success");
          if (this.dom.loadingOverlay) {
            this.dom.loadingOverlay.classList.add('fade-out');
          }
        }, 300);
      } catch (err) {
        console.error("Failed to reset today's data:", err);
      } finally {
        console.groupEnd();
      }
    });


    // --- Wipe Database Modal Interactions ---
    const openWipeModal = () => {
      if (this.dom.wipeDatabaseConfirmModal) {
        this.dom.wipeDatabaseConfirmModal.style.display = 'flex';
        document.body.classList.add('modal-open');
        requestAnimationFrame(() => {
          this.dom.wipeDatabaseConfirmModal.classList.add('active');
        });
      }
    };

    const closeWipeModal = () => {
      if (this.dom.wipeDatabaseConfirmModal) {
        this.dom.wipeDatabaseConfirmModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        setTimeout(() => {
          this.dom.wipeDatabaseConfirmModal.style.display = 'none';
        }, 300);
      }
    };

    this.dom.clearAllHistoryBtn.addEventListener('click', openWipeModal);
    if (this.dom.cancelWipeBtn) {
      this.dom.cancelWipeBtn.addEventListener('click', closeWipeModal);
    }
    if (this.dom.wipeDatabaseConfirmModal) {
      this.dom.wipeDatabaseConfirmModal.addEventListener('click', (e) => {
        if (e.target === this.dom.wipeDatabaseConfirmModal) closeWipeModal();
      });
    }

    if (this.dom.confirmWipeBtn) {
      this.dom.confirmWipeBtn.addEventListener('click', async () => {
        this.dom.confirmWipeBtn.disabled = true;
        this.dom.confirmWipeBtn.innerText = "Clearing...";
        if (this.dom.cancelWipeBtn) this.dom.cancelWipeBtn.disabled = true;
        
        console.group("%c🔥 Database Wiped", "color: #ef4444; font-weight: bold;");
        try {
          if (this.dom.loadingOverlay) {
            this.dom.loadingOverlay.classList.remove('fade-out');
          }
          localStorage.clear();
          sessionStorage.clear();
          console.log("LocalStorage and SessionStorage successfully cleared.");

          this.showLocalToast("Wiped Clean", "Database wiped successfully. Redirecting to Login...", "warning");
          setTimeout(() => {
            window.location.href = "login.html";
          }, 1000);
        } catch (error) {
          console.error("Error during database wipe execution:", error);
          this.showLocalToast("Wipe Failed", "An error occurred during database wipe.", "danger");
          this.dom.confirmWipeBtn.disabled = false;
          this.dom.confirmWipeBtn.innerText = "Clear Everything";
          if (this.dom.cancelWipeBtn) this.dom.cancelWipeBtn.disabled = false;
        } finally {
          console.groupEnd();
        }
      });
    }

    // --- Clear History & Analytics Modal Interactions ---
    const openClearHistoryModal = () => {
      if (this.dom.clearHistoryConfirmModal) {
        this.dom.clearHistoryConfirmModal.style.display = 'flex';
        document.body.classList.add('modal-open');
        requestAnimationFrame(() => {
          this.dom.clearHistoryConfirmModal.classList.add('active');
        });
      }
    };

    const closeClearHistoryModal = () => {
      if (this.dom.clearHistoryConfirmModal) {
        this.dom.clearHistoryConfirmModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        setTimeout(() => {
          this.dom.clearHistoryConfirmModal.style.display = 'none';
        }, 300);
      }
    };

    if (this.dom.clearHistoryBtn) {
      this.dom.clearHistoryBtn.addEventListener('click', openClearHistoryModal);
    }
    if (this.dom.cancelClearHistoryBtn) {
      this.dom.cancelClearHistoryBtn.addEventListener('click', closeClearHistoryModal);
    }
    if (this.dom.clearHistoryConfirmModal) {
      this.dom.clearHistoryConfirmModal.addEventListener('click', (e) => {
        if (e.target === this.dom.clearHistoryConfirmModal) closeClearHistoryModal();
      });
    }

    if (this.dom.confirmClearHistoryBtn) {
      this.dom.confirmClearHistoryBtn.addEventListener('click', async () => {
        this.dom.confirmClearHistoryBtn.disabled = true;
        this.dom.confirmClearHistoryBtn.innerText = "Clearing...";
        if (this.dom.cancelClearHistoryBtn) this.dom.cancelClearHistoryBtn.disabled = true;

        console.group("%c📊 History & Analytics Cleared", "color: #3b82f6; font-weight: bold;");
        try {
          if (this.dom.loadingOverlay) {
            this.dom.loadingOverlay.classList.remove('fade-out');
          }

          // 1. Get raw HabitTracker data and keep only settings object
          const rawData = StorageManager.getRawData();
          const settings = rawData.settings || {};
          const cleanedData = {
            settings: settings
          };
          StorageManager.saveRawData(cleanedData);
          console.log("All date-based completion records and tracker logs removed from HabitTracker database.");

          // 2. Clear notified slots logs from local storage to reset reminders
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith("notified_slots_")) {
              localStorage.removeItem(key);
              console.log(`Removed notified slot log: ${key}`);
            }
          });

          this.showLocalToast("Cleaned", "History & Analytics cleared successfully.", "success");
          console.info("History & Analytics cleanup completed successfully.");
          
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (error) {
          console.error("Error during history & analytics cleanup execution:", error);
          this.showLocalToast("Cleanup Failed", "An error occurred during cleanup.", "danger");
          this.dom.confirmClearHistoryBtn.disabled = false;
          this.dom.confirmClearHistoryBtn.innerText = "Clear History";
          if (this.dom.cancelClearHistoryBtn) this.dom.cancelClearHistoryBtn.disabled = false;
        } finally {
          console.groupEnd();
        }
      });
    }

    // Global Key Listener for modal close
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeWipeModal();
        closeClearHistoryModal();
      }
    });

    // Export JSON
    if (this.dom.exportJsonBtn) {
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
    }

    // Import JSON File Picker
    if (this.dom.importJsonBtn) {
      this.dom.importJsonBtn.addEventListener('click', () => {
        this.dom.importJsonFileInput.click();
      });
    }

    if (this.dom.importJsonFileInput) {
      this.dom.importJsonFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (this.dom.loadingOverlay) {
          this.dom.loadingOverlay.classList.remove('fade-out');
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target.result;
          const success = StorageManager.importData(text);
          
          setTimeout(() => {
            if (success) {
              playSuccessChime();
              this.showLocalToast("Restore Complete", "Data imported successfully. Reloading workspace...", "success");
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            } else {
              this.showLocalToast("Restore Failed", "Invalid backup file or corrupted format.", "warning");
              if (this.dom.loadingOverlay) {
                this.dom.loadingOverlay.classList.add('fade-out');
              }
            }
          }, 500);
        };
        reader.readAsText(file);
      });
    }

    this.dom.exportCsvBtn.addEventListener('click', () => {
      console.group("%c📊 CSV Generated", "color: #10b981; font-weight: bold;");
      const selectedMonth = this.dom.reportMonthInput ? this.dom.reportMonthInput.value : "";
      if (this.dom.loadingOverlay) {
        this.dom.loadingOverlay.classList.remove('fade-out');
      }
      setTimeout(() => {
        try {
          const data = StorageManager.getRawData();
          const historyOnly = {};
          Object.keys(data).forEach(k => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(k)) {
              if (selectedMonth && !k.startsWith(selectedMonth)) {
                return;
              }
              historyOnly[k] = data[k];
            }
          });
          downloadCSVReport(historyOnly, selectedMonth);
          console.info(`CSV report successfully generated for month: ${selectedMonth || 'All'}`);
          this.showLocalToast("CSV Generated", "Spreadsheet report download started.", "success");
        } catch (err) {
          console.error("CSV generation failed:", err);
        } finally {
          if (this.dom.loadingOverlay) {
            this.dom.loadingOverlay.classList.add('fade-out');
          }
          console.groupEnd();
        }
      }, 300);
    });

    // Export PDF Print View
    this.dom.exportPdfBtn.addEventListener('click', () => {
      console.group("%c📄 PDF Generated", "color: #3b82f6; font-weight: bold;");
      const selectedMonth = this.dom.reportMonthInput ? this.dom.reportMonthInput.value : "";
      if (this.dom.loadingOverlay) {
        this.dom.loadingOverlay.classList.remove('fade-out');
      }
      setTimeout(() => {
        try {
          exportPDFReport(selectedMonth);
          console.info(`PDF report successfully generated for month: ${selectedMonth || 'All'}`);
        } catch (err) {
          console.error("PDF generation failed:", err);
        } finally {
          if (this.dom.loadingOverlay) {
            this.dom.loadingOverlay.classList.add('fade-out');
          }
          console.groupEnd();
        }
      }, 500);
    });

    // Bottom Nav FAB click
    const bottomNavAddBtn = document.getElementById('bottomNavAddBtn');
    if (bottomNavAddBtn) {
      bottomNavAddBtn.addEventListener('click', () => {
        window.location.href = 'index.html?openAdd=true';
      });
    }
  }

  saveSettingKey(key, value) {
    console.group("%c⚙️ Settings Saved", "color: #3b82f6; font-weight: bold;");
    try {
      const raw = StorageManager.getRawData();
      if (!raw.settings) raw.settings = {};
      raw.settings[key] = value;
      StorageManager.saveRawData(raw);
      if (key === "pushNotificationsEnabled") {
        console.log("Saved Push Settings: " + value);
      }
      console.log(`Setting key "${key}" saved with value:`, value);
      console.info("LocalStorage Saved successfully.");
    } catch (e) {
      console.error("Failed to save setting key:", e);
    } finally {
      console.groupEnd();
    }
  }

  showLocalToast(title, message, type = "info") {
    showToast({
      title,
      message,
      type,
      duration: 3000
    });
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
  new SettingsPageController();
});
