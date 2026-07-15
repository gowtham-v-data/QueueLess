import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  Timestamp,
  type Unsubscribe,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { notificationService } from './notification.service';

/* ─────────────── TYPES ─────────────── */
export type QueueStatus = 'WAITING' | 'CALLED' | 'SKIPPED' | 'COMPLETED' | 'CANCELLED';
export type QueuePriority = 'NORMAL' | 'SENIOR_CITIZEN' | 'VIP' | 'EMERGENCY';

export interface QueueEntry {
  id: string;
  organizationId: string;
  organizationName: string;
  branchId: string;
  branchName: string;
  serviceId: string;
  serviceName: string;
  tokenPrefix: string;
  customerId: string;
  customerName: string;
  tokenCode: string;
  tokenNumber: number;
  priority: QueuePriority;
  status: QueueStatus;
  positionInQueue?: number;
  estimatedWaitMins?: number;
  notes?: string;
  counterId?: string;
  counterName?: string;
  calledAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/* ─────────────── HELPERS ─────────────── */
function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date();
}

function mapQueue(id: string, d: Record<string, unknown>): QueueEntry {
  return {
    id,
    organizationId:   String(d.organizationId ?? ''),
    organizationName: String(d.organizationName ?? ''),
    branchId:         String(d.branchId ?? ''),
    branchName:       String(d.branchName ?? ''),
    serviceId:        String(d.serviceId ?? ''),
    serviceName:      String(d.serviceName ?? ''),
    tokenPrefix:      String(d.tokenPrefix ?? 'A'),
    customerId:       String(d.customerId ?? ''),
    customerName:     String(d.customerName ?? ''),
    tokenCode:        String(d.tokenCode ?? ''),
    tokenNumber:      Number(d.tokenNumber ?? 0),
    priority:         (d.priority as QueuePriority) ?? 'NORMAL',
    status:           (d.status as QueueStatus) ?? 'WAITING',
    positionInQueue:  d.positionInQueue as number | undefined,
    estimatedWaitMins: d.estimatedWaitMins as number | undefined,
    notes:            d.notes as string | undefined,
    counterId:        d.counterId as string | undefined,
    counterName:      d.counterName as string | undefined,
    calledAt:         d.calledAt ? toDate(d.calledAt) : undefined,
    completedAt:      d.completedAt ? toDate(d.completedAt) : undefined,
    cancelledAt:      d.cancelledAt ? toDate(d.cancelledAt) : undefined,
    createdAt:        toDate(d.createdAt),
    updatedAt:        toDate(d.updatedAt)
  };
}

function assertDb() {
  if (!db) throw new Error('Firestore is not initialized.');
  return db;
}

