import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, RefreshCw, Loader2, ExternalLink, X, Download, Printer,
  FileText, AlertCircle, ArrowLeft, CheckCircle2, FilePlus2, FileSignature,
  BarChart3, Mail, Settings, FolderClosed, Eye, ChevronDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useArchiveList,
  useArchiveDetail,
  useLastImportRun,
  useArchiveCounts,
  useTemplatesList,
  useTemplateCounts,
  useDoctypes,
  triggerBpImport,
  triggerImportByIds,
  getSignedHtmlUrl,
  getSignedPdfUrl,
  formatRelativeTime,
  BP_TYPE_LABELS,
  useDebouncedValue,
  type ArchiveFilters,
  type BpStatus,
  type TemplateFilters,
} from '../hooks/useBpArchive';

// ─── Status pill colors (match BP's tab/badge palette) ──────────────────────
const STATUS_COLORS: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-600 border-gray-200',
  pending:     'bg-blue-50 text-blue-600 border-blue-200',
  sent:        'bg-blue-50 text-blue-600 border-blue-200',
  outstanding: 'bg-amber-50 text-amber-600 border-amber-200',
  opened:      'bg-amber-50 text-amber-600 border-amber-200',
  accepted:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  signed:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  paid:        'bg-emerald-100 text-emerald-700 border-emerald-300',
  lost:        'bg-red-50 text-red-600 border-red-200',
};

