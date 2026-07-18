/**
 * Notification Service Coordinator
 * Orchestrates Firebase configuration, FCM permissions, and coordinates background sync triggers.
 */

import { MessagingService } from "./messaging.js";
import { PushService } from "./push-service.js";

export class NotificationService {
  static initialized = false;

  /**
   * Initializes the notification service, registers user token, and starts foreground handlers.
   * @param {ServiceWorkerRegistration} swRegistration Active service worker registration
   * @param {Array<Object>} localHabits List of current user habits to sync
   */
  static async init(swRegistration, localHabits = []) {
    if (this.initialized) return;

    try {
      // 1. Authenticate user anonymously
      const user = await PushService.ensureAuthenticated();
      if (!user) return;

      // 2. Request FCM permissions & retrieve registration token
      const token = await MessagingService.requestPermissionAndGetToken(swRegistration);
      
      if (token) {
        // 3. Register user token and timezone on server
        await PushService.syncUserToken(token);
        
        // 4. Initial bulk sync of existing habits
        if (localHabits.length > 0) {
          await PushService.syncAllHabits(localHabits);
        }
      }

      // 5. Listen to foreground push notifications (optional alert in-app)
      MessagingService.onForegroundMessage((payload) => {
        console.log("FCM foreground payload:", payload);
        if (payload.notification) {
          const { title, body } = payload.notification;
          // Trigger a beautiful local app toast using standard utility if available
          if (window.showToast) {
            window.showToast({
              title: title,
              message: body,
              type: "bell"
            });
          }
        }
      });

      // 6. Watch timezone updates
      this.watchTimezoneChanges(token);

      // 7. Watch online state to trigger background sync when returning online
      window.addEventListener("online", () => {
        console.log("Device is online. Triggering synchronization...");
        if (token && localHabits.length > 0) {
          PushService.syncAllHabits(localHabits);
        }
      });

      this.initialized = true;
      console.log("Notification Service initialized successfully.");
    } catch (e) {
      console.error("Failed to initialize Notification Service:", e);
    }
  }

  /**
   * Automatically update the server if the user's timezone changes.
   */
  static watchTimezoneChanges(token) {
    let currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Check every 5 minutes (lightweight, runs in client background)
    setInterval(async () => {
      const newTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (newTimezone !== currentTimezone && token) {
        console.log(`Timezone change detected from ${currentTimezone} to ${newTimezone}. Updating...`);
        currentTimezone = newTimezone;
        await PushService.syncUserToken(token);
      }
    }, 300000);
  }
}
