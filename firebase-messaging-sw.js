/**
 * My Daily Habit Tracker - Firebase Messaging Service Worker
 * Handles background push notifications, action clicks, snoozing, and notification grouping.
 */

// Import Firebase libraries in Service Worker context using Compat versions for maximum stability
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

// Firebase Configuration Placeholder - MUST match client js/firebase.js configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_MENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const messaging = firebase.messaging();

/**
 * Handle Background Message
 */
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message received: ", payload);

  const { data } = payload;
  if (!data) return;

  // We handle notifications manually here to ensure category grouping and action buttons
  return handlePushMessage(data);
});

/**
 * Group notifications and construct the final push alert
 */
async function handlePushMessage(data) {
  // 1. Handle Test Notification Immediately
  if (data.isTest === "true") {
    const options = {
      body: "This is a test notification.\nYour push notifications are working correctly.",
      icon: "assets/icons/icon-192.png",
      badge: "assets/icons/icon-192.png",
      tag: "test_notification",
      vibrate: [100, 50, 100],
      requireInteraction: true
    };
    return self.registration.showNotification("Habit Tracker", options);
  }

  // Check existing notifications to group them if they trigger at the same time
  const activeNotifications = await self.registration.getNotifications();
  
  const newHabit = {
    id: data.habitId,
    name: data.habitName || "Habit Reminder",
    category: data.category || "diet",
    time: data.time || ""
  };

  // Find notifications belonging to the tracker reminders
  const habitNotifications = activeNotifications.filter(n => 
    n.tag && n.tag.startsWith("habit_reminder")
  );

  let habitsList = [newHabit];
  let category = newHabit.category;

  // If there are existing notifications, aggregate and group
  if (habitNotifications.length > 0) {
    for (const notification of habitNotifications) {
      if (notification.data && notification.data.habits) {
        habitsList = habitsList.concat(notification.data.habits);
      }
      notification.close();
    }
  }

  // Deduplicate habits by ID
  const uniqueHabits = [];
  const map = new Map();
  for (const item of habitsList) {
    if(!map.has(item.id)){
        map.set(item.id, true);
        uniqueHabits.push(item);
    }
  }

  let title = "";
  let body = "";
  let actions = [];

  const categoryLabels = {
    diet: { name: "Diet", icon: "🥗" },
    skincare: { name: "Skin Care", icon: "🧴" },
    haircare: { name: "Hair Care", icon: "💇" },
    routine: { name: "Routine", icon: "📅" },
    others: { name: "Others", icon: "📦" }
  };
  const categoryMeta = categoryLabels[category.toLowerCase()] || { name: "Habit", icon: "✨" };

  if (uniqueHabits.length === 1) {
    const habit = uniqueHabits[0];
    title = `${categoryMeta.icon} ${habit.name} Reminder`;
    
    // Parse items to display checklist bullets
    let items = [];
    if (data.items) {
      try {
        items = JSON.parse(data.items);
      } catch (err) {}
    }
    
    let itemsText = "";
    if (Array.isArray(items) && items.length > 0) {
      itemsText = "\n" + items.map(item => `• ${item.name || item}`).join("\n");
    }

    body = `${habit.time}${itemsText}`;
    
    actions = [
      { action: "complete", title: "✅ Mark Done" },
      { action: "snooze", title: "⏰ Snooze 10m" },
      { action: "dismiss", title: "❌ Dismiss" }
    ];
  } else {
    // Multi-notification collapsing/grouping
    title = `🌅 ${categoryMeta.name} Routine`;
    body = uniqueHabits.map(h => `• ${h.name} (${h.time})`).join("\n") + `\n\n${uniqueHabits.length} Tasks Pending`;
    
    actions = [
      { action: "complete_all", title: "✅ Mark All Completed" },
      { action: "dismiss", title: "❌ Dismiss" }
    ];
  }

  const options = {
    body: body,
    icon: "assets/icons/icon-192.png",
    badge: "assets/icons/icon-192.png",
    tag: `habit_reminder_${category}`,
    renotify: true,
    data: {
      habits: uniqueHabits,
      category: category
    },
    actions: actions,
    vibrate: [200, 100, 200],
    requireInteraction: true
  };

  return self.registration.showNotification(title, options);
}

