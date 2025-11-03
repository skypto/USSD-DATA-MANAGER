import type { ServiceMap, TelcoKey, Role, Session } from './types';

export const TELCOS: TelcoKey[] = ['mtn', 'telecel', 'airteltigo', 'glo'];
export const STORAGE_KEY = 'ussd_manager_services';
export const VERSIONS_KEY = 'ussd_manager_versions';
export const AUTH_KEY = 'ussd_manager_session';
export const CHANGE_REQUESTS_KEY = 'ussd_manager_change_requests';

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  mtn: 'MTN Rep',
  telecel: 'Telecel Rep',
  airteltigo: 'AirtelTigo Rep',
  glo: 'Glo Rep',
};

export function nowISO() {
  return new Date().toISOString();
}

export function tsLabel(d = new Date()) {
  const pad = (n: number) => String(n).toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth()+1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

export function download(filename: string, data: string) {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toOriginalSchema(map: ServiceMap) {
  const out: any = {};
  Object.values(map).forEach(s => {
    if (!s.active) return;
    out[s.service_id] = {
      service_name: s.service_name,
      // Note: description is intentionally excluded from export
      mtn: s.telcos.mtn,
      telecel: s.telcos.telecel,
      airteltigo: s.telcos.airteltigo,
      glo: s.telcos.glo,
    };
  });
  return out;
}

export function toTelcoSubset(map: ServiceMap, telco: TelcoKey) {
  const out: any = {};
  Object.values(map).forEach(s => {
    if (!s.active) return;
    const t = s.telcos[telco];
    out[s.service_id] = { code: t.code, explanation: t.explanation };
  });
  return out;
}

export function normalizeImported(jsonData: any): ServiceMap {
  if (typeof jsonData !== 'object' || Array.isArray(jsonData)) {
    throw new Error('Invalid JSON root. Expected an object.');
  }
  const result: ServiceMap = {};
  for (const [service_id, obj] of Object.entries<any>(jsonData)) {
    if (!obj || typeof obj !== 'object') continue;
    const service_name = String(obj.service_name ?? service_id);
    const description = obj.description ? String(obj.description) : undefined;
    const telcos: any = {};
    for (const key of ['mtn', 'telecel', 'airteltigo', 'glo']) {
      const t = obj[key] || {};
      telcos[key] = {
        code: String(t.code ?? ''),
        explanation: String(t.explanation ?? ''),
      };
    }
    result[service_id] = {
      service_id,
      service_name,
      description,
      telcos,
      active: true,
      lastUpdated: new Date().toISOString(),
    };
  }
  return result;
}

export function applyTelcoSubset(map: ServiceMap, telco: TelcoKey, subset: any): ServiceMap {
  const next: ServiceMap = JSON.parse(JSON.stringify(map));
  for (const [service_id, patch] of Object.entries<any>(subset)) {
    if (!next[service_id]) continue; // skip unknown services
    const t = next[service_id].telcos[telco];
    t.code = String(patch.code ?? t.code);
    t.explanation = String(patch.explanation ?? t.explanation);
    next[service_id].lastUpdated = nowISO();
  }
  return next;
}

export function loadSession(): Session | null {
  const s = localStorage.getItem(AUTH_KEY);
  if (!s) return null;
  try { return JSON.parse(s) } catch { return null }
}

export function saveSession(sess: Session | null) {
  if (!sess) localStorage.removeItem(AUTH_KEY);
  else localStorage.setItem(AUTH_KEY, JSON.stringify(sess));
}

export function generateChangeRequestId(): string {
  return `cr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function loadChangeRequests(): import('./types').ChangeRequestMap {
  const saved = localStorage.getItem(CHANGE_REQUESTS_KEY);
  if (!saved) return {};
  try { return JSON.parse(saved); } catch { return {}; }
}

export function saveChangeRequests(requests: import('./types').ChangeRequestMap) {
  localStorage.setItem(CHANGE_REQUESTS_KEY, JSON.stringify(requests));
}
