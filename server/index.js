/**
 * My Daily Habit Tracker - Backend Server & Push Scheduler
 * Uses Firebase Admin SDK to check schedules, repeat rules, timezone, completion logs, and send FCM.
 */

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

if (fs.existsSync(serviceAccountPath)) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
  console.log("Firebase Admin SDK initialized using serviceAccountKey.json");
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK initialized using Environment Variable");
  } catch (e) {
    console.error("Failed to parse Firebase Service Account env variable:", e);
  }
} else {
  console.warn("WARNING: Firebase Admin credentials not found. Set FIREBASE_SERVICE_ACCOUNT or provide serviceAccountKey.json");
  // Try initializing with default credentials
  try {
    admin.initializeApp();
    console.log("Firebase Admin SDK initialized with Application Default Credentials");
  } catch (e) {
    console.error("Firebase Admin initialization failed:", e.message);
  }
}

const db = admin.firestore ? admin.firestore() : null;

/**
 * Format Date to YYYY-MM-DD
 */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Convert e.g., "08:30 AM" or "20:30" to total minutes in day
 */
function getMinutesFromTimeString(timeStr) {
  if (!timeStr) return null;
  // Handle AM/PM
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const min = parseInt(match[2], 10);
    const ampm = match[3];
    if (ampm) {
      const isPM = ampm.toUpperCase() === "PM";
      const isAM = ampm.toUpperCase() === "AM";
      if (isPM && hour < 12) hour += 12;
      if (isAM && hour === 12) hour = 0;
    }
    return hour * 60 + min;
  }
  
  // Handle 24h fallback "HH:MM"
  const parts = timeStr.split(":");
  if (parts.length >= 2) {
    const hour = parseInt(parts[0], 10);
    const min = parseInt(parts[1], 10);
    if (!isNaN(hour) && !isNaN(min)) {
      return hour * 60 + min;
    }
  }
  return null;
}

/**
 * Scheduler check run (Runs once every minute)
 */
async function checkAndSendNotifications() {
  if (!db) {
    console.error("Firestore database connection is unavailable. Skipping schedule check.");
    return;
  }

  console.log("Checking active schedules...");

  try {
    const usersSnapshot = await db.collection("users").get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const token = userData.token;
      const timezone = userData.timezone || "UTC";

      if (!token) continue;

      // 1. Get current date/time adjusted to user timezone
      let localTimeStr;
      try {
        localTimeStr = new Date().toLocaleString("en-US", { timeZone: timezone });
      } catch (err) {
        console.error(`Invalid timezone "${timezone}" for user ${userDoc.id}, fallback to UTC.`);
        localTimeStr = new Date().toLocaleString("en-US", { timeZone: "UTC" });
      }
      
      const localDate = new Date(localTimeStr);
      const todayStr = formatDate(localDate);
      const currentMinutes = localDate.getHours() * 60 + localDate.getMinutes();
      const dayOfWeek = localDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      // 2. Fetch user's habits
      const habitsSnapshot = await db.collection("users").doc(userDoc.id).collection("habits").get();
      
      for (const habitDoc of habitsSnapshot.docs) {
        const habit = habitDoc.data();
        
        // 3. Parse habit scheduled time
        const scheduledTime = habit.time ? habit.time.split('–')[0].trim() : "";
        const scheduledMinutes = getMinutesFromTimeString(scheduledTime);
        if (scheduledMinutes === null) continue;

        // 4. Verify Time Match or Snoozed Match
        let isTimeTrigger = currentMinutes === scheduledMinutes;
        
        if (habit.snoozedUntil) {
          const snoozeDate = new Date(habit.snoozedUntil);
          const snoozeLocalStr = snoozeDate.toLocaleString("en-US", { timeZone: timezone });
          const snoozeLocalDate = new Date(snoozeLocalStr);
          const snoozeMinutes = snoozeLocalDate.getHours() * 60 + snoozeLocalDate.getMinutes();
          
          if (formatDate(snoozeLocalDate) === todayStr && currentMinutes === snoozeMinutes) {
            isTimeTrigger = true;
            // Clear snooze state since it's firing now
            await db.collection("users").doc(userDoc.id).collection("habits").doc(habit.id).update({
              snoozedUntil: admin.firestore.FieldValue.delete()
            });
          }
        }

        if (!isTimeTrigger) continue;

        // 5. Verify Habit Repeat Rules
        const repeat = (habit.repeat || "daily").toLowerCase();
        let matchesDay = false;

        if (repeat === "daily") {
          matchesDay = true;
        } else if (repeat === "weekdays") {
          matchesDay = dayOfWeek >= 1 && dayOfWeek <= 5;
        } else if (repeat === "weekends") {
          matchesDay = dayOfWeek === 0 || dayOfWeek === 6;
        } else if (repeat === "custom" || habit.days) {
          // days array contains Javascript week indices (e.g. 0 for Sunday)
          const targetDays = Array.isArray(habit.days) ? habit.days.map(Number) : [];
          matchesDay = targetDays.includes(dayOfWeek);
        }

        if (!matchesDay) continue;

        // 6. Verify Completed Status for Today
        const completionDoc = await db.collection("users").doc(userDoc.id).collection("completions").doc(`${todayStr}_${habit.id}`).get();
        if (completionDoc.exists) {
          console.log(`Habit ${habit.name} already completed today. Skipping push.`);
          continue;
        }

        // 7. Dispatch Data-only FCM message to wake service worker
        const message = {
          token: token,
          data: {
            habitId: habit.id,
            habitName: habit.name,
            category: habit.category || "others",
            time: scheduledTime
          },
          android: {
            priority: "high"
          },
          apns: {
            payload: {
              aps: {
                contentAvailable: true
              }
            }
          }
        };

        try {
          const response = await admin.messaging().send(message);
          console.log(`Successfully sent FCM notification for habit "${habit.name}" to user ${userDoc.id}. Response:`, response);
        } catch (fcmError) {
          console.error(`FCM sending failed for user ${userDoc.id}:`, fcmError.message);
          // If token is invalid/not registered, clean up/delete user token
          if (fcmError.code === "messaging/registration-token-not-registered") {
            console.log(`Removing expired token for user ${userDoc.id}`);
            await db.collection("users").doc(userDoc.id).update({ token: admin.firestore.FieldValue.delete() });
          }
        }
      }
    }
  } catch (error) {
    console.error("Scheduler error:", error);
  }
}

// CRON setup: Check every minute
cron.schedule("* * * * *", () => {
  checkAndSendNotifications();
});

// Basic HTTP health routes
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Run server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Habit Tracker backend listening on port ${PORT}`);
});