// ─── Doc-type badge colors (mirror BP's pink/coral/purple system) ───────────
const TYPE_BADGE: Record<number, { bg: string; text: string; border: string }> = {
  1:    { bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-200' },  // Proposals
  2:    { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' }, // Quotes
  3:    { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200' },  // Brochures
  4:    { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', border: 'border-fuchsia-200' }, // SoW
  5:    { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200' },    // Contracts
  6:    { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200' },  // Sign offs
  7:    { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200' },  // Job Offers
  7200: { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200' },    // Agreement
};

const STATUS_TABS: BpStatus[] = ['draft', 'pending', 'outstanding', 'accepted', 'lost'];

type Section = 'proposals' | 'templates';

export default function AgreementsArchivePage() {
  const [section, setSection] = useState<Section>('proposals');
  const [activeStatus, setActiveStatus] = useState<BpStatus>('draft');
  const { run, reload: reloadRun } = useLastImportRun();
  const [syncing, setSyncing] = useState<null | 'ping' | 'full-sync' | 'ids'>(null);
  const [idsModalOpen, setIdsModalOpen] = useState(false);
  const titleByStatus: Record<BpStatus, string> = {
    draft: 'Draft Documents',
    pending: 'Pending Documents',
    outstanding: 'Outstanding Documents',
    accepted: 'Accepted Documents',
    lost: 'Lost Documents',
  };

  const handleSync = useCallback(async (action: 'ping' | 'full-sync') => {
    setSyncing(action);
    try {
      const res = await triggerBpImport(action, true);
      if (action === 'ping') {
        toast.success(`BP API ok — ${res.bp_account_proposal_count} proposals in account`);
      } else {
        toast.success('Import complete');
      }
      reloadRun();
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(null);
    }
  }, [reloadRun]);

  const handleImportByIds = useCallback(async (rawText: string) => {
    const ids = rawText.split(/[\s,;]+/).map((s) => s.trim()).filter((s) => /^\d+$/.test(s));
    if (ids.length === 0) {
      toast.error('Paste at least one numeric BP proposal ID');
      return;
    }
    setSyncing('ids');
    try {
      const res = await triggerImportByIds(ids, true);
      const t = res.totals;
      const parts = [
        `Imported ${t?.inserted ?? 0}/${t?.pulled ?? 0}`,
        `${t?.pdfFetched ?? 0} PDFs`,
      ];
      if (t?.metadataOnly && t.metadataOnly > 0) parts.push(`${t.metadataOnly} metadata-only`);
      if (t?.notFound && t.notFound > 0) parts.push(`${t.notFound} not found`);
      toast.success(parts.join(' · '));
      setIdsModalOpen(false);
      reloadRun();
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setSyncing(null);
    }
  }, [reloadRun]);

  return (
    <div data-feature="AGREEMENTS_ARCHIVE" className="min-h-screen bg-[#F3F3EE] flex">
      {/* Left rail */}
      <LeftRail section={section} onChange={setSection} />

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-1.5 rounded-lg hover:bg-[#F3F3EE] text-[#6B7280] hover:text-[#1A1A1A]"
              title="Back to admin"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-[26px] font-bold text-[#1A1A1A] leading-tight">
              {section === 'templates' ? 'Templates' : titleByStatus[activeStatus]}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LastSyncBadge run={run} />
            <button
              onClick={() => handleSync('ping')}
              disabled={syncing !== null}
              className="px-3 py-2 rounded-lg text-sm font-medium text-[#1A1A1A] border border-[#E5E7EB] hover:bg-[#F3F3EE] transition disabled:opacity-50"
            >
              {syncing === 'ping' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test BP API'}
            </button>
            <button
              onClick={() => setIdsModalOpen(true)}
              disabled={syncing !== null}
              className="px-3 py-2 rounded-lg text-sm font-medium text-[#1A1A1A] border border-[#E5E7EB] hover:bg-[#F3F3EE] transition disabled:opacity-50"
              title="Import specific BP proposals by ID — use for records past BP's API listing cap"
            >
              Import by IDs
            </button>
            <button
              onClick={() => handleSync('full-sync')}
              disabled={syncing !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#1E9A80] hover:opacity-90 shadow-[rgba(30,154,128,0.35)_0_4px_16px] transition disabled:opacity-50"
            >
              {syncing === 'full-sync' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing === 'full-sync' ? 'Syncing...' : 'Sync now'}
            </button>
          </div>
        </div>

        {section === 'proposals'
          ? <ProposalsSection activeStatus={activeStatus} onStatusChange={setActiveStatus} />
          : <TemplatesSection />}
      </div>

      {idsModalOpen && (
        <ImportByIdsModal
          loading={syncing === 'ids'}
          onClose={() => setIdsModalOpen(false)}
          onSubmit={handleImportByIds}
        />
      )}
    </div>
  );
}

// ─── Import by IDs modal ───────────────────────────────────────────────────
function ImportByIdsModal({
  loading, onClose, onSubmit,
}: { loading: boolean; onClose: () => void; onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');
  const idCount = useMemo(() => text.split(/[\s,;]+/).filter((s) => /^\d+$/.test(s.trim())).length, [text]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[600px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Import BP proposals by ID</h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Paste BP "proposal view IDs" (the number in <code className="text-[10px] bg-[#F3F3EE] px-1 rounded">betterproposals.io/2/proposals/view?id=N</code> URLs). One per line, or comma-separated.
            </p>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Importer tries <b>/proposal/{'{id}'}</b> first for full record + PDF. If BP has deleted the proposal (older records), it falls back to <b>/quote/{'{id}'}</b> for metadata-only import (company, dates, amount — no PDF since BP no longer has it).
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F3F3EE] text-[#6B7280]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'2761909\n2705718\n2573500\n...'}
          rows={12}
          className="flex-1 px-6 py-4 text-sm font-mono border-0 outline-none resize-none focus:ring-0"
        />

        <div className="px-6 py-3 border-t border-[#E5E7EB] flex items-center justify-between bg-[#F3F3EE]/50">
          <div className="text-xs text-[#6B7280]">
            {idCount} valid ID{idCount === 1 ? '' : 's'} detected
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-[#6B7280] hover:bg-[#F3F3EE]">
              Cancel
            </button>
            <button
              onClick={() => onSubmit(text)}
              disabled={loading || idCount === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#1E9A80] hover:opacity-90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? `Importing ${idCount}...` : `Import ${idCount} ID${idCount === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Left rail nav (BP-style icon column) ───────────────────────────────────
function LeftRail({ section, onChange }: { section: Section; onChange: (s: Section) => void }) {
  return (
    <div className="w-[64px] bg-white border-r border-[#E5E7EB] flex flex-col items-center py-4 gap-2 flex-shrink-0">
      {/* Compose / new — disabled placeholder for parity with BP UI */}
      <button
        disabled
        title="New proposal (not built yet)"
        className="w-10 h-10 rounded-lg bg-[#0A0A0A] text-white flex items-center justify-center opacity-60 cursor-not-allowed"
      >
        <FilePlus2 className="h-5 w-5" />
      </button>

      <RailButton
        active={section === 'proposals'}
        label="Proposals"
        icon={<FileSignature className="h-5 w-5" />}
        onClick={() => onChange('proposals')}
      />
      <RailButton
        active={section === 'templates'}
        label="Templates"
        icon={<FileText className="h-5 w-5" />}
        onClick={() => onChange('templates')}
      />

      {/* Disabled placeholders so the column visually matches BP */}
      <RailButton active={false} label="Stats" icon={<BarChart3 className="h-5 w-5" />} onClick={() => {}} disabled />
      <RailButton active={false} label="Mail" icon={<Mail className="h-5 w-5" />} onClick={() => {}} disabled />
      <RailButton active={false} label="Settings" icon={<Settings className="h-5 w-5" />} onClick={() => {}} disabled />
    </div>
  );
}

function RailButton({
  active, label, icon, onClick, disabled,
}: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center transition',
        active
          ? 'bg-[#F3F3EE] text-[#1E9A80]'
          : disabled
            ? 'text-[#D1D5DB] cursor-not-allowed'
            : 'text-[#6B7280] hover:bg-[#F3F3EE] hover:text-[#1A1A1A]',
      )}
    >
      {icon}
    </button>
  );
}

// ─── PROPOSALS SECTION ──────────────────────────────────────────────────────
function ProposalsSection({
  activeStatus, onStatusChange,
}: { activeStatus: BpStatus; onStatusChange: (s: BpStatus) => void }) {
  const [filters, setFilters] = useState<ArchiveFilters>({
    source: 'all',
    bpTypeId: null,
    status: activeStatus,
    search: '',
  });
  useEffect(() => { setFilters((f) => ({ ...f, status: activeStatus })); }, [activeStatus]);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch }));
  }, [debouncedSearch]);

  const { rows, loading: listLoading } = useArchiveList(filters);
  const { counts } = useArchiveCounts();
  const { types: docTypes } = useDoctypes();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Tab-aware column count: Draft has 4, others have 5.
  const colCount = activeStatus === 'draft' ? 4 : 5;

  return (
    <>
      {/* Status tabs (BP-style underline) */}
      <div className="bg-white border-b border-[#E5E7EB] px-6">
        <div className="flex items-center gap-1">
          {STATUS_TABS.map((s) => {
            const active = filters.status === s;
            const n = counts.byStatus[s] ?? 0;
            return (
              <button
                key={s}
                onClick={() => onStatusChange(s)}
                className={cn(
                  'px-4 py-3 text-sm font-semibold transition border-b-2 capitalize',
                  active
                    ? 'text-[#1E9A80] border-[#1E9A80]'
                    : 'text-[#6B7280] border-transparent hover:text-[#1A1A1A]',
                )}
              >
                {s}
                {n > 0 && (
                  <span className={cn(
                    'ml-2 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[11px] font-bold',
                    active ? 'bg-[#1E9A80] text-white' : 'bg-[#F3F3EE] text-[#6B7280]',
                  )}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + doc-type filter */}
      <div className="px-6 py-4 flex items-center gap-3">
        <div className="flex-1 max-w-[600px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by company..."
            className="w-full pl-11 pr-4 py-3 border border-[#E5E7EB] rounded-xl text-sm bg-white focus:outline-none focus:border-[#1E9A80] focus:ring-2 focus:ring-[#1E9A80]/20"
          />
        </div>
        <DocTypeDropdown
          value={filters.bpTypeId}
          types={docTypes}
          onChange={(id) => setFilters((f) => ({ ...f, bpTypeId: id }))}
        />
      </div>

      {/* Table */}
      <div className="px-6 pb-6 flex-1 overflow-auto">
        <Card className="border-[#E5E7EB]">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F3F3EE]/60">
                  <TableHead className="text-[#1A1A1A] font-bold py-4">Company</TableHead>
                  <TableHead className="text-[#1A1A1A] font-bold">Document type</TableHead>
                  <TableHead className="text-[#1A1A1A] font-bold">Value</TableHead>
                  <TableHead className="text-[#1A1A1A] font-bold">Date Created</TableHead>
                  {activeStatus === 'accepted' && (
                    <TableHead className="text-[#1A1A1A] font-bold">Signed On</TableHead>
                  )}
                  {(activeStatus === 'pending' || activeStatus === 'outstanding' || activeStatus === 'lost') && (
                    <TableHead className="text-[#1A1A1A] font-bold">Status</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {listLoading ? (
                  <TableRow>
                    <TableCell colSpan={colCount} className="text-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-[#6B7280] mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colCount} className="text-center text-[#6B7280] py-16">
                      No proposals in this bucket.
                      {counts.bp === 0 && (
                        <div className="mt-1 text-xs">Click <b>Sync now</b> to import from Better Proposals.</div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className="cursor-pointer hover:bg-[#F3F3EE]/60 border-b border-[#E5E7EB]"
                    >
                      <TableCell className="py-4">
                        <div className="font-semibold text-[#1A1A1A] truncate max-w-[460px]">
                          {r.company_name || r.title}
                        </div>
                        {(r.description || (r.title && r.title !== r.company_name)) && (
                          <div className="text-xs text-[#9CA3AF] truncate max-w-[460px] mt-0.5">
                            {r.description || r.title}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <DocTypePill typeId={r.bp_type_id} typeName={r.bp_type_name} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold text-[#1A1A1A]">
                          {formatMoney(r.amount, r.currency)}
                        </div>
                        <button className="text-[11px] text-[#9CA3AF] hover:text-[#6B7280] underline-offset-2 hover:underline">
                          See recurring values
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-[#6B7280]">
                        {(() => {
                          const d = r.bp_date_created ?? r.created_at;
                          return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                        })()}
                      </TableCell>
                      {activeStatus === 'accepted' && (
                        <TableCell className="text-sm text-[#6B7280]">
                          {r.signed_at
                            ? new Date(r.signed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </TableCell>
                      )}
                      {(activeStatus === 'pending' || activeStatus === 'outstanding' || activeStatus === 'lost') && (
                        <TableCell className="text-sm text-[#6B7280]">
                          {statusLineFor(r)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {rows.length === 500 && (
          <p className="text-xs text-[#9CA3AF] text-center mt-3">
            Showing first 500. Refine filters to narrow.
          </p>
        )}
      </div>

      {selectedId && <DetailPanel id={selectedId} onClose={() => setSelectedId(null)} />}
    </>
  );
}

// ─── TEMPLATES SECTION ──────────────────────────────────────────────────────
function TemplatesSection() {
  const [tab, setTab] = useState<'templates' | 'covers' | 'content'>('templates');
  const { counts: tplCounts } = useTemplateCounts();
  const [folder, setFolder] = useState<'all' | 'mine' | 'marketplace'>('all');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [typeId, setTypeId] = useState<number | null>(null);
  const filters: TemplateFilters = useMemo(
    () => ({ search: debouncedSearch, typeId, folder }),
    [debouncedSearch, typeId, folder],
  );
  const { rows, loading } = useTemplatesList(filters);
  const { types: docTypes } = useDoctypes();

  return (
    <>
      {/* Sub-tabs */}
      <div className="bg-white border-b border-[#E5E7EB] px-6">
        <div className="flex items-center gap-1">
          <TabButton active={tab === 'templates'} onClick={() => setTab('templates')} label="Templates" count={tplCounts.templates} />
          <TabButton active={tab === 'covers'} onClick={() => setTab('covers')} label="Covers" count={tplCounts.covers} />
          <TabButton active={tab === 'content'} onClick={() => setTab('content')} label="Content Library" count={tplCounts.contentLibrary} />
        </div>
      </div>

      {tab !== 'templates' ? (
        <div className="flex-1 flex items-center justify-center text-sm text-[#6B7280]">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-[#9CA3AF]" />
            <p>{tab === 'covers' ? 'Covers' : 'Content Library'} not yet imported.</p>
            <p className="text-xs mt-1">Better Proposals API doesn't expose this endpoint publicly.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Folder rail */}
          <div className="w-[240px] border-r border-[#E5E7EB] bg-white p-4 flex-shrink-0">
            <div className="text-xs uppercase tracking-wide text-[#9CA3AF] font-semibold mb-3 px-2">Folders</div>
            <FolderRow active={folder === 'all'} label="All templates" onClick={() => setFolder('all')} />
            <FolderRow active={folder === 'mine'} label="My templates" onClick={() => setFolder('mine')} />
            <FolderRow active={folder === 'marketplace'} label="From marketplace" onClick={() => setFolder('marketplace')} />
          </div>

          {/* Main */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="px-6 py-4 flex items-center gap-3">
              <div className="flex-1 max-w-[500px] relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by template name..."
                  className="w-full pl-11 pr-4 py-3 border border-[#E5E7EB] rounded-xl text-sm bg-white focus:outline-none focus:border-[#1E9A80] focus:ring-2 focus:ring-[#1E9A80]/20"
                />
              </div>
              <DocTypeDropdown value={typeId} types={docTypes} onChange={setTypeId} />
            </div>

            <div className="px-6 pb-6 flex-1 overflow-auto">
              <Card className="border-[#E5E7EB]">
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F3F3EE]/60">
                        <TableHead className="text-[#1A1A1A] font-bold py-4">Template name</TableHead>
                        <TableHead className="text-[#1A1A1A] font-bold">Document Types</TableHead>
                        <TableHead className="text-[#1A1A1A] font-bold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-[#6B7280] mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-[#6B7280] py-16">
                            No templates imported yet. Click <b>Sync now</b> above.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((t) => (
                          <TableRow key={t.bp_id} className="border-b border-[#E5E7EB]">
                            <TableCell className="py-4 font-medium text-[#1A1A1A]">
                              {t.template_name || `Untitled ${t.bp_id}`}
                            </TableCell>
                            <TableCell>
                              <DocTypePill typeId={t.type_id} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  disabled
                                  title="Use this template (sending not built yet)"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#9CA3AF] border border-[#E5E7EB] cursor-not-allowed"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Use this template
                                </button>
                                <button
                                  title="Preview (coming soon)"
                                  className="p-1.5 rounded-lg hover:bg-[#F3F3EE] text-[#6B7280]"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-3 text-sm font-semibold transition border-b-2',
        active ? 'text-[#1E9A80] border-[#1E9A80]' : 'text-[#6B7280] border-transparent hover:text-[#1A1A1A]',
      )}
    >
      {label}
      {count > 0 && (
        <span className={cn(
          'ml-2 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[11px] font-bold',
          active ? 'bg-[#1E9A80] text-white' : 'bg-[#F3F3EE] text-[#6B7280]',
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function FolderRow({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition',
        active ? 'bg-[#F3F3EE] text-[#1A1A1A] font-semibold' : 'text-[#6B7280] hover:bg-[#F3F3EE] hover:text-[#1A1A1A]',
      )}
    >
      <FolderClosed className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

// ─── Reusable bits ──────────────────────────────────────────────────────────
function DocTypePill({ typeId, typeName }: { typeId: number | null; typeName?: string | null }) {
  // Prefer the scraped BP type name; fall back to the doctype-id lookup.
  // If we have NEITHER, render a dash.
  const label = typeName || (typeId !== null && typeId !== undefined ? BP_TYPE_LABELS[typeId] : null);
  if (!label) {
    return <span className="text-xs text-[#9CA3AF]">—</span>;
  }
  // Map the name to a badge color, with type_id fallback for legacy rows.
  const nameToTypeId: Record<string, number> = {
    proposal: 1, proposals: 1,
    quote: 2, quotes: 2,
    brochure: 3, brochures: 3,
    'statement of work': 4, 'statements of work': 4,
    contract: 5, contracts: 5,
    'sign off': 6, signoff: 6, 'sign offs': 6, signoffs: 6,
    'job offer': 7, 'job offers': 7,
    agreement: 7200, agreements: 7200,
  };
  const tid = typeId ?? nameToTypeId[label.toLowerCase().replace(/\s+/g, ' ').trim()] ?? null;
  const c = (tid !== null && TYPE_BADGE[tid]) ?? { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border', c.bg, c.text, c.border)}>
      <FileSignature className="h-3 w-3" />
      {label}
    </span>
  );
}

function DocTypeDropdown({
  value, types, onChange,
}: { value: number | null; types: Array<{ id: number; name: string; colour: string | null }>; onChange: (v: number | null) => void }) {
  const [open, setOpen] = useState(false);
  const selected = types.find((t) => t.id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-3 border border-[#E5E7EB] rounded-xl text-sm bg-white hover:bg-[#F3F3EE] min-w-[220px] justify-between"
      >
        <span className="flex items-center gap-2 text-[#1A1A1A]">
          <FileText className="h-4 w-4 text-[#6B7280]" />
          {selected?.name ?? 'All Document Types'}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-[#9CA3AF] transition', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 min-w-[220px] bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-20 overflow-hidden">
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm hover:bg-[#F3F3EE]',
                value === null ? 'bg-[#F3F3EE] font-semibold' : '',
              )}
            >
              All Document Types
            </button>
            {types.map((t) => (
              <button
                key={t.id}
                onClick={() => { onChange(t.id); setOpen(false); }}
                className={cn(
                  'w-full text-left px-4 py-2.5 text-sm hover:bg-[#F3F3EE]',
                  value === t.id ? 'bg-[#F3F3EE] font-semibold' : '',
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LastSyncBadge({ run }: { run: ReturnType<typeof useLastImportRun>['run'] }) {
  if (!run) return <div className="text-xs text-[#9CA3AF] hidden sm:block">Never synced</div>;
  const when = formatRelativeTime(run.finished_at ?? run.started_at);
  const statusIcon = run.status === 'completed' ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
  ) : run.status === 'failed' ? (
    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
  ) : (
    <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
  );
  return (
    <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#6B7280] bg-[#F3F3EE] px-2.5 py-1.5 rounded-lg">
      {statusIcon}
      <span>Last sync: {when}</span>
      {run.proposals_pulled > 0 && (
        <span className="text-[#9CA3AF]">· {run.proposals_pulled} proposals</span>
      )}
    </div>
  );
}

// BP shows things like "Sent on 8 September 2025", "Opened on 26 September 2025",
// "Received on 8 September 2025". Derive from activityLog (most recent entry),
// falling back to date_sent and created_at.
function statusLineFor(row: {
  bp_raw: unknown;
  date_sent: string | null;
  bp_date_created: string | null;
  created_at: string | null;
}): string {
  const longDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // 1) Try activityLog: pick the most recent meaningful entry.
  const raw = row.bp_raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as { activityLog?: unknown }).activityLog)) {
    const log = (raw as { activityLog: Array<{ action: string; date: string | null }> }).activityLog;
    // Prefer Sent/Opened/Received/Signed/Resent over scraper-noise entries.
    const meaningful = log.find((e) =>
      /^(sent|opened|received|signed|resent|viewed)/i.test(e?.action ?? ''),
    ) ?? log[0];
    if (meaningful?.action) {
      // strip " at HH:MM" from "20 June 2026 at 13:29"
      const dateLabel = meaningful.date ? meaningful.date.replace(/\s+at\s+\d{1,2}:\d{2}.*$/i, '') : null;
      const verb = meaningful.action.replace(/\.$/, '').trim();
      const niceVerb = /^opened/i.test(verb) ? 'Opened'
        : /^sent/i.test(verb) ? 'Sent'
        : /^received/i.test(verb) ? 'Received'
        : /^signed/i.test(verb) ? 'Signed'
        : /^resent/i.test(verb) ? 'Resent'
        : /^viewed/i.test(verb) ? 'Opened'
        : verb;
      return dateLabel ? `${niceVerb} on ${dateLabel}` : niceVerb;
    }
  }

  // 2) Fall back to date_sent
  if (row.date_sent) return `Sent on ${longDate(row.date_sent)}`;

  // 3) Fall back to created date
  const created = row.bp_date_created ?? row.created_at;
  if (created) return `Created on ${longDate(created)}`;

  return '—';
}

function formatMoney(amount: number, currency: string): string {
  if (amount === 0) {
    const sym = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
    return `${sym}0.00`;
  }
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

// ─── Detail panel (unchanged from previous version, kept inline) ────────────
// ─── Activity timeline (rendered from bp_raw.activityLog) ───────────────────
function ActivityTimeline({ raw }: { raw: unknown }) {
  // bp_raw shape: either the full BP proposal record or our metadata-only
  // wrapper. The scraper writes { _scraper, activityLog: [{action, date}] }.
  const items: Array<{ action: string; date: string | null }> = (() => {
    if (!raw || typeof raw !== 'object') return [];
    const obj = raw as Record<string, unknown>;
    const log = obj.activityLog;
    return Array.isArray(log) ? (log as Array<{ action: string; date: string | null }>) : [];
  })();

  if (items.length === 0) {
    return (
      <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F3F3EE]/30">
        <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-2">
          Document Activity
        </div>
        <div className="text-xs text-[#9CA3AF] italic">No activity captured for this row.</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F3F3EE]/30">
      <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-3">
        Document Activity
      </div>
      <ol className="relative border-l-2 border-[#E5E7EB] pl-4 space-y-3 max-h-[260px] overflow-auto">
        {items.map((it, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#1E9A80] ring-2 ring-white" />
            <div className="text-sm font-medium text-[#1A1A1A]">{it.action}</div>
            {it.date && <div className="text-xs text-[#9CA3AF] mt-0.5">{it.date}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function DetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { row, loading } = useArchiveDetail(id);
  const [signedHtmlUrl, setSignedHtmlUrl] = useState<string | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (row?.html_storage_path) {
      void (async () => {
        const url = await getSignedHtmlUrl(row.html_storage_path);
        setSignedHtmlUrl(url);
      })();
    } else {
      setSignedHtmlUrl(null);
    }
  }, [row?.html_storage_path]);

  useEffect(() => {
    if (row?.pdf_storage_path) {
      void (async () => {
        const url = await getSignedPdfUrl(row.pdf_storage_path);
        setSignedPdfUrl(url);
      })();
    } else {
      setSignedPdfUrl(null);
    }
  }, [row?.pdf_storage_path]);

  const printHtml = useCallback(() => {
    if (!row?.terms_html) return;
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) {
      toast.error('Pop-up blocked. Please allow pop-ups to print.');
      return;
    }
    w.document.open();
    w.document.write(row.terms_html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }, [row?.terms_html]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="w-full max-w-[900px] bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#6B7280]" />
          </div>
        ) : !row ? (
          <div className="flex-1 flex items-center justify-center text-[#6B7280] text-sm">
            Could not load this agreement.
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={cn('text-xs capitalize', STATUS_COLORS[row.status])}>
                    {row.status}
                  </Badge>
                  <DocTypePill typeId={row.bp_type_id} typeName={row.bp_type_name} />
                  <span className="text-xs text-[#9CA3AF] font-mono">
                    {row.source === 'bp_import' ? `BP #${row.bp_id}` : row.token}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#1A1A1A] truncate">{row.company_name || row.title}</h2>
                {row.description && (
                  <p className="text-sm text-[#6B7280] truncate">{row.description}</p>
                )}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F3F3EE] text-[#6B7280]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4 border-b border-[#E5E7EB] grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-sm">
              <MetaItem label="Amount" value={formatMoney(row.amount, row.currency)} />
              <MetaItem label="Sent" value={row.date_sent ? new Date(row.date_sent).toLocaleDateString('en-GB') : '—'} />
              <MetaItem label="Signed" value={row.signed_at ? new Date(row.signed_at).toLocaleDateString('en-GB') : '—'} />
              <MetaItem label="Signer" value={row.signer_name || '—'} />
              <MetaItem label="Signer email" value={row.signer_email || '—'} />
              <MetaItem label="Recipient" value={row.recipient_name || '—'} />
              <MetaItem label="Company" value={row.company_name || '—'} />
              <MetaItem label="Imported" value={row.imported_at ? new Date(row.imported_at).toLocaleString('en-GB') : '—'} />
            </div>

            <ActivityTimeline raw={row.bp_raw} />


            <div className="px-6 py-3 border-b border-[#E5E7EB] flex items-center gap-2 flex-wrap bg-[#F3F3EE]/50">
              {row.bp_preview_url && (
                <a
                  href={row.bp_preview_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] hover:bg-[#F3F3EE]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in Better Proposals
                </a>
              )}
              {signedPdfUrl && (
                <a
                  href={signedPdfUrl}
                  download={`${row.title || row.bp_id || 'proposal'}.pdf`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1E9A80] hover:opacity-90"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </a>
              )}
              {signedHtmlUrl && (
                <a
                  href={signedHtmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] hover:bg-[#F3F3EE]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download HTML
                </a>
              )}
              {row.terms_html && !signedPdfUrl && (
                <button
                  onClick={printHtml}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] hover:bg-[#F3F3EE]"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / Save as PDF
                </button>
              )}
              {row.source === 'native' && row.token && (
                <a
                  href={`/agreement/${row.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1E9A80] bg-white border border-[#1E9A80]/30 hover:bg-[#ECFDF5]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open signing page
                </a>
              )}
            </div>

            <div className="flex-1 overflow-hidden bg-[#2A2A2A]">
              {signedPdfUrl ? (
                <iframe
                  title={row.title}
                  src={signedPdfUrl + '#toolbar=1&navpanes=0'}
                  className="w-full h-full border-0"
                />
              ) : row.terms_html ? (
                <iframe
                  title={row.title}
                  srcDoc={row.terms_html}
                  sandbox="allow-same-origin"
                  className="w-full h-full border-0 bg-white"
                />
              ) : (
                <div className="p-6 text-sm text-[#6B7280] flex items-center gap-2 bg-white">
                  <AlertCircle className="h-4 w-4" />
                  No document body archived. Click "Sync now" to fetch from Better Proposals.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold">{label}</div>
      <div className="text-sm text-[#1A1A1A] truncate" title={value}>{value}</div>
    </div>
  );
}