/* ─────────────── QUEUE SERVICE ─────────────── */
export const queueService = {
  /**
   * Customer joins a service queue.
   * Atomically increments service sequence and writes a queue doc.
   */
  async joinQueue(params: {
    organizationId: string;
    organizationName: string;
    branchId: string;
    branchName: string;
    serviceId: string;
    serviceName: string;
    tokenPrefix: string;
    customerId: string;
    customerName: string;
    priority?: QueuePriority;
    notes?: string;
    averageDurationMins?: number;
  }): Promise<QueueEntry> {
    const fs = assertDb();

    const serviceRef = doc(fs, 'services', params.serviceId);
    let tokenNumber = 1;
    let queueId = '';
    let estimatedWaitMins = 0;
    let ahead = 0;
    let tokenCode = '';

    // Estimate wait based on queues ahead (query runs outside transaction)
    const queueRef = await getDocs(
      query(
        collection(fs, 'queues'),
        where('serviceId', '==', params.serviceId),
        where('status', '==', 'WAITING')
      )
    );
    ahead = queueRef.size;

    await runTransaction(fs, async (tx) => {
      const serviceSnap = await tx.get(serviceRef);
      if (!serviceSnap.exists()) throw new Error('Service not found.');

      const current = Number(serviceSnap.data().currentSequence ?? 0);
      tokenNumber = current + 1;

      const avgDur = Number(serviceSnap.data().averageDurationMins ?? params.averageDurationMins ?? 10);
      estimatedWaitMins = ahead * avgDur;

      tokenCode = `${params.tokenPrefix}-${String(tokenNumber).padStart(3, '0')}`;

      const newQueueRef = doc(collection(fs, 'queues'));
      queueId = newQueueRef.id;

      tx.update(serviceRef, {
        currentSequence: tokenNumber,
        updatedAt: serverTimestamp()
      });

      tx.set(newQueueRef, {
        organizationId:   params.organizationId,
        organizationName: params.organizationName,
        branchId:         params.branchId,
        branchName:       params.branchName,
        serviceId:        params.serviceId,
        serviceName:      params.serviceName,
        tokenPrefix:      params.tokenPrefix,
        customerId:       params.customerId,
        customerName:     params.customerName,
        tokenCode,
        tokenNumber,
        priority:         params.priority ?? 'NORMAL',
        status:           'WAITING',
        estimatedWaitMins,
        positionInQueue:  ahead + 1,
        notes:            params.notes ?? null,
        createdAt:        serverTimestamp(),
        updatedAt:        serverTimestamp()
      });
    });

    return {
      id: queueId,
      organizationId:   params.organizationId,
      organizationName: params.organizationName,
      branchId:         params.branchId,
      branchName:       params.branchName,
      serviceId:        params.serviceId,
      serviceName:      params.serviceName,
      tokenPrefix:      params.tokenPrefix,
      customerId:       params.customerId,
      customerName:     params.customerName,
      tokenCode,
      tokenNumber,
      priority:         params.priority ?? 'NORMAL',
      status:           'WAITING',
      estimatedWaitMins,
      positionInQueue:  ahead + 1,
      notes:            params.notes ?? undefined,
      createdAt:        new Date(),
      updatedAt:        new Date()
    };
  },

  /** Get all active queues for a customer */
  async getCustomerActiveQueues(customerId: string): Promise<QueueEntry[]> {
    const fs = assertDb();
    const q = query(
      collection(fs, 'queues'),
      where('customerId', '==', customerId),
      where('status', 'in', ['WAITING', 'CALLED'])
    );
    const snap = await getDocs(q);
    const entries = snap.docs.map(d => mapQueue(d.id, d.data() as Record<string, unknown>));
    return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  /** Real-time subscription to active queues for a customer */
  subscribeCustomerActiveQueues(customerId: string, callback: (entries: QueueEntry[]) => void): Unsubscribe {
    const fs = assertDb();
    const q = query(
      collection(fs, 'queues'),
      where('customerId', '==', customerId),
      where('status', 'in', ['WAITING', 'CALLED'])
    );
    return onSnapshot(q, snap => {
      const entries = snap.docs.map(d => mapQueue(d.id, d.data() as Record<string, unknown>));
      callback(entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    }, err => {
      console.error('subscribeCustomerActiveQueues error:', err);
      callback([]);
    });
  },

  /** Get queue history for a customer */
  async getCustomerQueueHistory(customerId: string, limitCount = 20): Promise<QueueEntry[]> {
    const fs = assertDb();
    const q = query(
      collection(fs, 'queues'),
      where('customerId', '==', customerId),
      where('status', 'in', ['COMPLETED', 'CANCELLED', 'SKIPPED'])
    );
    const snap = await getDocs(q);
    const entries = snap.docs.map(d => mapQueue(d.id, d.data() as Record<string, unknown>));
    return entries
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limitCount);
  },

  /** Get a specific queue entry */
  async getById(queueId: string): Promise<QueueEntry | null> {
    const fs = assertDb();
    const snap = await getDoc(doc(fs, 'queues', queueId));
    if (!snap.exists()) return null;
    return mapQueue(snap.id, snap.data() as Record<string, unknown>);
  },

  /** Real-time subscription to a single queue entry */
  subscribeToQueue(queueId: string, callback: (entry: QueueEntry | null) => void): Unsubscribe {
    const fs = assertDb();
    return onSnapshot(doc(fs, 'queues', queueId), snap => {
      if (!snap.exists()) { callback(null); return; }
      callback(mapQueue(snap.id, snap.data() as Record<string, unknown>));
    });
  },

  /** Customer cancels their queue */
  async cancelQueue(queueId: string): Promise<void> {
    const fs = assertDb();
    const snap = await getDoc(doc(fs, 'queues', queueId));
    if (!snap.exists()) return;
    const qData = snap.data();

    await updateDoc(doc(fs, 'queues', queueId), {
      status: 'CANCELLED',
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await notificationService.createNotification(
      qData.customerId,
      '❌ Token Cancelled',
      `Your token ${qData.tokenCode} for ${qData.serviceName} has been cancelled successfully.`,
      queueId,
      qData.organizationId
    );
  },

  /** Staff: get all waiting queues for a service */
  async getWaitingByService(serviceId: string): Promise<QueueEntry[]> {
    const fs = assertDb();
    const q = query(
      collection(fs, 'queues'),
      where('serviceId', '==', serviceId),
      where('status', 'in', ['WAITING', 'CALLED'])
    );
    const snap = await getDocs(q);
    const entries = snap.docs.map(d => mapQueue(d.id, d.data() as Record<string, unknown>));
    const priorityWeight = { EMERGENCY: 0, VIP: 1, SENIOR_CITIZEN: 2, NORMAL: 3 };
    return entries.sort((a, b) => {
      const wa = priorityWeight[a.priority] ?? 3;
      const wb = priorityWeight[b.priority] ?? 3;
      if (wa !== wb) return wa - wb;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  },

  /** Staff: get all waiting queues for a branch */
  async getWaitingByBranch(branchId: string): Promise<QueueEntry[]> {
    const fs = assertDb();
    const q = query(
      collection(fs, 'queues'),
      where('branchId', '==', branchId),
      where('status', 'in', ['WAITING', 'CALLED'])
    );
    const snap = await getDocs(q);
    const entries = snap.docs.map(d => mapQueue(d.id, d.data() as Record<string, unknown>));
    return entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },

  /** Staff: live stream of queues for a branch */
  subscribeToServiceQueue(serviceId: string, callback: (entries: QueueEntry[]) => void): Unsubscribe {
    const fs = assertDb();
    const q = query(
      collection(fs, 'queues'),
      where('serviceId', '==', serviceId),
      where('status', 'in', ['WAITING', 'CALLED'])
    );
    return onSnapshot(q, snap => {
      const entries = snap.docs.map(d => mapQueue(d.id, d.data() as Record<string, unknown>));
      callback(entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
    }, err => {
      console.error('subscribeToServiceQueue error:', err);
      callback([]);
    });
  },

  /** Staff: call next customer */
  async callQueue(queueId: string, counterId?: string, counterName?: string): Promise<void> {
    const fs = assertDb();
    const snap = await getDoc(doc(fs, 'queues', queueId));
    if (!snap.exists()) return;
    const qData = snap.data();

    await updateDoc(doc(fs, 'queues', queueId), {
      status: 'CALLED',
      calledAt: serverTimestamp(),
      counterId: counterId || null,
      counterName: counterName || null,
      updatedAt: serverTimestamp()
    });

    const cName = counterName || 'Counter';
    await notificationService.createNotification(
      qData.customerId,
      '📢 It\'s Your Turn!',
      `Token ${qData.tokenCode} called! Please proceed to ${cName} for ${qData.serviceName}.`,
      queueId,
      qData.organizationId
    );
  },

  /** Staff: live stream of all active queues (waiting/called) for a branch */
  subscribeToBranchQueue(branchId: string, callback: (entries: QueueEntry[]) => void): Unsubscribe {
    const fs = assertDb();
    const q = query(
      collection(fs, 'queues'),
      where('branchId', '==', branchId),
      where('status', 'in', ['WAITING', 'CALLED'])
    );
    return onSnapshot(q, snap => {
      const entries = snap.docs.map(d => mapQueue(d.id, d.data() as Record<string, unknown>));
      callback(entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
    }, err => {
      console.error('subscribeToBranchQueue error:', err);
      callback([]);
    });
  },

  /** Staff: mark complete */
  async completeQueue(queueId: string): Promise<void> {
    const fs = assertDb();
    const snap = await getDoc(doc(fs, 'queues', queueId));
    if (!snap.exists()) return;
    const qData = snap.data();

    await updateDoc(doc(fs, 'queues', queueId), {
      status: 'COMPLETED',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await notificationService.createNotification(
      qData.customerId,
      '✅ Service Completed',
      `Your OPD/Service session for token ${qData.tokenCode} has been completed. Thank you!`,
      queueId,
      qData.organizationId
    );
  },

  /** Staff: skip */
  async skipQueue(queueId: string): Promise<void> {
    const fs = assertDb();
    const snap = await getDoc(doc(fs, 'queues', queueId));
    if (!snap.exists()) return;
    const qData = snap.data();

    await updateDoc(doc(fs, 'queues', queueId), {
      status: 'SKIPPED',
      updatedAt: serverTimestamp()
    });

    await notificationService.createNotification(
      qData.customerId,
      '⏭ Token Skipped',
      `Your token ${qData.tokenCode} was skipped. Please see staff at counter.`,
      queueId,
      qData.organizationId
    );
  },

  /** Admin stats: count by status for a branch today */
  async getBranchStats(branchId: string): Promise<{ waiting: number; called: number; completed: number; cancelled: number }> {
    const fs = assertDb();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const q = query(
      collection(fs, 'queues'),
      where('branchId', '==', branchId)
    );
    const snap = await getDocs(q);
    const stats = { waiting: 0, called: 0, completed: 0, cancelled: 0 };
    snap.docs.forEach(d => {
      const data = d.data();
      const createdAtDate = data.createdAt ? toDate(data.createdAt) : new Date();
      if (createdAtDate.getTime() >= todayStart.getTime()) {
        const s = data.status as string;
        if (s === 'WAITING')   stats.waiting++;
        if (s === 'CALLED')    stats.called++;
        if (s === 'COMPLETED') stats.completed++;
        if (s === 'CANCELLED') stats.cancelled++;
      }
    });
    return stats;
  }
};
