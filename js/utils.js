/**
 * My Daily Habit Tracker - Utilities
 * Contains dates, custom sound chime, motivational quotes, theme toggle, and export.
 */

// Random motivational quotes
const MOTIVATIONAL_QUOTES = [
  "Consistency beats motivation.",
  "Small progress every day.",
  "Never skip twice.",
  "Small habits build big results.",
  "You are what you repeatedly do.",
  "The secret of your future is hidden in your daily routine.",
  "Habits are the compound interest of self-improvement.",
  "Focus on the process, not the outcome.",
  "Day by day, step by step.",
  "First we make our habits, then our habits make us."
];

/**
 * Get a pseudo-random quote based on the day of the year.
 */
export function getDailyQuote(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[index];
}

/**
 * Format date for header (e.g. Wednesday, 08 July 2026)
 */
export function formatHeaderDate(date) {
  const options = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
}

/**
 * Format simple date to YYYY-MM-DD
 */
export function toISODateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Digital clock tick update
 */
export function updateDigitalClock(elementId) {
  const clockEl = document.getElementById(elementId);
  if (!clockEl) return;

  const tick = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    clockEl.textContent = `${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
  };

  tick();
  setInterval(tick, 1000);
}

/**
 * Play a high-quality synth chime using Web Audio API
 */
export function playSuccessChime() {
  try {
    // Check settings first (if user disabled sound)
    const settingsRaw = localStorage.getItem("HabitTracker");
    if (settingsRaw) {
      const parsed = JSON.parse(settingsRaw);
      if (parsed.settings && parsed.settings.sounds === false) {
        return; // Muted
      }
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    
    // Primary chime node
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc1.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.12); // G5

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
    osc2.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.12); // C6

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
    
    osc1.stop(audioCtx.currentTime + 0.8);
    osc2.stop(audioCtx.currentTime + 0.8);
  } catch (err) {
    console.warn("Chime playback error/blocked: ", err);
  }
}

/**
 * Play a low tone for notifications
 */
export function playNotificationSound() {
  try {
    const settingsRaw = localStorage.getItem("HabitTracker");
    if (settingsRaw) {
      const parsed = JSON.parse(settingsRaw);
      if (parsed.settings && parsed.settings.sounds === false) {
        return;
      }
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
    osc.frequency.linearRampToValueAtTime(349.23, audioCtx.currentTime + 0.2); // F4

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (err) {
    console.warn("Notification sound blocked: ", err);
  }
}

/**
 * Dynamic theme loader & manager
 */
export function initTheme() {
  const getThemePreference = () => {
    try {
      const raw = localStorage.getItem("HabitTracker");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.settings && parsed.settings.theme) {
          return parsed.settings.theme;
        }
      }
    } catch(e){}
    return "dark"; // default dark
  };

  const currentTheme = getThemePreference();
  document.documentElement.setAttribute("data-theme", currentTheme);
  return currentTheme;
}

export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);

  // Update localStorage
  try {
    const raw = localStorage.getItem("HabitTracker") || "{}";
    const parsed = JSON.parse(raw);
    if (!parsed.settings) parsed.settings = {};
    parsed.settings.theme = newTheme;
    localStorage.setItem("HabitTracker", JSON.stringify(parsed));
  } catch(e){}
  
  return newTheme;
}

/**
 * Export history as CSV
 */
export function downloadCSVReport(historyData) {
  let csvContent = "data:text/csv;charset=utf-8,Date,Day,Completion Rate %,Completed HabitsCount,Total HabitsCount,Notes,Water Glasses,Sleep Hours,Gym\n";
  
  Object.keys(historyData).sort().forEach(dateStr => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
    const day = historyData[dateStr];
    
    // Calculate stats
    let completed = 0;
    let total = 0;
    Object.keys(day).forEach(key => {
      if (key.indexOf("__") !== 0 && typeof day[key] === "boolean") {
        total++;
        if (day[key]) completed++;
      }
    });

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const notes = (day.__tracker_notes || "").replace(/"/g, '""');
    const water = day.__tracker_water || 0;
    const sleep = day.__tracker_sleep || 0;
    const gym = day.__tracker_gym ? "Yes" : "No";

    // Day name
    const d = new Date(dateStr);
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });

    csvContent += `"${dateStr}","${dayName}",${percent},${completed},${total},"${notes}",${water},${sleep},"${gym}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `HabitTracker_Monthly_Report_${new Date().getFullYear()}_${new Date().getMonth() + 1}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Print simple CSS-styled page report (trigger browser print)
 */
export function exportPDFReport() {
  window.print();
}

/**
 * Register Service Worker for PWA
 */
export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .then(reg => console.log("Service Worker registered successfully:", reg.scope))
        .catch(err => console.error("Service Worker registration failed:", err));
    });
  }
}

