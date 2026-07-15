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
  Timestamp,
  type Unsubscribe,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';

/* ─────────────── TYPES ─────────────── */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  logoUrl?: string;
  primaryColor?: string;
  category: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  ownerId: string;
  ownerName?: string;
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  phone?: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE';
  workingHours?: Record<string, { open: string; close: string; closed: boolean }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  organizationId: string;
  branchId?: string;
  name: string;
  description?: string;
  tokenPrefix: string;
  currentSequence: number;
  averageDurationMins: number;
  isPriorityEnabled: boolean;
  queueLimit?: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

export interface Counter {
  id: string;
  organizationId: string;
  branchId: string;
  serviceId?: string;
  name: string;
  code: string;
  status: 'AVAILABLE' | 'BUSY' | 'PAUSED' | 'OFFLINE';
  assignedStaffId?: string;
  currentQueueId?: string;
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

function mapOrg(id: string, d: Record<string, unknown>): Organization {
  return {
    id,
    name:         String(d.name ?? ''),
    slug:         String(d.slug ?? ''),
    tagline:      d.tagline as string | undefined,
    logoUrl:      d.logoUrl as string | undefined,
    primaryColor: d.primaryColor as string | undefined,
    category:     String(d.category ?? 'other'),
    status:       (d.status as Organization['status']) ?? 'PENDING',
    ownerId:      String(d.ownerId ?? ''),
    ownerName:    d.ownerName as string | undefined,
    settings:     d.settings as Record<string, unknown> | undefined,
    createdAt:    toDate(d.createdAt),
    updatedAt:    toDate(d.updatedAt)
  };
}

function mapBranch(id: string, d: Record<string, unknown>): Branch {
  return {
    id,
    organizationId: String(d.organizationId ?? ''),
    name:           String(d.name ?? ''),
    address:        String(d.address ?? ''),
    city:           String(d.city ?? ''),
    state:          d.state as string | undefined,
    country:        String(d.country ?? ''),
    phone:          d.phone as string | undefined,
    email:          d.email as string | undefined,
    status:         (d.status as Branch['status']) ?? 'ACTIVE',
    workingHours:   d.workingHours as Branch['workingHours'],
    createdAt:      toDate(d.createdAt),
    updatedAt:      toDate(d.updatedAt)
  };
}

function mapService(id: string, d: Record<string, unknown>): Service {
  return {
    id,
    organizationId:    String(d.organizationId ?? ''),
    branchId:          d.branchId as string | undefined,
    name:              String(d.name ?? ''),
    description:       d.description as string | undefined,
    tokenPrefix:       String(d.tokenPrefix ?? 'A'),
    currentSequence:   Number(d.currentSequence ?? 0),
    averageDurationMins: Number(d.averageDurationMins ?? 10),
    isPriorityEnabled: Boolean(d.isPriorityEnabled ?? true),
    queueLimit:        d.queueLimit as number | undefined,
    status:            (d.status as Service['status']) ?? 'ACTIVE',
    createdAt:         toDate(d.createdAt),
    updatedAt:         toDate(d.updatedAt)
  };
}

function mapCounter(id: string, d: Record<string, unknown>): Counter {
  return {
    id,
    organizationId:  String(d.organizationId ?? ''),
    branchId:        String(d.branchId ?? ''),
    serviceId:       d.serviceId as string | undefined,
    name:            String(d.name ?? ''),
    code:            String(d.code ?? ''),
    status:          (d.status as Counter['status']) ?? 'AVAILABLE',
    assignedStaffId: d.assignedStaffId as string | undefined,
    currentQueueId:  d.currentQueueId as string | undefined,
    createdAt:       toDate(d.createdAt),
    updatedAt:       toDate(d.updatedAt)
  };
}

function assertDb() {
  if (!db) throw new Error('Firestore is not initialized.');
  return db;
}

/* ─────────────── ORGANIZATION ─────────────── */
export const organizationService = {
  async create(ownerId: string, ownerName: string, data: Omit<Organization, 'id' | 'ownerId' | 'ownerName' | 'createdAt' | 'updatedAt'>): Promise<Organization> {
    const fs = assertDb();
    const docData = {
      ...data,
      ownerId,
      ownerName,
      status: 'ACTIVE' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const ref = await addDoc(collection(fs, 'organizations'), {
      ...docData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return {
      id: ref.id,
      ...docData
    };
  },

  async getByOwner(ownerId: string): Promise<Organization[]> {
    const fs = assertDb();
    const q = query(
      collection(fs, 'organizations'),
      where('ownerId', '==', ownerId)
    );
    const snap = await getDocs(q);
    const orgs = snap.docs.map(d => mapOrg(d.id, d.data() as Record<string, unknown>));
    return orgs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getAll(limitCount = 50): Promise<Organization[]> {
    const fs = assertDb();
    const q = query(
      collection(fs, 'organizations'),
      where('status', '==', 'ACTIVE')
    );
    const snap = await getDocs(q);
    const orgs = snap.docs.map(d => mapOrg(d.id, d.data() as Record<string, unknown>));
    return orgs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limitCount);
  },

  /** Find organizations where the user is assigned as staff to any counter */
  async getByStaff(userId: string): Promise<Organization[]> {
    const fs = assertDb();
    // Find counters where this user is assigned as staff
    const counterQuery = query(
      collection(fs, 'counters'),
      where('assignedStaffId', '==', userId)
    );
    const counterSnap = await getDocs(counterQuery);
    if (counterSnap.empty) return [];

    // Collect unique organization IDs from counters
    const orgIds = [...new Set(counterSnap.docs.map(d => String(d.data().organizationId)))];

    // Fetch each organization
    const orgs: Organization[] = [];
    for (const orgId of orgIds) {
      const orgSnap = await getDoc(doc(fs, 'organizations', orgId));
      if (orgSnap.exists()) {
        orgs.push(mapOrg(orgSnap.id, orgSnap.data() as Record<string, unknown>));
      }
    }
    return orgs;
  },

  /** Find organizations where user is owner OR assigned staff — covers both roles */
  async getByOwnerOrStaff(userId: string): Promise<Organization[]> {
    const owned = await organizationService.getByOwner(userId);
    if (owned.length > 0) return owned;
    return organizationService.getByStaff(userId);
  },

  async getById(id: string): Promise<Organization | null> {
    const fs = assertDb();
    const snap = await getDoc(doc(fs, 'organizations', id));
    if (!snap.exists()) return null;
    return mapOrg(snap.id, snap.data() as Record<string, unknown>);
  },

  async update(id: string, data: Partial<Omit<Organization, 'id' | 'createdAt'>>): Promise<void> {
    const fs = assertDb();
    await updateDoc(doc(fs, 'organizations', id), { ...data, updatedAt: serverTimestamp() });
  },

  async getBySlug(slug: string): Promise<Organization | null> {
    const fs = assertDb();
    const q = query(
      collection(fs, 'organizations'),
      where('slug', '==', slug),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return d ? mapOrg(d.id, d.data() as Record<string, unknown>) : null;
  },

  /* ── Branches ── */
  async createBranch(orgId: string, data: Omit<Branch, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): Promise<Branch> {
    const fs = assertDb();
    const docData = {
      ...data,
      organizationId: orgId,
      status: 'ACTIVE' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const ref = await addDoc(collection(fs, 'branches'), {
      ...docData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return {
      id: ref.id,
      ...docData
    };
  },

  async getBranches(orgId: string): Promise<Branch[]> {
    const fs = assertDb();
    const q = query(
      collection(fs, 'branches'),
      where('organizationId', '==', orgId)
    );
    const snap = await getDocs(q);
    const branches = snap.docs.map(d => mapBranch(d.id, d.data() as Record<string, unknown>));
    return branches.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },

  async getBranchById(branchId: string): Promise<Branch | null> {
    const fs = assertDb();
    const snap = await getDoc(doc(fs, 'branches', branchId));
    if (!snap.exists()) return null;
    return mapBranch(snap.id, snap.data() as Record<string, unknown>);
  },

  async updateBranch(branchId: string, data: Partial<Omit<Branch, 'id' | 'createdAt'>>): Promise<void> {
    const fs = assertDb();
    await updateDoc(doc(fs, 'branches', branchId), { ...data, updatedAt: serverTimestamp() });
  },

  /* ── Services ── */
  async createService(orgId: string, data: Omit<Service, 'id' | 'organizationId' | 'currentSequence' | 'createdAt' | 'updatedAt'>): Promise<Service> {
    const fs = assertDb();
    const docData = {
      ...data,
      organizationId: orgId,
      currentSequence: 0,
      status: 'ACTIVE' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const ref = await addDoc(collection(fs, 'services'), {
      ...docData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return {
      id: ref.id,
      ...docData
    };
  },

  async getServices(orgId: string, branchId?: string): Promise<Service[]> {
    const fs = assertDb();
    const q = query(
      collection(fs, 'services'),
      where('organizationId', '==', orgId)
    );
    const snap = await getDocs(q);
    let services = snap.docs.map(d => mapService(d.id, d.data() as Record<string, unknown>));
    if (branchId) {
      services = services.filter(sv => !sv.branchId || sv.branchId === branchId);
    }
    return services.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },

  async updateService(serviceId: string, data: Partial<Omit<Service, 'id' | 'createdAt'>>): Promise<void> {
    const fs = assertDb();
    await updateDoc(doc(fs, 'services', serviceId), { ...data, updatedAt: serverTimestamp() });
  },

  /* ── Counters ── */
  async createCounter(orgId: string, data: Omit<Counter, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): Promise<Counter> {
    const fs = assertDb();
    const docData = {
      ...data,
      organizationId: orgId,
      status: 'AVAILABLE' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const ref = await addDoc(collection(fs, 'counters'), {
      ...docData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return {
      id: ref.id,
      ...docData
    };
  },

  async getCounters(branchId: string): Promise<Counter[]> {
    const fs = assertDb();
    const q = query(
      collection(fs, 'counters'),
      where('branchId', '==', branchId)
    );
    const snap = await getDocs(q);
    const counters = snap.docs.map(d => mapCounter(d.id, d.data() as Record<string, unknown>));
    return counters.sort((a, b) => a.code.localeCompare(b.code));
  },

  async updateCounterStatus(counterId: string, status: Counter['status']): Promise<void> {
    const fs = assertDb();
    await updateDoc(doc(fs, 'counters', counterId), { status, updatedAt: serverTimestamp() });
  },

  async assignStaffToCounter(counterId: string, staffId: string | null): Promise<void> {
    const fs = assertDb();
    await updateDoc(doc(fs, 'counters', counterId), {
      assignedStaffId: staffId || null,
      updatedAt: serverTimestamp()
    });
  },

  subscribeBranches(orgId: string, callback: (branches: Branch[]) => void): Unsubscribe {
    const fs = assertDb();
    const q = query(
      collection(fs, 'branches'),
      where('organizationId', '==', orgId)
    );
    return onSnapshot(q, snap => {
      const branches = snap.docs.map(d => mapBranch(d.id, d.data() as Record<string, unknown>));
      callback(branches.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
    }, err => {
      console.error('subscribeBranches error:', err);
      callback([]);
    });
  },

  subscribeServices(orgId: string, callback: (services: Service[]) => void): Unsubscribe {
    const fs = assertDb();
    const q = query(
      collection(fs, 'services'),
      where('organizationId', '==', orgId)
    );
    return onSnapshot(q, snap => {
      const services = snap.docs.map(d => mapService(d.id, d.data() as Record<string, unknown>));
      callback(services.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
    }, err => {
      console.error('subscribeServices error:', err);
      callback([]);
    });
  },

  subscribeCountersForOrg(orgId: string, callback: (counters: Counter[]) => void): Unsubscribe {
    const fs = assertDb();
    const q = query(
      collection(fs, 'counters'),
      where('organizationId', '==', orgId)
    );
    return onSnapshot(q, snap => {
      const counters = snap.docs.map(d => mapCounter(d.id, d.data() as Record<string, unknown>));
      callback(counters.sort((a, b) => a.code.localeCompare(b.code)));
    }, err => {
      console.error('subscribeCountersForOrg error:', err);
      callback([]);
    });
  },

  /* ── Live subscription to org queues ── */
  subscribeToOrgQueues(orgId: string, callback: (data: unknown[]) => void): Unsubscribe {
    const fs = assertDb();
    const q = query(
      collection(fs, 'queues'),
      where('organizationId', '==', orgId),
      where('status', 'in', ['WAITING', 'CALLED'])
    );
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(data.sort((a: any, b: any) => {
        const ta = a.createdAt?.seconds ?? 0;
        const tb = b.createdAt?.seconds ?? 0;
        return ta - tb;
      }));
    }, err => {
      console.error('subscribeToOrgQueues error:', err);
      callback([]);
    });
  }
};
