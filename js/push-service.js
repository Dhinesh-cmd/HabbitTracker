/**
 * Push Service
 * Synchronizes local user data, FCM token, timezone, habits, and completion logs to Firestore.
 */

import { auth, db, signInAnonymously } from "./firebase.js";
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  writeBatch 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export class PushService {
  static currentUser = null;

  /**
   * Initialize authentication and sign in anonymously.
   */
  static async ensureAuthenticated() {
    if (!auth || !db) return null;
    if (this.currentUser) return this.currentUser;

    try {
      const userCredential = await signInAnonymously(auth);
      this.currentUser = userCredential.user;
      console.log("Anonymous authentication successful. User ID:", this.currentUser.uid);
      return this.currentUser;
    } catch (error) {
      console.error("Firebase Anonymous Authentication failed:", error);
      return null;
    }
  }

  /**
   * Sync user registration, current token, and timezone.
   * @param {string} token FCM Token
   */
  static async syncUserToken(token) {
    const user = await this.ensureAuthenticated();
    if (!user) return;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        token: token,
        timezone: timezone,
        lastActive: new Date().toISOString()
      }, { merge: true });
      
      console.log("User token and timezone synchronized to Firestore.");
    } catch (error) {
      console.error("Failed to sync user token to Firestore:", error);
    }
  }

  /**
   * Clear user token from Firestore to stop receiving push notifications.
   */
  static async clearUserToken() {
    const user = await this.ensureAuthenticated();
    if (!user) return;

    try {
      await setDoc(doc(db, "users", user.uid), {
        token: null,
        lastActive: new Date().toISOString()
      }, { merge: true });
      console.log("User token cleared from Firestore.");
    } catch (error) {
      console.error("Failed to clear user token in Firestore:", error);
    }
  }

  /**
   * Sync a single habit to Firestore.
   * @param {Object} habit The habit object to sync
   */
  static async syncHabit(habit) {
    const user = await this.ensureAuthenticated();
    if (!user) return;

    try {
      const habitRef = doc(db, "users", user.uid, "habits", habit.id);
      await setDoc(habitRef, {
        id: habit.id,
        name: habit.name,
        time: habit.time, // Format: e.g. "08:00 AM" or "08:00"
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        repeat: habit.repeat || "daily", // daily, weekdays, weekends, custom, etc.
        days: habit.days || [], // Specific weekdays: [1, 3, 5]
        category: habit.category || "diet",
        description: habit.description || "",
        items: habit.items || [],
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log(`Habit ${habit.id} synced successfully.`);
    } catch (error) {
      console.error(`Failed to sync habit ${habit.id} to Firestore:`, error);
    }
  }

  /**
   * Delete a habit from Firestore.
   * @param {string} habitId The ID of the habit to delete
   */
  static async deleteHabit(habitId) {
    const user = await this.ensureAuthenticated();
    if (!user) return;

    try {
      const habitRef = doc(db, "users", user.uid, "habits", habitId);
      await deleteDoc(habitRef);
      console.log(`Habit ${habitId} deleted from Firestore.`);
    } catch (error) {
      console.error(`Failed to delete habit ${habitId} from Firestore:`, error);
    }
  }

  /**
   * Sync all local habits in bulk (useful on initial load or connection sync).
   * @param {Array<Object>} habits Array of habit objects
   */
  static async syncAllHabits(habits) {
    const user = await this.ensureAuthenticated();
    if (!user) return;

    try {
      const batch = writeBatch(db);
      habits.forEach(habit => {
        const habitRef = doc(db, "users", user.uid, "habits", habit.id);
        batch.set(habitRef, {
          id: habit.id,
          name: habit.name,
          time: habit.time,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          repeat: habit.repeat || "daily",
          days: habit.days || [],
          category: habit.category || "diet",
          description: habit.description || "",
          items: habit.items || [],
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });

      await batch.commit();
      console.log("All habits successfully synced in bulk.");
    } catch (error) {
      console.error("Bulk habit sync failed:", error);
    }
  }

  /**
   * Sync habit completion status for a specific date.
   * @param {string} dateStr Format YYYY-MM-DD
   * @param {string} habitId ID of the habit
   * @param {boolean} completed Status of completion
   * @param {string} timeStr Time of completion (optional)
   */
  static async syncCompletionStatus(dateStr, habitId, completed, timeStr = null) {
    const user = await this.ensureAuthenticated();
    if (!user) return;

    try {
      const logRef = doc(db, "users", user.uid, "completions", `${dateStr}_${habitId}`);
      if (completed) {
        await setDoc(logRef, {
          date: dateStr,
          habitId: habitId,
          completed: true,
          completedAt: timeStr || new Date().toISOString()
        });
      } else {
        await deleteDoc(logRef);
      }
      console.log(`Completion status for ${habitId} on ${dateStr} synced.`);
    } catch (error) {
      console.error("Failed to sync completion status:", error);
    }
  }
}
