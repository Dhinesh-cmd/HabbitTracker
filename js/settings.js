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

      // Data Backup & Restore buttons
      uploadDataBtn: document.getElementById('uploadDataBtn'),
      downloadDataBtn: document.getElementById('downloadDataBtn'),

      // Legacy JSON backups
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

      // Clear Habits Danger Zone
      clearHabitsBtn: document.getElementById('clearHabitsBtn'),
      clearHabitsConfirmModal: document.getElementById('clearHabitsConfirmModal'),
      cancelClearHabitsBtn: document.getElementById('cancelClearHabitsBtn'),
      confirmClearHabitsBtn: document.getElementById('confirmClearHabitsBtn'),

      // Export Modal
      exportDataModal: document.getElementById('exportDataModal'),
      closeExportModalBtn: document.getElementById('closeExportModalBtn'),
      cancelExportBtn: document.getElementById('cancelExportBtn'),
      exportSelectAllBtn: document.getElementById('exportSelectAllBtn'),
      exportDeselectAllBtn: document.getElementById('exportDeselectAllBtn'),
      confirmExportBtn: document.getElementById('confirmExportBtn'),
      copyExportJsonBtn: document.getElementById('copyExportJsonBtn'),
      exportSummaryText: document.getElementById('exportSummaryText'),
      exportFallbackArea: document.getElementById('exportFallbackArea'),
      exportFallbackTextarea: document.getElementById('exportFallbackTextarea'),

      // Import Modal
      importDataModal: document.getElementById('importDataModal'),
      closeImportModalBtn: document.getElementById('closeImportModalBtn'),
      cancelImportBtn: document.getElementById('cancelImportBtn'),
      importSelectAllBtn: document.getElementById('importSelectAllBtn'),
      importDeselectAllBtn: document.getElementById('importDeselectAllBtn'),
      backupJsonFileInput: document.getElementById('backupJsonFileInput'),
      fileUploadDropzone: document.getElementById('fileUploadDropzone'),
      selectedFileBadge: document.getElementById('selectedFileBadge'),
      togglePasteJsonBtn: document.getElementById('togglePasteJsonBtn'),
      pasteToggleIcon: document.getElementById('pasteToggleIcon'),
      pasteJsonContainer: document.getElementById('pasteJsonContainer'),
      importPasteTextarea: document.getElementById('importPasteTextarea'),
      importPreviewBox: document.getElementById('importPreviewBox'),
      importPreviewIcon: document.getElementById('importPreviewIcon'),
      importPreviewContent: document.getElementById('importPreviewContent'),
      confirmImportBtn: document.getElementById('confirmImportBtn'),

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

    this.uploadedBackupData = null;

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

    // --- Modal Open/Close Transitions ---
    const openModal = (modalEl) => {
      if (!modalEl) return;
      modalEl.style.display = 'flex';
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        modalEl.classList.add('active');
      });
    };

    const closeModal = (modalEl) => {
      if (!modalEl) return;
      modalEl.classList.remove('active');
      document.body.classList.remove('modal-open');
      setTimeout(() => {
        modalEl.style.display = 'none';
      }, 250);
    };

    // Close on click outside backdrop
    [
      this.dom.wipeDatabaseConfirmModal,
      this.dom.clearHistoryConfirmModal,
      this.dom.clearHabitsConfirmModal,
      this.dom.exportDataModal,
      this.dom.importDataModal
    ].forEach(modalEl => {
      if (modalEl) {
        modalEl.addEventListener('click', (e) => {
          if (e.target === modalEl) closeModal(modalEl);
        });
      }
    });

    // Global Key Listener for modal close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal(this.dom.wipeDatabaseConfirmModal);
        closeModal(this.dom.clearHistoryConfirmModal);
        closeModal(this.dom.clearHabitsConfirmModal);
        closeModal(this.dom.exportDataModal);
        closeModal(this.dom.importDataModal);
      }
    });

    // --- Clear Habits Feature ---
    if (this.dom.clearHabitsBtn) {
      this.dom.clearHabitsBtn.addEventListener('click', () => {
        openModal(this.dom.clearHabitsConfirmModal);
      });
    }

    if (this.dom.cancelClearHabitsBtn) {
      this.dom.cancelClearHabitsBtn.addEventListener('click', () => {
        closeModal(this.dom.clearHabitsConfirmModal);
      });
    }

    if (this.dom.confirmClearHabitsBtn) {
      this.dom.confirmClearHabitsBtn.addEventListener('click', async () => {
        this.dom.confirmClearHabitsBtn.disabled = true;
        this.dom.confirmClearHabitsBtn.innerText = "Clearing Habits...";
        if (this.dom.cancelClearHabitsBtn) this.dom.cancelClearHabitsBtn.disabled = true;

        console.group("%c🗑️ Clear All Habits Executed", "color: #ef4444; font-weight: bold;");
        try {
          if (this.dom.loadingOverlay) {
            this.dom.loadingOverlay.classList.remove('fade-out');
          }

          const success = StorageManager.clearAllHabits();
          if (success) {
            playSuccessChime();
            this.showLocalToast("Habits Cleared", "All habits and completion history have been removed. Profile and settings preserved.", "success");
            console.info("All habits and habit-related history records cleared successfully.");
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            throw new Error("Unable to clear habits.");
          }
        } catch (err) {
          console.error("Error clearing habits:", err);
          this.showLocalToast("Action Failed", "Could not clear habits. Existing data preserved.", "danger");
          this.dom.confirmClearHabitsBtn.disabled = false;
          this.dom.confirmClearHabitsBtn.innerText = "Clear All Habits";
          if (this.dom.cancelClearHabitsBtn) this.dom.cancelClearHabitsBtn.disabled = false;
          if (this.dom.loadingOverlay) {
            this.dom.loadingOverlay.classList.add('fade-out');
          }
        } finally {
          console.groupEnd();
        }
      });
    }

    // --- Category Checkbox Helper Logic (Export & Import) ---
    const setupCategoryInteractions = (prefix, onSelectionChange) => {
      const entireDataCb = document.getElementById(`${prefix}CatEntireData`);
      const entireHabitsCb = document.getElementById(`${prefix}CatEntireHabits`);
      const habitCats = ['diet', 'routine', 'skincare', 'haircare', 'others'];
      const habitCbs = habitCats.map(c => document.getElementById(`${prefix}Cat${c.charAt(0).toUpperCase() + c.slice(1)}`)).filter(Boolean);

      const selectAllBtn = document.getElementById(`${prefix}SelectAllBtn`);
      const deselectAllBtn = document.getElementById(`${prefix}DeselectAllBtn`);

      if (entireDataCb) {
        entireDataCb.addEventListener('change', () => {
          const checked = entireDataCb.checked;
          if (entireHabitsCb) entireHabitsCb.checked = checked;
          habitCbs.forEach(cb => cb.checked = checked);
          if (onSelectionChange) onSelectionChange();
        });
      }

      if (entireHabitsCb) {
        entireHabitsCb.addEventListener('change', () => {
          const checked = entireHabitsCb.checked;
          habitCbs.forEach(cb => cb.checked = checked);
          if (!checked && entireDataCb) entireDataCb.checked = false;
          if (onSelectionChange) onSelectionChange();
        });
      }

      habitCbs.forEach(cb => {
        cb.addEventListener('change', () => {
          const allHabitsChecked = habitCbs.every(c => c.checked);
          if (entireHabitsCb) {
            entireHabitsCb.checked = allHabitsChecked;
          }
          if (!cb.checked && entireDataCb) {
            entireDataCb.checked = false;
          }
          if (onSelectionChange) onSelectionChange();
        });
      });

      if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
          if (entireDataCb) entireDataCb.checked = true;
          if (entireHabitsCb) entireHabitsCb.checked = true;
          habitCbs.forEach(cb => cb.checked = true);
          if (onSelectionChange) onSelectionChange();
        });
      }

      if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
          if (entireDataCb) entireDataCb.checked = false;
          if (entireHabitsCb) entireHabitsCb.checked = false;
          habitCbs.forEach(cb => cb.checked = false);
          if (onSelectionChange) onSelectionChange();
        });
      }
    };

    const getSelectedCategories = (prefix) => {
      const entireData = document.getElementById(`${prefix}CatEntireData`)?.checked;
      if (entireData) return ['entire_data'];

      const entireHabits = document.getElementById(`${prefix}CatEntireHabits`)?.checked;
      const habitCats = ['diet', 'routine', 'skincare', 'haircare', 'others'];
      const selected = [];
      habitCats.forEach(c => {
        const cb = document.getElementById(`${prefix}Cat${c.charAt(0).toUpperCase() + c.slice(1)}`);
        if (cb && cb.checked) selected.push(c);
      });

      if (entireHabits && selected.length === 5) return ['entire_habits'];
      if (entireHabits) return ['entire_habits', ...selected];
      return selected;
    };

    // --- Download Data (Export Modal) ---
    const updateExportSummary = () => {
      const selected = getSelectedCategories('export');
      const hasSelection = selected.length > 0;

      if (this.dom.confirmExportBtn) this.dom.confirmExportBtn.disabled = !hasSelection;
      if (this.dom.copyExportJsonBtn) this.dom.copyExportJsonBtn.disabled = !hasSelection;

      if (!hasSelection) {
        if (this.dom.exportSummaryText) {
          this.dom.exportSummaryText.textContent = "Please select at least one category to export.";
        }
        return;
      }

      if (selected.includes('entire_data')) {
        if (this.dom.exportSummaryText) {
          this.dom.exportSummaryText.textContent = "Ready to export: Entire application backup (profile, settings, habits, history, statistics).";
        }
      } else if (selected.includes('entire_habits')) {
        if (this.dom.exportSummaryText) {
          this.dom.exportSummaryText.textContent = "Ready to export: All habits and completion history across all categories.";
        }
      } else {
        const catLabels = { diet: "Diet", routine: "Routine", skincare: "Skin Care", haircare: "Hair Care", others: "Others" };
        const catNames = selected.map(c => catLabels[c] || c);
        if (this.dom.exportSummaryText) {
          this.dom.exportSummaryText.textContent = `Ready to export: Habits and history for ${catNames.join(', ')}.`;
        }
      }
    };

    setupCategoryInteractions('export', updateExportSummary);

    if (this.dom.downloadDataBtn) {
      this.dom.downloadDataBtn.addEventListener('click', () => {
        const entireDataCb = document.getElementById('exportCatEntireData');
        if (entireDataCb) {
          entireDataCb.checked = true;
          entireDataCb.dispatchEvent(new Event('change'));
        }
        if (this.dom.exportFallbackArea) this.dom.exportFallbackArea.style.display = 'none';
        updateExportSummary();
        openModal(this.dom.exportDataModal);
      });
    }

    if (this.dom.closeExportModalBtn) {
      this.dom.closeExportModalBtn.addEventListener('click', () => closeModal(this.dom.exportDataModal));
    }
    if (this.dom.cancelExportBtn) {
      this.dom.cancelExportBtn.addEventListener('click', () => closeModal(this.dom.exportDataModal));
    }

    // Descriptive filename generator
    const getExportFilename = (selected) => {
      if (selected.includes('entire_data')) {
        return `habit-tracker-full-backup-${this.todayStr}.json`;
      } else if (selected.includes('entire_habits')) {
        return `habit-tracker-habits-backup-${this.todayStr}.json`;
      } else if (selected.length === 1) {
        return `habit-tracker-${selected[0]}-backup-${this.todayStr}.json`;
      } else {
        return `habit-tracker-selected-categories-backup-${this.todayStr}.json`;
      }
    };

    // Download JSON via Blob API
    if (this.dom.confirmExportBtn) {
      this.dom.confirmExportBtn.addEventListener('click', () => {
        const selected = getSelectedCategories('export');
        if (selected.length === 0) return;

        try {
          const backupObj = StorageManager.generateBackup(selected);
          const jsonString = JSON.stringify(backupObj, null, 2);
          const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const filename = getExportFilename(selected);

          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          this.showLocalToast("Export Successful", `Downloaded backup file: ${filename}`, "success");
          closeModal(this.dom.exportDataModal);
        } catch (err) {
          console.error("Export error:", err);
          this.showLocalToast("Export Failed", "An error occurred while generating backup.", "danger");
        }
      });
    }

    // Copy JSON to clipboard
    if (this.dom.copyExportJsonBtn) {
      this.dom.copyExportJsonBtn.addEventListener('click', async () => {
        const selected = getSelectedCategories('export');
        if (selected.length === 0) return;

        try {
          const backupObj = StorageManager.generateBackup(selected);
          const jsonString = JSON.stringify(backupObj, null, 2);

          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(jsonString);
            this.showLocalToast("Copied to Clipboard", "Backup JSON payload copied successfully.", "success");
          } else {
            throw new Error("Clipboard API not available");
          }
        } catch (err) {
          console.warn("Clipboard access issue, showing fallback:", err);
          if (this.dom.exportFallbackArea && this.dom.exportFallbackTextarea) {
            const backupObj = StorageManager.generateBackup(selected);
            this.dom.exportFallbackTextarea.value = JSON.stringify(backupObj, null, 2);
            this.dom.exportFallbackArea.style.display = 'block';
            this.dom.exportFallbackTextarea.select();
            this.showLocalToast("Manual Copy Required", "Please copy the JSON text from the box below.", "warning");
          }
        }
      });
    }

    // --- Upload Data (Import Modal) ---
    const updateImportValidation = () => {
      if (!this.uploadedBackupData) {
        if (this.dom.importPreviewBox) this.dom.importPreviewBox.style.display = 'none';
        if (this.dom.confirmImportBtn) {
          this.dom.confirmImportBtn.disabled = true;
          this.dom.confirmImportBtn.style.opacity = '0.6';
          this.dom.confirmImportBtn.style.cursor = 'not-allowed';
        }
        return;
      }

      const selected = getSelectedCategories('import');
      if (selected.length === 0) {
        if (this.dom.importPreviewBox) {
          this.dom.importPreviewBox.style.display = 'flex';
          this.dom.importPreviewBox.className = 'backup-summary-box error';
          if (this.dom.importPreviewIcon) this.dom.importPreviewIcon.className = 'fa-solid fa-triangle-exclamation';
          if (this.dom.importPreviewContent) {
            this.dom.importPreviewContent.innerHTML = '<strong>No category selected.</strong> Please select at least one category to import.';
          }
        }
        if (this.dom.confirmImportBtn) {
          this.dom.confirmImportBtn.disabled = true;
          this.dom.confirmImportBtn.style.opacity = '0.6';
          this.dom.confirmImportBtn.style.cursor = 'not-allowed';
        }
        return;
      }

      const validation = StorageManager.validateBackup(this.uploadedBackupData, selected);
      if (this.dom.importPreviewBox) {
        this.dom.importPreviewBox.style.display = 'flex';
        if (validation.valid) {
          this.dom.importPreviewBox.className = 'backup-summary-box success';
          if (this.dom.importPreviewIcon) this.dom.importPreviewIcon.className = 'fa-solid fa-circle-check';
          const { habitCount, historyDays, categoriesFound, hasProfile, hasSettings } = validation.summary;
          let details = `<strong>Backup Validated:</strong> ${habitCount} matching habit${habitCount === 1 ? '' : 's'} across ${categoriesFound.length > 0 ? categoriesFound.join(', ') : 'selected categories'}. History: ${historyDays} day${historyDays === 1 ? '' : 's'}.`;
          if (hasProfile) details += ` Profile data detected.`;
          if (hasSettings) details += ` Settings detected.`;
          if (this.dom.importPreviewContent) {
            this.dom.importPreviewContent.innerHTML = details;
          }

          if (this.dom.confirmImportBtn) {
            this.dom.confirmImportBtn.disabled = false;
            this.dom.confirmImportBtn.style.opacity = '1';
            this.dom.confirmImportBtn.style.cursor = 'pointer';
          }
        } else {
          this.dom.importPreviewBox.className = 'backup-summary-box error';
          if (this.dom.importPreviewIcon) this.dom.importPreviewIcon.className = 'fa-solid fa-circle-xmark';
          if (this.dom.importPreviewContent) {
            this.dom.importPreviewContent.innerHTML = `<strong>Validation Failed:</strong> ${validation.error}`;
          }

          if (this.dom.confirmImportBtn) {
            this.dom.confirmImportBtn.disabled = true;
            this.dom.confirmImportBtn.style.opacity = '0.6';
            this.dom.confirmImportBtn.style.cursor = 'not-allowed';
          }
        }
      }
    };

    setupCategoryInteractions('import', updateImportValidation);

    if (this.dom.uploadDataBtn) {
      this.dom.uploadDataBtn.addEventListener('click', () => {
        const entireDataCb = document.getElementById('importCatEntireData');
        if (entireDataCb) {
          entireDataCb.checked = true;
          entireDataCb.dispatchEvent(new Event('change'));
        }
        this.uploadedBackupData = null;
        if (this.dom.backupJsonFileInput) this.dom.backupJsonFileInput.value = '';
        if (this.dom.selectedFileBadge) {
          this.dom.selectedFileBadge.style.display = 'none';
          this.dom.selectedFileBadge.innerHTML = '';
        }
        if (this.dom.importPasteTextarea) this.dom.importPasteTextarea.value = '';
        if (this.dom.pasteJsonContainer) this.dom.pasteJsonContainer.style.display = 'none';
        if (this.dom.pasteToggleIcon) this.dom.pasteToggleIcon.style.transform = 'rotate(0deg)';
        updateImportValidation();
        openModal(this.dom.importDataModal);
      });
    }

    if (this.dom.closeImportModalBtn) {
      this.dom.closeImportModalBtn.addEventListener('click', () => closeModal(this.dom.importDataModal));
    }
    if (this.dom.cancelImportBtn) {
      this.dom.cancelImportBtn.addEventListener('click', () => closeModal(this.dom.importDataModal));
    }

    // Dropzone click -> file input
    if (this.dom.fileUploadDropzone && this.dom.backupJsonFileInput) {
      this.dom.fileUploadDropzone.addEventListener('click', () => {
        this.dom.backupJsonFileInput.click();
      });

      this.dom.fileUploadDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.dom.fileUploadDropzone.classList.add('drag-over');
      });

      this.dom.fileUploadDropzone.addEventListener('dragleave', () => {
        this.dom.fileUploadDropzone.classList.remove('drag-over');
      });

      this.dom.fileUploadDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.dom.fileUploadDropzone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleFileImport(file);
      });
    }

    const handleFileImport = (file) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
        this.showLocalToast("Invalid File Type", "Please select a valid .json backup file.", "warning");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        this.uploadedBackupData = event.target.result;
        if (this.dom.selectedFileBadge) {
          const sizeKb = (file.size / 1024).toFixed(1);
          this.dom.selectedFileBadge.innerHTML = `<i class="fa-solid fa-file-code"></i> ${file.name} (${sizeKb} KB) <i class="fa-solid fa-check" style="color: #22C55E; margin-left: 4px;"></i>`;
          this.dom.selectedFileBadge.style.display = 'inline-flex';
        }
        updateImportValidation();
      };
      reader.onerror = () => {
        this.showLocalToast("Read Error", "Could not read selected file.", "danger");
      };
      reader.readAsText(file);
    };

    if (this.dom.backupJsonFileInput) {
      this.dom.backupJsonFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileImport(file);
      });
    }

    // Toggle Paste JSON section
    if (this.dom.togglePasteJsonBtn && this.dom.pasteJsonContainer) {
      this.dom.togglePasteJsonBtn.addEventListener('click', () => {
        const isHidden = this.dom.pasteJsonContainer.style.display === 'none';
        this.dom.pasteJsonContainer.style.display = isHidden ? 'block' : 'none';
        if (this.dom.pasteToggleIcon) {
          this.dom.pasteToggleIcon.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
        }
      });
    }

    if (this.dom.importPasteTextarea) {
      this.dom.importPasteTextarea.addEventListener('input', () => {
        const val = this.dom.importPasteTextarea.value.trim();
        if (val) {
          this.uploadedBackupData = val;
          if (this.dom.selectedFileBadge) {
            this.dom.selectedFileBadge.style.display = 'none';
          }
        } else {
          this.uploadedBackupData = null;
        }
        updateImportValidation();
      });
    }

    // Execute Import with Confirmation & Safe Rollback
    if (this.dom.confirmImportBtn) {
      this.dom.confirmImportBtn.addEventListener('click', async () => {
        if (!this.uploadedBackupData) return;
        const selected = getSelectedCategories('import');
        if (selected.length === 0) return;

        // Immediate pre-import validation to prevent state mismatch or category mismatch
        const preValidation = StorageManager.validateBackup(this.uploadedBackupData, selected);
        if (!preValidation.valid) {
          updateImportValidation();
          this.showLocalToast("Category Mismatch", preValidation.error, "danger");
          return;
        }

        const confirmed = await CustomDialog.confirm(
          "Import Data",
          "Are you sure you want to restore this backup? Existing data for the selected categories will be updated.",
          true
        );
        if (!confirmed) return;

        this.dom.confirmImportBtn.disabled = true;
        this.dom.confirmImportBtn.innerText = "Importing...";
        if (this.dom.loadingOverlay) {
          this.dom.loadingOverlay.classList.remove('fade-out');
        }

        setTimeout(() => {
          try {
            const res = StorageManager.restoreBackup(this.uploadedBackupData, selected);
            if (res.success) {
              playSuccessChime();
              const catDisplay = res.restoredCategories && res.restoredCategories.length > 0 
                ? res.restoredCategories.join(', ')
                : 'selected categories';
              this.showLocalToast(
                "Restore Complete",
                `Successfully restored ${res.importedHabitCount} habits across ${catDisplay} and ${res.historyDaysCount} history records.`,
                "success"
              );
              setTimeout(() => {
                window.location.reload();
              }, 1200);
            } else {
              throw new Error(res.error || "Import failed.");
            }
          } catch (err) {
            console.error("Backup restoration failed:", err);
            this.showLocalToast("Restore Failed", `${err.message}. Previous data has been safely kept.`, "danger");
            this.dom.confirmImportBtn.disabled = false;
            this.dom.confirmImportBtn.innerHTML = '<i class="fa-solid fa-file-import"></i> Import Data';
            if (this.dom.loadingOverlay) {
              this.dom.loadingOverlay.classList.add('fade-out');
            }
          }
        }, 300);
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
