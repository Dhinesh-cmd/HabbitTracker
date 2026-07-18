/**
 * Firebase Cloud Messaging Service
 * Handles notification permissions, FCM token acquisition, token refresh, and foreground messages.
 */

import { messaging } from "./firebase.js";
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

// Place your public VAPID Key here (generated in Firebase Console > Project Settings > Cloud Messaging > Web configuration)
const VAPID_KEY = "YOUR_PUBLIC_VAPID_KEY";

export class MessagingService {
  /**
   * Request user permission for notifications and return the token if approved.
   * @param {ServiceWorkerRegistration} swRegistration Active service worker registration
   */
  static async requestPermissionAndGetToken(swRegistration) {
    if (!messaging) {
      console.warn("FCM Messaging is not supported or initialized in this browser.");
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const token = await getToken(messaging, {
          vapidKey: window.VAPID_KEY_OVERRIDE || VAPID_KEY,
          serviceWorkerRegistration: swRegistration
        });
        
        if (token) {
          console.log("FCM Token retrieved successfully:", token);
          return token;
        } else {
          console.warn("No registration token available. Request permission to generate one.");
          return null;
        }
      } else {
        console.warn("Notification permission was denied by user.");
        return null;
      }
    } catch (error) {
      console.error("An error occurred while retrieving the FCM token:", error);
      return null;
    }
  }

  /**
   * Listen for incoming messages while the app is in the foreground.
   * @param {Function} callback Function to call when a message is received
   */
  static onForegroundMessage(callback) {
    if (!messaging) return;
    
    return onMessage(messaging, (payload) => {
      console.log("Foreground notification message received: ", payload);
      if (callback) {
        callback(payload);
      }
    });
  }
}
