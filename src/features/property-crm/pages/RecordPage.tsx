import { useState, ChangeEvent } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  Wifi,
  KeyRound,
  FileText,
  Activity,
  Layers,
  Settings,
  Upload,
  Trash2,
  Download,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useRow, useUpdateRow } from '../hooks/useRows';
import { useFields } from '../hooks/useFields';
import { useCells, useSetCell } from '../hooks/useCells';
import { useCredentials, useUpsertCredentials } from '../hooks/useCredentials';
import { useDocuments, useUploadDocument, useDeleteDocument } from '../hooks/useDocuments';
import { getDocumentUrl } from '../api/documents';
import CredentialField from '../components/CredentialField';
import CellRenderer from '../components/CellRenderer';
import ActivityTimeline from '../components/ActivityTimeline';

type Tab = 'general' | 'internet' | 'accounts' | 'operations' | 'documents' | 'history';

const TABS: Array<{ id: Tab; label: string; icon: typeof Layers }> = [
  { id: 'general', label: 'General', icon: Layers },
  { id: 'internet', label: 'Internet', icon: Wifi },
  { id: 'accounts', label: 'Accounts', icon: KeyRound },
  { id: 'operations', label: 'Operations', icon: Settings },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'history', label: 'History', icon: Activity },
];

export default function RecordPage() {
  const { workspaceId = '', recordId = '' } = useParams();
  const navigate = useNavigate();

  const { data: row, isLoading } = useRow(recordId);
  const { data: fields = [] } = useFields(workspaceId);
  const { data: cells = [] } = useCells(workspaceId);
  const { data: credentials } = useCredentials(recordId);
  const { data: documents = [] } = useDocuments(recordId);

  const updateRow = useUpdateRow(workspaceId);
  const setCell = useSetCell(workspaceId);
  const upsertCreds = useUpsertCredentials(recordId);
  const uploadDoc = useUploadDocument(workspaceId, recordId);
  const deleteDoc = useDeleteDocument(recordId);

  const [tab, setTab] = useState<Tab>('general');

  if (isLoading) return <div className="px-10 py-10 text-[13px] text-[#6B7280]">Loading…</div>;
  if (!row) return <Navigate to={`/properties/${workspaceId}`} replace />;

  const cellMap = new Map(cells.filter((c) => c.row_id === recordId).map((c) => [c.field_id, c]));

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadDoc.mutateAsync(file);
    e.target.value = '';
  }

  async function handleDownload(storagePath: string) {
    const url = await getDocumentUrl(storagePath);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="px-8 py-6 max-w-[1080px] mx-auto">
      <button
        onClick={() => navigate(`/properties/${workspaceId}`)}
        className="flex items-center gap-1.5 text-[12px] text-[#6B7280] hover:text-[#1A1A1A] mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to workspace
      </button>

      <div className="mb-6">
        <input
          type="text"
          value={row.property_name}
          onChange={(e) => updateRow.mutate({ id: row.id, patch: { property_name: e.target.value } })}
          className="text-[26px] font-bold text-[#0A0A0A] bg-transparent border-none outline-none w-full"
        />
        <input
          type="text"
          value={row.address ?? ''}
          onChange={(e) => updateRow.mutate({ id: row.id, patch: { address: e.target.value || null } })}
          placeholder="Add an address…"
          className="text-[14px] text-[#6B7280] bg-transparent border-none outline-none w-full mt-1"
        />
      </div>

      <div className="border-b border-[#E5E7EB] mb-6">
        <div className="flex items-center gap-1 -mb-px">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-[#1E9A80] text-[#1E9A80]'
                    : 'border-transparent text-[#6B7280] hover:text-[#1A1A1A]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'general' && (
        <div className="bg-white border border-[#E8E5DF] rounded-[12px] p-6">
          <h2 className="text-[15px] font-bold text-[#0A0A0A] mb-4">Property details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium text-[#525252] block mb-1">Status</label>
              <Input
                value={row.status ?? ''}
                onChange={(e) => updateRow.mutate({ id: row.id, patch: { status: e.target.value || null } })}
                placeholder="active"
              />
            </div>
            {fields.map((f) => (
              <div key={f.id}>
                <label className="text-[12px] font-medium text-[#525252] block mb-1">{f.name}</label>
                <div className="border border-[#E5E5E5] rounded-[10px] overflow-hidden">
                  <CellRenderer
                    field={f}
                    value={cellMap.get(f.id)?.value ?? null}
                    onChange={(next) => setCell.mutate({ row_id: row.id, field_id: f.id, value: next })}
                  />
                </div>
              </div>
            ))}
            {fields.length === 0 && (
              <div className="md:col-span-2 text-[13px] text-[#6B7280] py-4">
                No custom fields yet. Add columns in the Table view to define what data this CRM tracks.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'internet' && (
        <div className="bg-white border border-[#E8E5DF] rounded-[12px] p-6 space-y-4">
          <h2 className="text-[15px] font-bold text-[#0A0A0A]">WiFi credentials</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CredentialField
              label="Network name (SSID)"
              value={credentials?.wifi_name ?? null}
              onChange={(v) => upsertCreds.mutate({ wifi_name: v })}
              placeholder="MyNetwork-5G"
            />
            <CredentialField
              label="WiFi password"
              type="password"
              value={credentials?.wifi_password ?? null}
              onChange={(v) => upsertCreds.mutate({ wifi_password: v })}
              placeholder="••••••••"
            />
            <CredentialField
              label="Provider"
              value={credentials?.wifi_provider ?? null}
              onChange={(v) => upsertCreds.mutate({ wifi_provider: v })}
              placeholder="BT / Sky / Virgin"
            />
          </div>

          <h2 className="text-[15px] font-bold text-[#0A0A0A] pt-2">Broadband account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CredentialField
              label="Account email"
              type="email"
              value={credentials?.broadband_email ?? null}
              onChange={(v) => upsertCreds.mutate({ broadband_email: v })}
              placeholder="account@example.com"
            />
            <CredentialField
              label="Account password"
              type="password"
              value={credentials?.broadband_password ?? null}
              onChange={(v) => upsertCreds.mutate({ broadband_password: v })}
            />
            <CredentialField
              label="Provider"
              value={credentials?.broadband_provider ?? null}
              onChange={(v) => upsertCreds.mutate({ broadband_provider: v })}
            />
            <CredentialField
              label="Account number"
              value={credentials?.broadband_account_number ?? null}
              onChange={(v) => upsertCreds.mutate({ broadband_account_number: v })}
            />
          </div>
        </div>
      )}

      {tab === 'accounts' && (
        <div className="bg-white border border-[#E8E5DF] rounded-[12px] p-6 space-y-4">
          <h2 className="text-[15px] font-bold text-[#0A0A0A]">Booking portal</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CredentialField
              label="Email / username"
              type="email"
              value={credentials?.booking_email ?? null}
              onChange={(v) => upsertCreds.mutate({ booking_email: v })}
              placeholder="account@example.com"
            />
            <CredentialField
              label="Password"
              type="password"
              value={credentials?.booking_password ?? null}
              onChange={(v) => upsertCreds.mutate({ booking_password: v })}
            />
            <CredentialField
              label="Provider"
              value={credentials?.booking_provider ?? null}
              onChange={(v) => upsertCreds.mutate({ booking_provider: v })}
              placeholder="Airbnb / Booking.com / Vrbo"
            />
          </div>
          <div className="pt-2">
            <label className="text-[12px] font-medium text-[#525252] block mb-1">Notes</label>
            <Textarea
              value={credentials?.notes ?? ''}
              onChange={(e) => upsertCreds.mutate({ notes: e.target.value || null })}
              rows={4}
              placeholder="Anything else worth remembering about these accounts."
            />
          </div>
        </div>
      )}

      {tab === 'operations' && (
        <div className="bg-white border border-[#E8E5DF] rounded-[12px] p-6">
          <h2 className="text-[15px] font-bold text-[#0A0A0A] mb-4">Operations data</h2>
          <p className="text-[12px] text-[#6B7280] mb-4">
            Operational fields configured on this workspace. Add custom columns in the Table view
            to extend this section.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields
              .filter((f) =>
                /clean|check|key|maintenance|ops|guest|host|contact|emergency/i.test(f.name),
              )
              .map((f) => (
                <div key={f.id}>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">{f.name}</label>
                  <div className="border border-[#E5E5E5] rounded-[10px] overflow-hidden">
                    <CellRenderer
                      field={f}
                      value={cellMap.get(f.id)?.value ?? null}
                      onChange={(next) => setCell.mutate({ row_id: row.id, field_id: f.id, value: next })}
                    />
                  </div>
                </div>
              ))}
          </div>
          {fields.filter((f) => /clean|check|key|maintenance|ops|guest|host|contact|emergency/i.test(f.name)).length ===
            0 && (
            <div className="text-[13px] text-[#6B7280] py-4">
              No operations fields yet. Add columns named e.g. "Cleaner", "Check-in code",
              "Emergency contact" to this workspace.
            </div>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div className="bg-white border border-[#E8E5DF] rounded-[12px] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-[#0A0A0A]">Documents</h2>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="file" onChange={handleFileSelect} className="hidden" />
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload
                </span>
              </Button>
            </label>
          </div>
          {documents.length === 0 ? (
            <div className="border border-dashed border-[#E5E7EB] rounded-[10px] p-8 text-center text-[13px] text-[#6B7280]">
              No documents yet. Upload contracts, EPCs, gas certificates, etc.
            </div>
          ) : (
            <ul className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-[10px]">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-[#0A0A0A] truncate">{doc.name}</div>
                    <div className="text-[11px] text-[#9CA3AF]">
                      {(doc.size_bytes ?? 0) > 0 && `${Math.round((doc.size_bytes ?? 0) / 1024)} KB · `}
                      {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDownload(doc.storage_path)}
                      className="p-1.5 rounded hover:bg-[#F3F3EE] text-[#6B7280]"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${doc.name}"?`)) deleteDoc.mutate(doc);
                      }}
                      className="p-1.5 rounded hover:bg-[#FEF2F2] text-[#dc2626]"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'history' && <ActivityTimeline rowId={recordId} />}
    </div>
  );
}
