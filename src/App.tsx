import React, { useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import type { ServiceMap, ServiceEntry, TelcoKey, VersionRecord, Role, Session, ChangeRequest, ChangeRequestMap } from './types';
import { TELCOS, STORAGE_KEY, VERSIONS_KEY, ROLE_LABEL, nowISO, tsLabel, download, toOriginalSchema, toTelcoSubset, normalizeImported, applyTelcoSubset, loadSession, saveSession, generateChangeRequestId, loadChangeRequests, saveChangeRequests } from './utils';
import { ApiPanel } from './ApiPanel';

const initialServices: ServiceMap = (() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) try { return JSON.parse(saved); } catch {}
  
  // Load sample data if no saved data exists
  try {
    const sampleData = {
      "check_balance": {
        "service_name": "Check Airtime Balance",
        "description": "Enter the USSD code customers dial to check their main airtime balance. Explanation should be clear and mention it's for airtime (not data) balance.",
        "mtn": { "code": "*124#", "explanation": "Checks your main airtime balance on MTN." },
        "telecel": { "code": "*124#", "explanation": "Checks your main airtime balance on Telecel." },
        "airteltigo": { "code": "*134#", "explanation": "Checks your main airtime balance on AirtelTigo." },
        "glo": { "code": "*124#", "explanation": "Checks your main airtime balance on Glo." }
      },
      "borrow_credit": {
        "service_name": "Borrow Credit / Airtime",
        "description": "Provide the emergency credit/airtime borrowing service code. Explanation should mention repayment terms and any fees.",
        "mtn": { "code": "*155#", "explanation": "Lends you airtime to be paid back on your next recharge." },
        "telecel": { "code": "*505#", "explanation": "Telecel's 'SOS Credit' service." },
        "airteltigo": { "code": "*130#", "explanation": "AirtelTigo's 'SOS Credit' service." },
        "glo": { "code": "*305#", "explanation": "Glo's 'Borrow Me Credit' service." }
      }
    };
    return normalizeImported(sampleData);
  } catch {
    return {};
  }
})();

const initialVersions: VersionRecord[] = (() => {
  const saved = localStorage.getItem(VERSIONS_KEY);
  if (saved) try { return JSON.parse(saved); } catch {}
  return [];
})();

