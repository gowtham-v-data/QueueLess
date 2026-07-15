import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface NotificationItem {
  id: string;
  userId: string;
  queueId?: string;
  orgId?: string;
  title: string;
  body: string;
  status: 'UNREAD' | 'READ';
  createdAt: Date;
}

function assertDb() {
  if (!db) throw new Error('Firestore is not initialized.');
  return db;
}

export const notificationService = {
  /** Create a notification document in Firestore */
  async createNotification(
    userId: string,
    title: string,
    body: string,
    queueId?: string,
    orgId?: string
  ): Promise<void> {
    try {
      const fs = assertDb();
      await addDoc(collection(fs, 'notifications'), {
        userId,
        title,
        body,
        queueId: queueId || null,
        orgId: orgId || null,
        status: 'UNREAD',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Failed to create notification document:', e);
    }
  },

  /** Subscribe to real-time notification updates for a user */
  subscribeUserNotifications(
    userId: string,
    callback: (notifications: NotificationItem[]) => void
  ): Unsubscribe {
    const fs = assertDb();
    const q = query(
      collection(fs, 'notifications'),
      where('userId', '==', userId)
    );
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        let date = new Date();
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          date = data.createdAt.toDate();
        } else if (data.createdAt) {
          date = new Date(data.createdAt);
        }
        return {
          id: d.id,
          userId: String(data.userId),
          queueId: data.queueId || undefined,
          orgId: data.orgId || undefined,
          title: String(data.title),
          body: String(data.body),
          status: (data.status as NotificationItem['status']) || 'UNREAD',
          createdAt: date
        } satisfies NotificationItem;
      });
      // Sort client-side (newest first) and limit to 25
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(items.slice(0, 25));
    }, err => {
      console.error('subscribeUserNotifications error:', err);
      callback([]);
    });
  },

  /** Mark a single notification as read */
  async markAsRead(notificationId: string): Promise<void> {
    const fs = assertDb();
    await updateDoc(doc(fs, 'notifications', notificationId), {
      status: 'READ'
    });
  },

  /** Request permissions for browser system notifications */
  async requestBrowserPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  },

  /** Show HTML5 Browser Notification if permitted */
  showBrowserNotification(title: string, body: string) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico'
        });
      } catch (e) {
        console.warn('Native Browser Notification failed to display:', e);
      }
    }
  }
};