/**
 * Handle Notification Action clicks
 */
self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const action = event.action;

  notification.close();

  const promiseChain = Promise.all([
    handleNotificationAction(notification, action),
    (!action) ? self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("./index.html");
      }
    }) : Promise.resolve()
  ]);

  event.waitUntil(promiseChain);
});

/**
 * Process notification action buttons
 */
async function handleNotificationAction(notification, action) {
  if (action === "dismiss") {
    console.log("[SW] Notification dismissed.");
    return;
  }

  const notificationData = notification.data;
  if (!notificationData || !notificationData.habits) return;

  const habits = notificationData.habits;

  // 1. Ensure user is authenticated anonymously to execute Firestore commands
  let user = auth.currentUser;
  if (!user) {
    try {
      const userCred = await auth.signInAnonymously();
      user = userCred.user;
    } catch (e) {
      console.error("[SW] Auth failed inside service worker:", e);
      return;
    }
  }

  const todayStr = getTodayDateString();

  if (action === "complete" || action === "complete_all") {
    // Mark habit(s) completed
    const batch = db.batch();
    
    for (const habit of habits) {
      const logRef = db.collection("users").doc(user.uid).collection("completions").doc(`${todayStr}_${habit.id}`);
      batch.set(logRef, {
        date: todayStr,
        habitId: habit.id,
        completed: true,
        completedAt: new Date().toISOString()
      });
    }
    
    await batch.commit();
    console.log("[SW] Habits completion logged to Firestore.");

    // Communicate to all open PWA clients to update client UI and local storage
    await broadcastToClients({
      type: "HABITS_COMPLETED",
      habits: habits,
      date: todayStr
    });

  } else if (action === "snooze") {
    // Snooze single habit for 10 minutes by modifying Next Reminder Time / communicating with the scheduler
    const habit = habits[0];
    const snoozeTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    const docRef = db.collection("users").doc(user.uid).collection("habits").doc(habit.id);
    await docRef.set({
      snoozedUntil: snoozeTime,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`[SW] Habit ${habit.name} snoozed until ${snoozeTime}`);

    // Show a follow-up local notification confirming the snooze
    await self.registration.showNotification("⏰ Habit Snoozed", {
      body: `We will remind you about ${habit.name} in 10 minutes.`,
      icon: "assets/icons/icon-192.png",
      tag: "snooze_confirm",
      duration: 3000
    });

    // Notify client UI
    await broadcastToClients({
      type: "HABIT_SNOOZED",
      habitId: habit.id,
      snoozedUntilMs: Date.now() + 10 * 60 * 1000
    });
  }
}

/**
 * Utility helper to broadcast messages to all running client PWA windows
 */
async function broadcastToClients(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage(message);
  }
}

/**
 * Date formatting helper (YYYY-MM-DD)
 */
function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// --- PWA Offline Cache Features ---
const CACHE_NAME = "habit-tracker-v2";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./history.html",
  "./stats.html",
  "./settings.html",
  "./login.html",
  "./css/style.css",
  "./css/history.css",
  "./css/stats.css",
  "./css/settings.css",
  "./js/storage.js",
  "./js/utils.js",
  "./js/app.js",
  "./js/history.js",
  "./js/stats.js",
  "./js/settings.js",
  "./js/firebase.js",
  "./js/push-service.js",
  "./js/messaging.js",
  "./js/notification-manager.js",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  console.log("[SW] Installed");
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching files for offline accessibility.");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  console.log("[SW] Activated");
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Clearing old cache: ", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          console.warn("[Service Worker] Fetch failed offline. Resource unavailable: ", e.request.url);
        });
      })
  );
});