// Setup mobile menu dynamically
function initMobileMenu() {
  const navbarContainer = document.querySelector(".navbar-container");
  if (!navbarContainer) return;
  if (document.getElementById("navMenuToggleBtn")) return;

  // Create menu toggle button
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "nav-menu-toggle";
  toggleBtn.id = "navMenuToggleBtn";
  toggleBtn.ariaLabel = "Toggle Navigation Menu";
  toggleBtn.innerHTML = `
    <span class="bar"></span>
    <span class="bar"></span>
    <span class="bar"></span>
  `;
  navbarContainer.appendChild(toggleBtn);

  // Create drawer HTML
  const drawerContainer = document.createElement("div");
  drawerContainer.innerHTML = `
    <div class="mobile-nav-drawer" id="mobileNavDrawer">
      <div class="drawer-header">
        <div class="drawer-brand">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary); filter: drop-shadow(0 0 4px var(--primary));">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
          Habits Menu
        </div>
        <button class="drawer-close-btn" id="drawerCloseBtn" aria-label="Close menu">&times;</button>
      </div>
      <div class="drawer-body">
        <a href="index.html" class="drawer-link" id="drawerTodayBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Dashboard
        </a>
        <a href="history.html" class="drawer-link" id="drawerHistoryBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          History Logs
        </a>
        <a href="stats.html" class="drawer-link" id="drawerStatsBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          Analytics Stats
        </a>
        <a href="settings.html" class="drawer-link" id="drawerSettingsBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.5 1z"/></svg>
          Settings
        </a>
      </div>
      <div class="drawer-footer">
        <button class="drawer-theme-toggle" id="drawerThemeToggleBtn" aria-label="Toggle light/dark theme">
          <span class="theme-label">Theme Mode</span>
          <span class="drawer-theme-icon">🌙</span>
        </button>
      </div>
    </div>
    <div class="drawer-overlay" id="drawerOverlay"></div>
  `;
  document.body.appendChild(drawerContainer);

  const drawer = document.getElementById("mobileNavDrawer");
  const overlay = document.getElementById("drawerOverlay");
  const closeBtn = document.getElementById("drawerCloseBtn");
  const drawerThemeToggleBtn = document.getElementById("drawerThemeToggleBtn");
  const drawerThemeIcon = drawerContainer.querySelector(".drawer-theme-icon");

  // Sync initial theme icon inside drawer
  const updateDrawerThemeIcon = () => {
    const theme = document.documentElement.getAttribute("data-theme") || "dark";
    if (drawerThemeIcon) {
      drawerThemeIcon.textContent = theme === "dark" ? "🌙" : "☀️";
    }
  };
  updateDrawerThemeIcon();

  // Toggle drawer open/close
  const toggleDrawer = () => {
    drawer.classList.toggle("active");
    overlay.classList.toggle("active");
    toggleBtn.classList.toggle("active");
    updateDrawerThemeIcon();
  };

  toggleBtn.addEventListener("click", toggleDrawer);
  closeBtn.addEventListener("click", toggleDrawer);
  overlay.addEventListener("click", toggleDrawer);

  // Handle drawer theme toggle click
  drawerThemeToggleBtn.addEventListener("click", () => {
    toggleTheme();
    updateDrawerThemeIcon();
    
    // Check if there is an active theme toggle switch in settings.html or app.js and sync them
    const themeToggleSwitch = document.getElementById("themeToggleSwitch");
    if (themeToggleSwitch) {
      const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
      themeToggleSwitch.checked = currentTheme === "dark";
    }
  });

  // Determine and mark active link
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf("/") + 1);
  const activeId = page === "history.html" ? "drawerHistoryBtn" :
                   page === "stats.html" ? "drawerStatsBtn" :
                   page === "settings.html" ? "drawerSettingsBtn" : 
                   "drawerTodayBtn"; // default index.html
  
  const activeLink = document.getElementById(activeId);
  if (activeLink) {
    activeLink.classList.add("active");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMobileMenu);
} else {
  initMobileMenu();
}

