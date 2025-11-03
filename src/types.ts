export type TelcoKey = 'mtn' | 'telecel' | 'airteltigo' | 'glo';
export type Role = 'admin' | 'mtn' | 'telecel' | 'airteltigo' | 'glo';

export interface TelcoInfo {
  code: string;
  explanation: string;
}

export interface ServiceEntry {
  service_id: string;
  service_name: string;
  description?: string; // Admin guidance for telco reps (not exported)
  telcos: Record<TelcoKey, TelcoInfo>;
  active: boolean;
  lastUpdated: string; // ISO timestamp
}

export type ServiceMap = Record<string, ServiceEntry>;

export interface VersionRecord {
  timestamp: string; // ISO
  label: string;     // e.g., 2025-11-01 09:30
  snapshot: ServiceMap;
}

export interface Session {
  role: Role;
  displayName: string;
}

export interface ChangeRequest {
  id: string;
  serviceId: string;
  field: string; // 'telcos.mtn.code' | 'telcos.mtn.explanation' etc.
  oldValue: string;
  newValue: string;
  requestedBy: string;
  requestedAt: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  comments?: string;
}

export type ChangeRequestMap = Record<string, ChangeRequest>;
