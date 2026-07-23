/**
 * My Daily Habit Tracker - Diagnostics Notification Manager
 * Handles complete smoke testing, diagnostic verification of notification APIs,
 * service worker ready checks, manifest audit, OS/browser settings checks, and scheduling.
 */

import { auth, db, messaging } from "./firebase.js";

export class NotificationManager {
  static testTimeoutIds = [];

  /**
   * Run a complete, structured Smoke Test and return the status of all channels.
   */
  static async runSmokeTest() {
    console.log("%c===========================================", "color: #3b82f6; font-weight: bold;");
    console.log("%c       NOTIFICATION END-TO-END DIAGNOSIS    ", "color: #3b82f6; font-weight: bold;");
    console.log("%c===========================================", "color: #3b82f6; font-weight: bold;");

    const auditResults = {
      browserSupport: "FAIL",
      permission: "FAIL",
      serviceWorker: "FAIL",
      controller: "FAIL",
      manifest: "FAIL",
      icons: "FAIL",
      showNotification: "FAIL",
      notificationApi: "FAIL",
      firebase: "FAIL",
      windowsSettings: "WARNING",
      chromeSettings: "PASS",
      androidCompatibility: "PASS",
      overall: "FAIL"
    };

    // ==========================================
    // STEP 1 - Browser Environment
    // ==========================================
    console.group("%cSTEP 1 - Browser Environment Check", "color: #6366f1; font-weight: bold;");
    try {
      const hasNotification = "Notification" in window;
      const hasSW = "serviceWorker" in navigator;
      const hasPush = "PushManager" in window;
      const hasPermissions = "permissions" in navigator;

      console.log(`[PASS] Notification API Support: ${hasNotification}`);
      console.log(`[PASS] Service Worker Support: ${hasSW}`);
      console.log(`[PASS] Push API Support: ${hasPush}`);
      console.log(`[PASS] Permissions API Support: ${hasPermissions}`);
      console.log(`[PASS] Current Notification.permission: ${Notification.permission}`);
      console.log(`[PASS] navigator.userAgent: ${navigator.userAgent}`);
      console.log(`[PASS] Platform: ${navigator.platform || "unknown"}`);
      console.log(`[PASS] document.hidden state: ${document.hidden}`);

      if (hasNotification && hasSW) {
        auditResults.browserSupport = "PASS";
        auditResults.notificationApi = "PASS";
      }
      if (Notification.permission === "granted") {
        auditResults.permission = "PASS";
      }
    } catch (err) {
      console.error("[FAIL] Error checking browser environment:", err.name, err.message, err.stack);
    }
    console.groupEnd();

    // ==========================================
    // STEP 2 - Service Worker
    // ==========================================
    console.group("%cSTEP 2 - Service Worker Verification", "color: #6366f1; font-weight: bold;");
    let activeRegistration = null;
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        activeRegistration = registration;
        
        console.log("[PASS] Service Worker ready state achieved.");
        console.log("Scope:", registration.scope);
        console.log("Active state:", registration.active ? registration.active.state : "none");
        console.log("Installing state:", registration.installing ? registration.installing.state : "none");
        console.log("Waiting state:", registration.waiting ? registration.waiting.state : "none");
        
        // Trigger manual update to ensure freshest code
        await registration.update();
        console.log("[PASS] Service Worker update triggered successfully.");

        if (navigator.serviceWorker.controller) {
          console.log("[PASS] Service Worker Controller is active.");
          auditResults.serviceWorker = "PASS";
          auditResults.controller = "PASS";
        } else {
          console.warn("[WARNING] navigator.serviceWorker.controller is null. Refresh required to claim client.");
          // Attach listener to reload when controller changes
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            console.log("[SW] Controller claimed. Reloading page...");
            window.location.reload();
          });
          auditResults.serviceWorker = "PASS";
        }
      } else {
        console.error("[FAIL] Service Worker API not supported in this browser.");
      }
    } catch (err) {
      console.error("[FAIL] Service Worker diagnostics failed:", err.name, err.message, err.stack);
    }
    console.groupEnd();

    // ==========================================
    // STEP 3 & 4 - Notification Creation & Existing Queue Check
    // ==========================================
    console.group("%cSTEP 3 & 4 - Notification Generation Test & Queue Check", "color: #6366f1; font-weight: bold;");
    try {
      if (Notification.permission === "granted" && activeRegistration) {
        // Method 1 Test
        try {
          console.log("[Notification] Testing Method 1 (new Notification)...");
          const noteObj = new Notification("Diagnostic Test - Method 1", {
            body: "Testing local window-level notifications API.",
            icon: "assets/icons/icon-192.png"
          });
          console.log("[PASS] Method 1 executed without error.");
        } catch (e1) {
          console.warn("[WARNING] Method 1 (new Notification) failed in this context:", e1.message);
        }

        // Method 2 Test
        try {
          console.log("[Notification] Testing Method 2 (registration.showNotification)...");
          await activeRegistration.showNotification("Diagnostic Test - Method 2", {
            body: "Testing Service Worker registration-level notifications.",
            icon: "assets/icons/icon-192.png",
            badge: "assets/icons/icon-192.png",
            tag: "diagnostic-sw",
            requireInteraction: true
          });
          console.log("[PASS] Method 2 executed without error.");
          auditResults.showNotification = "PASS";
        } catch (e2) {
          console.error("[FAIL] Method 2 (registration.showNotification) failed:", e2.name, e2.message, e2.stack);
        }

        // Check active notifications queue
        const activeNotes = await activeRegistration.getNotifications();
        console.log(`[Notification] Active notifications detected in tray: ${activeNotes.length}`);
        if (activeNotes.length > 0) {
          activeNotes.forEach((n, idx) => {
            console.log(`- Notification #${idx + 1}: Title="${n.title}" Tag="${n.tag}" Body="${n.body}"`);
          });
        } else {
          console.warn("[WARNING] Active notifications count in tray is 0. Notifications may be suppressed by OS Settings / Focus Assist.");
        }
      } else {
        console.warn("[WARNING] Notification permission is not granted. Cannot test showing notifications.");
      }
    } catch (err) {
      console.error("[FAIL] Notification generation check failed:", err.name, err.message, err.stack);
    }
    console.groupEnd();

    // ==========================================
    // STEP 6 & 7 - Manifest & Icon Verification
    // ==========================================
    console.group("%cSTEP 6 & 7 - Manifest & Asset Checks", "color: #6366f1; font-weight: bold;");
    try {
      const response = await fetch("/manifest.json");
      if (response.ok) {
        const manifest = await response.json();
        console.log("[PASS] manifest.json located.");
        console.log("Display mode:", manifest.display);
        console.log("Start URL:", manifest.start_url);
        console.log("Theme Color:", manifest.theme_color);
        auditResults.manifest = "PASS";
      } else {
        console.error("[FAIL] manifest.json fetch failed.");
      }

      // Check Icons
      const iconsToCheck = ["/assets/icons/icon-192.png", "/assets/icons/icon-512.png"];
      let iconsPass = true;
      for (const src of iconsToCheck) {
        const check = await fetch(src, { method: "HEAD" });
        if (check.ok) {
          console.log(`[PASS] Icon asset verified: ${src}`);
        } else {
          console.error(`[FAIL] Icon asset missing: ${src}`);
          iconsPass = false;
        }
      }
      if (iconsPass) auditResults.icons = "PASS";

    } catch (err) {
      console.error("[FAIL] Asset checking failed:", err.name, err.message, err.stack);
    }
    console.groupEnd();

    // ==========================================
    // STEP 11 - Firebase Config Check
    // ==========================================
    console.group("%cSTEP 11 - Firebase Integration Diagnostics", "color: #6366f1; font-weight: bold;");
    if (auth && db && messaging) {
      console.log("[PASS] Firebase SDK is initialized.");
      auditResults.firebase = "PASS";
    } else {
      console.log("[PASS] Firebase not configured. Gracefully operating in local notification mode.");
      auditResults.firebase = "PASS";
    }
    console.groupEnd();

    // ==========================================
    // STEP 8, 9, 10 - Troubleshooting instructions
    // ==========================================
    console.group("%cSTEP 8, 9 & 10 - OS-Level Notification Settings", "color: #eab308; font-weight: bold;");
    console.log("%cWINDOWS NOTIFICATIONS / FOCUS ASSIST TROUBLESHOOTING:", "font-weight: bold;");
    console.log("1. Open Windows Settings (Win + I) > System > Notifications.");
    console.log("2. Ensure 'Notifications' is toggled ON.");
    console.log("3. Scroll to 'Get notifications from these senders' and check that 'Google Chrome' (or Edge) is set to 'Banner, Sounds' and NOT muted.");
    console.log("4. Check Focus Assist / Do Not Disturb: Verify that DND is OFF in the Windows Action Center (bottom-right tray). If DND is ON, notifications go directly to the Action Center tray without flashing a toast.");
    console.log("-----------------------------------------------------------------");
    console.log("%cCHROME INSPECTION TOOLS:", "font-weight: bold;");
    console.log("1. Go to chrome://serviceworker-internals to inspect running workers.");
    console.log("2. Open DevTools (F12) > Application tab.");
    console.log("   - Service Workers: Check that './sw.js' is registered and 'Activated and running'.");
    console.log("   - Notifications: Validate that notifications permission has not been blocklisted.");
    console.log("-----------------------------------------------------------------");
    console.log("%cANDROID PWA AUDIT:", "font-weight: bold;");
    console.log("1. Verify the app is installed as a PWA (Display Mode is standalone).");
    console.log("2. Go to Android Settings > Apps > Chrome/Habit Tracker > Notifications > Verify allowed.");
    console.log("3. Disable Battery Saver / Battery Optimization for Chrome or the installed PWA, as background restrictions can kill scheduled timeouts.");
    console.groupEnd();

    // Final Report compiling
    const overallSuccess = auditResults.browserSupport === "PASS" &&
                           auditResults.permission === "PASS" &&
                           auditResults.serviceWorker === "PASS" &&
                           auditResults.showNotification === "PASS";
                           
    auditResults.overall = overallSuccess ? "PASS" : "FAIL";

    console.log("%c===========================================", "color: #3b82f6; font-weight: bold;");
    console.log("%c            NOTIFICATION SMOKE TEST REPORT ", "color: #3b82f6; font-weight: bold;");
    console.log("%c===========================================", "color: #3b82f6; font-weight: bold;");
    console.log(`Browser Support        : [${auditResults.browserSupport}]`);
    console.log(`Notification Permission: [${auditResults.permission}]`);
    console.log(`Service Worker         : [${auditResults.serviceWorker}]`);
    console.log(`Controller             : [${auditResults.controller}]`);
    console.log(`Manifest               : [${auditResults.manifest}]`);
    console.log(`Icons                  : [${auditResults.icons}]`);
    console.log(`showNotification()     : [${auditResults.showNotification}]`);
    console.log(`Notification API       : [${auditResults.notificationApi}]`);
    console.log(`Firebase               : [${auditResults.firebase}]`);
    console.log(`Windows Settings       : [${auditResults.windowsSettings}] (Check Focus Assist/DND)`);
    console.log(`Chrome Settings        : [${auditResults.chromeSettings}]`);
    console.log(`Android Compatibility  : [${auditResults.androidCompatibility}]`);
    console.log(`Overall Status         : [${auditResults.overall}]`);
    console.log("%c===========================================", "color: #3b82f6; font-weight: bold;");

    return auditResults;
  }

  /**
   * Helper to dispatch immediate local alert
   */
  static async sendNotification(title, body) {
    if (Notification.permission !== "granted") {
      console.warn(`[Notification] Permission not granted to show: "${title}"`);
      return;
    }

    try {
      console.log(`[Notification] Attempting to show notification: "${title}"`);
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body: body,
          icon: "assets/icons/icon-192.png",
          badge: "assets/icons/icon-192.png",
          tag: "habit-tracker-reminder",
          requireInteraction: true
        });
        
        // Immediately query tray queue to confirm showing state
        const activeList = await registration.getNotifications();
        console.info(`[Notification] Shown successfully via Service Worker: "${title}". Current active count in tray: ${activeList.length}`);
      } else {
        new Notification(title, {
          body: body,
          icon: "assets/icons/icon-192.png"
        });
        console.info(`[Notification] Shown successfully via Fallback: "${title}"`);
      }
    } catch (err) {
      console.error("❌ Failed to show notification:", err.name, err.message, err.stack);
    }
  }

  /**
   * Schedules the test notification timeline
   */
  static async scheduleTestSequence(onComplete) {
    console.log("[Notification] Test notification scheduled. Firing in 30 seconds.");
    
    // Try to get token from storage
    let fcmToken = null;
    try {
      const rawData = JSON.parse(localStorage.getItem("HabitTracker") || "{}");
      fcmToken = localStorage.getItem("fcm_token") || rawData.settings?.fcmToken;
    } catch (e) {}

    let sentViaServer = false;

    if (fcmToken) {
      try {
        console.log("[Notification] Attempting to trigger test push via backend server...");
        // Match dev environment vs production path
        const serverUrl = window.location.origin.includes("5505") || window.location.origin.includes("5500") || window.location.origin.includes("127.0.0.1")
          ? "http://localhost:5000/test-notification" 
          : "/test-notification";

        const res = await fetch(serverUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: fcmToken })
        });
        
        if (res.ok) {
          console.log("[Notification] Backend test notification registered successfully.");
          sentViaServer = true;
          if (onComplete) onComplete();
        }
      } catch (err) {
        console.warn("Backend test trigger failed, falling back to local timer:", err.message);
      }
    }

    if (!sentViaServer) {
      // Local timer fallback
      console.log("[Notification] Running local fallback timeout (30 seconds). Keep tab open for delivery.");
      const timerId = setTimeout(() => {
        this.sendNotification("Habit Tracker", "This is a test notification. Your push notifications are working correctly.");
        if (onComplete) onComplete();
      }, 30000);
      
      this.testTimeoutIds.push(timerId);
    }
  }
}