export default function App() {
  const [services, setServices] = useState<ServiceMap>(initialServices);
  const [versions, setVersions] = useState<VersionRecord[]>(initialVersions);
  const [filter, setFilter] = useState('');
  const [showVersions, setShowVersions] = useState(true);
  const [session, setSession] = useState<Session | null>(loadSession());
  const [descriptionModal, setDescriptionModal] = useState<{ serviceId: string; serviceName: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ serviceId: string; serviceName: string } | null>(null);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestMap>(loadChangeRequests());
  const [showPendingChanges, setShowPendingChanges] = useState(false);
  const [showApiPanel, setShowApiPanel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const fileRef = useRef<HTMLInputElement>(null);

  const role: Role | null = session?.role ?? null;

  const { list, totalPages, totalItems } = useMemo(() => {
    const arr = Object.values(services);
    
    // Sort alphabetically by service_id for stable positioning
    const sortedArr = arr.sort((a, b) => {
      return a.service_id.localeCompare(b.service_id);
    });
    
    // Apply search filter
    const filteredArr = !filter.trim() 
      ? sortedArr 
      : sortedArr.filter(s => {
          const q = filter.toLowerCase();
          return s.service_id.toLowerCase().includes(q) || 
                 s.service_name.toLowerCase().includes(q);
        });
    
    // Calculate pagination
    const totalItems = filteredArr.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedList = filteredArr.slice(startIndex, endIndex);
    
    return {
      list: paginatedList,
      totalPages,
      totalItems
    };
  }, [services, filter, currentPage, itemsPerPage]);

  // Reset to first page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  function persist(next: ServiceMap) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setServices(next);
  }

  function addService() {
    if (role !== 'admin') return; // only admin
    const baseId = 'new_service';
    let idx = 1;
    let sid = `${baseId}_${idx}`;
    while (services[sid]) { idx += 1; sid = `${baseId}_${idx}`; }
    const entry: ServiceEntry = {
      service_id: sid,
      service_name: 'New Service',
      description: 'Provide guidance here for telco reps on what codes and explanations are expected for this service.',
      telcos: {
        mtn: { code: '', explanation: '' },
        telecel: { code: '', explanation: '' },
        airteltigo: { code: '', explanation: '' },
        glo: { code: '', explanation: '' },
      },
      active: true,
      lastUpdated: nowISO(),
    };
    persist({ ...services, [sid]: entry });
  }

  function removeService(id: string) {
    if (role !== 'admin') return; // only admin
    const next = { ...services };
    delete next[id];
    persist(next);
  }

  function setField(id: string, field: keyof ServiceEntry, value: any) {
    const next = { ...services };
    const s = next[id];
    if (!s) return;
    if (role !== 'admin' && (field === 'service_id' || field === 'service_name' || field === 'active')) return;
    
    if (field === 'service_id' && value !== id) {
      // Handle service ID change - need to update the key in the map
      const existing = { ...s };
      delete next[id];
      existing.service_id = value;
      existing.lastUpdated = nowISO();
      next[value] = existing;
    } else {
      (s as any)[field] = value;
      s.lastUpdated = nowISO();
    }
    persist(next);
  }

  function setTelcoField(id: string, telco: TelcoKey, key: 'code' | 'explanation', value: string) {
    if (!(role === 'admin' || role === telco)) return;
    
    const service = services[id];
    if (!service) return;
    
    const oldValue = service.telcos[telco][key];
    
    // If admin, apply change directly
    if (role === 'admin') {
      const next = { ...services };
      const s = next[id];
      s.telcos[telco][key] = value;
      s.lastUpdated = nowISO();
      persist(next);
      return;
    }
    
    // If telco rep, create or update draft change
    if (role === telco) {
      // Check if there's already a draft for this field
      const existingDraft = Object.values(changeRequests).find(
        req => req.serviceId === id && 
               req.field === `telcos.${telco}.${key}` && 
               req.status === 'draft'
      );
      
      if (existingDraft) {
        // Update existing draft
        const updatedRequest = {
          ...existingDraft,
          newValue: value,
          requestedAt: nowISO() // Update timestamp for last edit
        };
        const nextRequests = { ...changeRequests, [existingDraft.id]: updatedRequest };
        setChangeRequests(nextRequests);
        saveChangeRequests(nextRequests);
      } else {
        // Create new draft
        const requestId = generateChangeRequestId();
        const request: ChangeRequest = {
          id: requestId,
          serviceId: id,
          field: `telcos.${telco}.${key}`,
          oldValue,
          newValue: value,
          requestedBy: session?.displayName || 'Unknown User',
          requestedAt: nowISO(),
          status: 'draft'
        };
        
        const nextRequests = { ...changeRequests, [requestId]: request };
        setChangeRequests(nextRequests);
        saveChangeRequests(nextRequests);
      }
    }
  }

  function exportJSON() {
    const d = new Date();
    if (role === 'admin') {
      const schema = toOriginalSchema(services);
      const filename = `ussd_data_full_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}.json`;
      download(filename, JSON.stringify(schema, null, 2));
    } else if (role) {
      const subset = toTelcoSubset(services, role as TelcoKey);
      const filename = `${role}_data_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}.json`;
      download(filename, JSON.stringify(subset, null, 2));
    }
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        if (role === 'admin') {
          const normalized = normalizeImported(json);
          persist(normalized);
        } else if (role) {
          const next = applyTelcoSubset(services, role as TelcoKey, json);
          persist(next);
        }
        alert('Import successful.');
      } catch (err: any) {
        alert('Import failed: ' + err.message);
      } finally {
        if (fileRef.current) fileRef.current.value = '';
      }
    };
    reader.readAsText(file);
  }

  function saveVersion() {
    const d = new Date();
    const label = tsLabel(d);
    const snapshot: ServiceMap = JSON.parse(JSON.stringify(services));
    const rec: VersionRecord = { timestamp: d.toISOString(), label, snapshot };
    
    // Keep only the 5 most recent versions (including the new one)
    const next = [rec, ...versions].slice(0, 5);
    
    setVersions(next);
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(next));
    alert('Saved new version: ' + label);
  }

  function restoreVersion(i: number) {
    const rec = versions[i];
    if (!rec) return;
    persist(JSON.parse(JSON.stringify(rec.snapshot)));
    alert('Restored version: ' + rec.label);
  }

  function approveChangeRequest(requestId: string) {
    if (role !== 'admin') return;
    
    const request = changeRequests[requestId];
    if (!request || request.status !== 'pending') return;
    
    // Apply the change to services
    const next = { ...services };
    const service = next[request.serviceId];
    if (!service) return;
    
    // Parse field path (e.g., "telcos.mtn.code")
    const [, telco, key] = request.field.split('.');
    if (telco && key && service.telcos[telco as TelcoKey]) {
      (service.telcos[telco as TelcoKey] as any)[key] = request.newValue;
      service.lastUpdated = nowISO();
    }
    
    // Update request status
    const updatedRequest = {
      ...request,
      status: 'approved' as const,
      reviewedBy: session?.displayName || 'Admin',
      reviewedAt: nowISO()
    };
    
    const nextRequests = { ...changeRequests, [requestId]: updatedRequest };
    
    persist(next);
    setChangeRequests(nextRequests);
    saveChangeRequests(nextRequests);
    
    alert(`Change approved: ${request.field} updated for ${service.service_name}`);
  }

  function rejectChangeRequest(requestId: string, comments?: string) {
    if (role !== 'admin') return;
    
    const request = changeRequests[requestId];
    if (!request || request.status !== 'pending') return;
    
    const updatedRequest = {
      ...request,
      status: 'rejected' as const,
      reviewedBy: session?.displayName || 'Admin',
      reviewedAt: nowISO(),
      comments
    };
    
    const nextRequests = { ...changeRequests, [requestId]: updatedRequest };
    setChangeRequests(nextRequests);
    saveChangeRequests(nextRequests);
    
    alert(`Change rejected: ${request.field} for ${services[request.serviceId]?.service_name || 'Unknown Service'}`);
  }

  function submitDraftChange(requestId: string) {
    const request = changeRequests[requestId];
    if (!request || request.status !== 'draft') return;
    
    const updatedRequest = {
      ...request,
      status: 'pending' as const,
      requestedAt: nowISO()
    };
    
    const nextRequests = { ...changeRequests, [requestId]: updatedRequest };
    setChangeRequests(nextRequests);
    saveChangeRequests(nextRequests);
    
    alert('Change request submitted for admin review!');
  }

  function cancelDraftChange(requestId: string) {
    const nextRequests = { ...changeRequests };
    delete nextRequests[requestId];
    setChangeRequests(nextRequests);
    saveChangeRequests(nextRequests);
  }

  function recallPendingChange(requestId: string) {
    const request = changeRequests[requestId];
    if (!request || request.status !== 'pending') return;
    
    // Convert pending change back to draft for editing
    const updatedRequest = {
      ...request,
      status: 'draft' as const,
      requestedAt: nowISO() // Update timestamp
    };
    
    const nextRequests = { ...changeRequests, [requestId]: updatedRequest };
    setChangeRequests(nextRequests);
    saveChangeRequests(nextRequests);
    
    alert('Change recalled! You can now edit and resubmit.');
  }

  // ---- Auth Views ----
  if (!session) {
    return <Login onLogin={(sess) => { setSession(sess); saveSession(sess); }} />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-72 border-r bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Versions</h2>
          <button className="text-xs underline" onClick={() => setShowVersions(v => !v)}>{showVersions ? 'Hide' : 'Show'}</button>
        </div>
        <button onClick={saveVersion} className="btn btn-ghost w-full">Save current as new version</button>
        {showVersions && (
          <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
            {versions.length === 0 && <p className="text-xs text-gray-500">No versions yet.</p>}
            {versions.map((v, idx) => (
              <div key={idx} className="border rounded-lg p-2">
                <div className="text-xs text-gray-500">{new Date(v.timestamp).toLocaleString()}</div>
                <div className="text-sm font-medium">{v.label}</div>
                <div className="mt-2 flex gap-2">
                  <button className="btn btn-ghost text-xs" onClick={() => restoreVersion(idx)}>Restore</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">USSD Data Manager — Role-Based</h1>
            <div className="text-xs text-gray-600">Logged in as: <span className="font-medium">{ROLE_LABEL[session.role]}</span> — {session.displayName}</div>
          </div>
          <div className="flex items-center gap-2">
            <input type="file" ref={fileRef} accept="application/json" onChange={handleImport} className="hidden" />
            <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
              {role === 'admin' ? 'Import Full JSON' : 'Import My Network JSON'}
            </button>
            <button className="btn btn-ghost" onClick={exportJSON}>
              {role === 'admin' ? 'Export Full JSON' : 'Export My Network Data'}
            </button>
            <button className="btn btn-primary" onClick={saveVersion}>Save Version</button>
            {role === 'admin' && (
              <button 
                className={clsx(
                  "btn btn-ghost relative",
                  Object.values(changeRequests).some(req => req.status === 'pending') && "bg-orange-50 border-orange-200"
                )}
                onClick={() => setShowPendingChanges(!showPendingChanges)}
              >
                Pending Changes
                {(() => {
                  const pendingCount = Object.values(changeRequests).filter(req => req.status === 'pending').length;
                  return pendingCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {pendingCount}
                    </span>
                  );
                })()}
              </button>
            )}
            {role === 'admin' && (
              <ApiPanel 
                services={services} 
                onSyncComplete={() => {
                  // Optionally refresh or show success message
                  console.log('API sync completed');
                }} 
              />
            )}
            <button className="btn btn-ghost" onClick={() => { setSession(null); saveSession(null); }}>
              Logout
            </button>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <input
            className="input max-w-xs"
            placeholder="Search by service id or name..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          {role === 'admin' && <button className="btn btn-ghost" onClick={addService}>Add Service</button>}
          
          {/* Draft Changes Indicator for Telco Reps */}
          {role !== 'admin' && (() => {
            const draftCount = Object.values(changeRequests).filter(req => req.status === 'draft').length;
            return draftCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <span className="text-blue-700">📝 {draftCount} unsaved change{draftCount !== 1 ? 's' : ''}</span>
                <span className="text-blue-500 text-xs">Scroll down to submit</span>
              </div>
            );
          })()}
        </div>

        {/* Pagination Info and Controls */}
        {totalItems > 0 && (
          <div className="flex items-center justify-between bg-white border rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} services
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select 
                  value={itemsPerPage} 
                  onChange={e => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm border rounded ${
                          currentPage === pageNum 
                            ? 'bg-blue-500 text-white border-blue-500' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {totalItems === 0 && (
            <div className="text-center py-12 bg-white border rounded-xl">
              <div className="text-6xl mb-4">📱</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter ? 'No matching services found' : 'No USSD services yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {filter 
                  ? 'Try adjusting your search terms or clear the filter to see all services.'
                  : 'Get started by adding your first service or importing existing data.'
                }
              </p>
              <div className="flex justify-center gap-3">
                {filter ? (
                  <button 
                    onClick={() => setFilter('')}
                    className="btn btn-ghost"
                  >
                    Clear Filter
                  </button>
                ) : (
                  <>
                    {role === 'admin' && (
                      <button 
                        onClick={addService}
                        className="btn btn-primary"
                      >
                        Add Your First Service
                      </button>
                    )}
                    <button 
                      onClick={() => fileRef.current?.click()}
                      className="btn btn-ghost"
                    >
                      Import JSON Data
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          
          {list.map(s => (
            <ServiceCard 
              key={s.service_id} 
              service={s} 
              role={role!} 
              changeRequests={changeRequests}
              onUpdateField={setField}
              onUpdateTelcoField={setTelcoField}
              onSubmitDraft={submitDraftChange}
              onCancelDraft={cancelDraftChange}
              onRecallPending={recallPendingChange}
              onDelete={() => setDeleteConfirm({ serviceId: s.service_id, serviceName: s.service_name })}
              onOpenDescription={() => setDescriptionModal({ serviceId: s.service_id, serviceName: s.service_name })}
            />
          ))}
        </div>

        {/* Bottom Pagination (for convenience) */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Pending Changes Panel */}
      {role === 'admin' && showPendingChanges && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l shadow-xl z-40 overflow-hidden">
          <PendingChangesPanel
            changeRequests={changeRequests}
            services={services}
            onApprove={approveChangeRequest}
            onReject={rejectChangeRequest}
            onClose={() => setShowPendingChanges(false)}
          />
        </div>
      )}

      {/* Description Modal */}
      {descriptionModal && (
        <DescriptionModal
          serviceId={descriptionModal.serviceId}
          serviceName={descriptionModal.serviceName}
          description={services[descriptionModal.serviceId]?.description || ''}
          canEdit={role === 'admin'}
          onSave={(description) => {
            setField(descriptionModal.serviceId, 'description', description);
            setDescriptionModal(null);
          }}
          onClose={() => setDescriptionModal(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          serviceName={deleteConfirm.serviceName}
          onConfirm={() => {
            removeService(deleteConfirm.serviceId);
            setDeleteConfirm(null);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

function ServiceCard({ 
  service, 
  role, 
  changeRequests,
  onUpdateField, 
  onUpdateTelcoField, 
  onSubmitDraft,
  onCancelDraft,
  onRecallPending,
  onDelete,
  onOpenDescription
}: {
  service: ServiceEntry;
  role: Role;
  changeRequests: ChangeRequestMap;
  onUpdateField: (id: string, field: keyof ServiceEntry, value: any) => void;
  onUpdateTelcoField: (id: string, telco: TelcoKey, key: 'code' | 'explanation', value: string) => void;
  onSubmitDraft: (requestId: string) => void;
  onCancelDraft: (requestId: string) => void;
  onRecallPending: (requestId: string) => void;
  onDelete: () => void;
  onOpenDescription: () => void;
}) {
  const canEditService = role === 'admin';
  
  // Local state for Service ID to prevent focus loss
  const [localServiceId, setLocalServiceId] = React.useState(service.service_id);
  
  // Update local state when service prop changes
  React.useEffect(() => {
    setLocalServiceId(service.service_id);
  }, [service.service_id]);
  
  // Get change request for a specific field (draft or pending)
  const getChangeRequest = (field: string) => {
    return Object.values(changeRequests).find(
      req => req.serviceId === service.service_id && 
             req.field === field && 
             (req.status === 'draft' || req.status === 'pending')
    );
  };

  // Get all draft changes for this service
  const getDraftChanges = () => {
    return Object.values(changeRequests).filter(
      req => req.serviceId === service.service_id && req.status === 'draft'
    );
  };
  
  const getTelcoColor = (telco: TelcoKey) => {
    const colors = {
      mtn: 'bg-yellow-50 border-yellow-200',
      telecel: 'bg-red-50 border-red-200', 
      airteltigo: 'bg-blue-50 border-blue-200',
      glo: 'bg-green-50 border-green-200'
    };
    return colors[telco];
  };

  const getTelcoAccent = (telco: TelcoKey) => {
    const colors = {
      mtn: 'text-yellow-700 bg-yellow-100',
      telecel: 'text-red-700 bg-red-100',
      airteltigo: 'text-blue-700 bg-blue-100', 
      glo: 'text-green-700 bg-green-100'
    };
    return colors[telco];
  };

  const isRecentlyUpdated = (() => {
    const now = Date.now();
    const updated = new Date(service.lastUpdated).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    return now - updated < fiveMinutes;
  })();

  return (
    <div className={clsx(
      "bg-white border rounded-xl p-6 space-y-6 transition-all",
      !service.active && "opacity-60 bg-gray-50",
      isRecentlyUpdated && "ring-2 ring-green-200 shadow-lg"
    )}>
      {/* Service Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={service.active} 
              disabled={!canEditService}
              onChange={e => onUpdateField(service.service_id, 'active', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Service ID</label>
                <input 
                  value={localServiceId} 
                  disabled={!canEditService}
                  className={clsx(
                    "w-full px-3 py-2 border rounded-lg text-sm",
                    canEditService ? "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" : "bg-gray-50 border-gray-200 text-gray-500"
                  )}
                  onChange={e => {
                    setLocalServiceId(e.target.value);
                  }}
                  onBlur={e => {
                    const newId = e.target.value.trim();
                    if (newId && newId !== service.service_id) {
                      onUpdateField(service.service_id, 'service_id', newId);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Service Name
                  {service.description && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                      📋 Has Guide
                    </span>
                  )}
                  {isRecentlyUpdated && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                      ✨ Recently Updated
                    </span>
                  )}
                </label>
                <input 
                  value={service.service_name} 
                  disabled={!canEditService}
                  className={clsx(
                    "w-full px-3 py-2 border rounded-lg text-sm",
                    canEditService ? "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" : "bg-gray-50 border-gray-200 text-gray-500"
                  )}
                  onChange={e => onUpdateField(service.service_id, 'service_name', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>


        
        <div className="flex items-center gap-2 ml-4">
          <div className="text-xs text-gray-500">
            Updated: {new Date(service.lastUpdated).toLocaleDateString()}
          </div>
          
          {/* Description Button - Show for all users if description exists, or for admin always */}
          {(service.description || canEditService) && (
            <button 
              onClick={onOpenDescription}
              className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
            >
              {canEditService ? 'Edit Guide' : 'View Guide'}
            </button>
          )}
          
          {canEditService && (
            <button 
              onClick={onDelete}
              className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Telco Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TELCOS.map(telco => {
          const canEdit = role === 'admin' || role === telco;
          const telcoData = service.telcos[telco];
          
          return (
            <div key={telco} className={clsx("border rounded-lg p-4 space-y-3", getTelcoColor(telco))}>
              <div className={clsx("inline-flex px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wide", getTelcoAccent(telco))}>
                {telco === 'airteltigo' ? 'AirtelTigo' : telco.toUpperCase()}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    USSD Code
                    {(() => {
                      const changeRequest = getChangeRequest(`telcos.${telco}.code`);
                      return changeRequest && (
                        <span className={clsx(
                          "ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs",
                          changeRequest.status === 'draft' 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-orange-100 text-orange-700"
                        )}>
                          {changeRequest.status === 'draft' ? '📝 Draft' : '⏳ Pending'}
                        </span>
                      );
                    })()}
                  </label>
                  <input 
                    value={(() => {
                      const changeRequest = getChangeRequest(`telcos.${telco}.code`);
                      return changeRequest?.status === 'draft' ? changeRequest.newValue : telcoData.code;
                    })()} 
                    disabled={!canEdit}
                    placeholder="e.g. *124#"
                    className={clsx(
                      "w-full px-3 py-2 border rounded-lg text-sm font-mono",
                      canEdit 
                        ? "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" 
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    )}
                    onChange={e => onUpdateTelcoField(service.service_id, telco, 'code', e.target.value)}
                  />
                  {(() => {
                    const changeRequest = getChangeRequest(`telcos.${telco}.code`);
                    return changeRequest && (
                      <div className={clsx(
                        "mt-1 text-xs",
                        changeRequest.status === 'draft' ? "text-blue-600" : "text-orange-600"
                      )}>
                        {changeRequest.status === 'draft' ? 'Draft' : 'Requested'}: "{changeRequest.newValue}" by {changeRequest.requestedBy}
                      </div>
                    );
                  })()}
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Explanation
                    {(() => {
                      const changeRequest = getChangeRequest(`telcos.${telco}.explanation`);
                      return changeRequest && (
                        <span className={clsx(
                          "ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs",
                          changeRequest.status === 'draft' 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-orange-100 text-orange-700"
                        )}>
                          {changeRequest.status === 'draft' ? '📝 Draft' : '⏳ Pending'}
                        </span>
                      );
                    })()}
                  </label>
                  <textarea 
                    value={(() => {
                      const changeRequest = getChangeRequest(`telcos.${telco}.explanation`);
                      return changeRequest?.status === 'draft' ? changeRequest.newValue : telcoData.explanation;
                    })()} 
                    disabled={!canEdit}
                    placeholder="Describe what this code does..."
                    rows={3}
                    className={clsx(
                      "w-full px-3 py-2 border rounded-lg text-sm resize-none",
                      canEdit 
                        ? "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" 
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    )}
                    onChange={e => onUpdateTelcoField(service.service_id, telco, 'explanation', e.target.value)}
                  />
                  {(() => {
                    const changeRequest = getChangeRequest(`telcos.${telco}.explanation`);
                    return changeRequest && (
                      <div className={clsx(
                        "mt-1 text-xs",
                        changeRequest.status === 'draft' ? "text-blue-600" : "text-orange-600"
                      )}>
                        {changeRequest.status === 'draft' ? 'Draft' : 'Requested'}: "{changeRequest.newValue}" by {changeRequest.requestedBy}
                      </div>
                    );
                  })()}
                </div>
              </div>
              
              {!canEdit && (
                <div className="text-xs text-gray-400 italic">View only</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Draft Actions for Telco Reps */}
      {role !== 'admin' && (() => {
        const draftChanges = getDraftChanges();
        const pendingChanges = Object.values(changeRequests).filter(
          req => req.serviceId === service.service_id && req.status === 'pending'
        );
        
        return (draftChanges.length > 0 || pendingChanges.length > 0) && (
          <div className="mt-4 space-y-3">
            {/* Draft Changes Section */}
            {draftChanges.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-blue-800">
                    {draftChanges.length} unsaved change{draftChanges.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="text-xs text-blue-700 mb-3">
                  Review your changes and submit for admin approval, or cancel to discard.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      draftChanges.forEach(draft => onSubmitDraft(draft.id));
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Submit for Approval
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel all draft changes? This cannot be undone.')) {
                        draftChanges.forEach(draft => onCancelDraft(draft.id));
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel Changes
                  </button>
                </div>
              </div>
            )}
            
            {/* Pending Changes Section */}
            {pendingChanges.length > 0 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-orange-800">
                    {pendingChanges.length} change{pendingChanges.length !== 1 ? 's' : ''} awaiting admin review
                  </div>
                </div>
                <div className="text-xs text-orange-700 mb-3">
                  You can recall pending changes to make modifications before the admin reviews them.
                </div>
                <div className="space-y-2">
                  {pendingChanges.map(change => {
                    const [, telco, field] = change.field.split('.');
                    return (
                      <div key={change.id} className="flex items-center justify-between bg-white p-2 rounded border">
                        <div className="text-xs">
                          <div className="font-medium">
                            {telco?.toUpperCase()} • {field === 'code' ? 'USSD Code' : 'Explanation'}
                          </div>
                          <div className="text-gray-600">
                            "{change.newValue}" → Submitted {new Date(change.requestedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('Recall this change for editing? It will be converted back to a draft.')) {
                              onRecallPending(change.id);
                            }
                          }}
                          className="px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
                        >
                          Recall
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function PendingChangesPanel({
  changeRequests,
  services,
  onApprove,
  onReject,
  onClose
}: {
  changeRequests: ChangeRequestMap;
  services: ServiceMap;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string, comments?: string) => void;
  onClose: () => void;
}) {
  const pendingRequests = Object.values(changeRequests).filter(req => req.status === 'pending');
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pending Changes</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {pendingRequests.length} change{pendingRequests.length !== 1 ? 's' : ''} awaiting review
        </p>
      </div>
      
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {pendingRequests.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-gray-500">No pending changes</p>
          </div>
        ) : (
          pendingRequests.map(request => {
            const service = services[request.serviceId];
            if (!service) return null;
            
            const [, telco, field] = request.field.split('.');
            
            return (
              <div key={request.id} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-sm">{service.service_name}</h3>
                    <p className="text-xs text-gray-500">
                      {telco?.toUpperCase()} • {field === 'code' ? 'USSD Code' : 'Explanation'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(request.requestedAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <div className="text-xs font-medium text-gray-600">Current:</div>
                    <div className="text-sm bg-gray-50 p-2 rounded border">
                      {request.oldValue || <em className="text-gray-400">Empty</em>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600">Requested:</div>
                    <div className="text-sm bg-blue-50 p-2 rounded border border-blue-200">
                      {request.newValue || <em className="text-gray-400">Empty</em>}
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  Requested by: {request.requestedBy}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => onApprove(request.id)}
                    className="flex-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onReject(request.id)}
                    className="flex-1 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  serviceName,
  onConfirm,
  onCancel
}: {
  serviceName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Handle keyboard shortcuts and focus management
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        // Require Ctrl/Cmd + Enter for destructive action
        onConfirm();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    // Focus the cancel button (safer default)
    cancelButtonRef.current?.focus();
    
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, onConfirm]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Delete Service</h2>
              <p className="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-700 mb-3">
              Are you sure you want to delete the service <strong>"{serviceName}"</strong>? 
              This will permanently remove all USSD codes and explanations for all networks.
            </p>
            <p className="text-xs text-gray-500">
              Press Escape to cancel, or Ctrl+Enter to confirm deletion.
            </p>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              ref={cancelButtonRef}
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DescriptionModal({
  serviceId,
  serviceName,
  description,
  canEdit,
  onSave,
  onClose
}: {
  serviceId: string;
  serviceName: string;
  description: string;
  canEdit: boolean;
  onSave: (description: string) => void;
  onClose: () => void;
}) {
  const [editedDescription, setEditedDescription] = useState(description);

  // Handle Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSave = () => {
    onSave(editedDescription);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Service Guidance</h2>
              <p className="text-sm text-gray-600 mt-1">
                {serviceName} <span className="text-gray-400">({serviceId})</span>
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {canEdit ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guidance for Telco Representatives
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Provide clear instructions on what USSD codes and explanations are expected for this service. 
                  This guidance is only visible within the app and won't be exported.
                </p>
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Example: Enter the USSD code customers dial to check their main airtime balance. Explanation should be clear and mention it's for airtime (not data) balance."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Guidance
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {description ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Instructions for this service:</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{description}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No guidance available for this service.</p>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    setError('');
    
    // Password validation
    const correctPassword = role === 'admin' ? 'password12345!' : 'password54321!';
    
    if (password !== correctPassword) {
      setError('Invalid password. Please check your credentials.');
      return;
    }
    
    if (!name.trim()) {
      setError('Please enter your display name.');
      return;
    }
    
    onLogin({ role, displayName: name.trim() });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="w-full max-w-md bg-white border rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-semibold">USSD Data Manager — Login</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        <div className="space-y-2">
          <label className="text-sm text-gray-600">Display name</label>
          <input 
            className="input" 
            placeholder="e.g. Jane Doe" 
            value={name} 
            onChange={e => setName(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm text-gray-600">Role</label>
          <select 
            className="input" 
            value={role} 
            onChange={e => {
              setRole(e.target.value as Role);
              setPassword(''); // Clear password when role changes
              setError('');
            }}
          >
            <option value="admin">Admin</option>
            <option value="mtn">MTN Rep</option>
            <option value="telecel">Telecel Rep</option>
            <option value="airteltigo">AirtelTigo Rep</option>
            <option value="glo">Glo Rep</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm text-gray-600">Password</label>
          <input 
            type="password"
            className="input" 
            placeholder="Enter your password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <p className="text-xs text-gray-500">
            {role === 'admin' 
              ? 'Admin password required' 
              : 'Telco representative password required'
            }
          </p>
        </div>
        
        <div className="flex gap-2 justify-end pt-2">
          <button 
            className="btn btn-primary" 
            onClick={handleLogin}
            disabled={!name.trim() || !password}
          >
            Login
          </button>
        </div>
        
        <div className="text-xs text-gray-500 pt-2 space-y-1">
          <p>Secure authentication with role-based access control.</p>
          <p>Contact your administrator for password assistance.</p>
        </div>
      </div>
    </div>
  );
}
