import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, RefreshCw, Loader2, ExternalLink, X, Download, Printer,
  FileText, AlertCircle, ArrowLeft, CheckCircle2,
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
  triggerBpImport,
  getSignedHtmlUrl,
  formatRelativeTime,
  BP_TYPE_LABELS,
  useDebouncedValue,
  type ArchiveFilters,
} from '../hooks/useBpArchive';

const STATUS_COLORS: Record<string, string> = {
  draft:  'bg-gray-100 text-gray-600 border-gray-200',
  sent:   'bg-blue-50 text-blue-600 border-blue-200',
  opened: 'bg-amber-50 text-amber-600 border-amber-200',
  signed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  paid:   'bg-emerald-100 text-emerald-700 border-emerald-300',
};

const STATUSES = ['all', 'draft', 'sent', 'opened', 'signed', 'paid'] as const;
const BP_TYPE_TABS: Array<{ id: number | null; label: string }> = [
  { id: null,  label: 'All' },
  { id: 1,     label: 'Proposals' },
  { id: 5,     label: 'Contracts' },
  { id: 7200,  label: 'Agreements' },
  { id: 3,     label: 'Brochures' },
  { id: 6,     label: 'Sign-offs' },
];

export default function AgreementsArchivePage() {
  const [filters, setFilters] = useState<ArchiveFilters>({
    source: 'all',
    bpTypeId: null,
    status: 'all',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch }));
  }, [debouncedSearch]);

  const { rows, loading: listLoading, reload } = useArchiveList(filters);
  const { counts, reload: reloadCounts } = useArchiveCounts();
  const { run, reload: reloadRun } = useLastImportRun();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<null | 'ping' | 'full-sync'>(null);

  const handleSync = useCallback(async (action: 'ping' | 'full-sync') => {
    setSyncing(action);
    try {
      const res = await triggerBpImport(action, true);
      if (action === 'ping') {
        toast.success(`BP API ok — ${res.bp_account_proposal_count} proposals in account`);
      } else {
        toast.success('Import complete');
      }
      reload();
      reloadCounts();
      reloadRun();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(null);
    }
  }, [reload, reloadCounts, reloadRun]);

  return (
    <div data-feature="AGREEMENTS_ARCHIVE" className="min-h-screen bg-[#F3F3EE]">
      {/* Top bar */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4">
        <div className="max-w-[1680px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-1.5 rounded-lg hover:bg-[#F3F3EE] text-[#6B7280] hover:text-[#1A1A1A]"
              title="Back to admin"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <FileText className="h-6 w-6 text-[#1E9A80]" />
            <div>
              <h1 className="text-[20px] font-bold text-[#1A1A1A] leading-tight">Agreements</h1>
              <p className="text-xs text-[#6B7280]">
                {counts.total} total · {counts.native} native · {counts.bp} imported from Better Proposals
              </p>
            </div>
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
              onClick={() => handleSync('full-sync')}
              disabled={syncing !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#1E9A80] hover:opacity-90 shadow-[rgba(30,154,128,0.35)_0_4px_16px] transition disabled:opacity-50"
            >
              {syncing === 'full-sync' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing === 'full-sync' ? 'Syncing...' : 'Sync now'}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-3">
        <div className="max-w-[1680px] mx-auto space-y-3">
          {/* Source + type tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            <FilterTab
              active={filters.source === 'all'}
              label="All sources"
              count={counts.total}
              onClick={() => setFilters((f) => ({ ...f, source: 'all', bpTypeId: null }))}
            />
            <FilterTab
              active={filters.source === 'bp_import'}
              label="Better Proposals"
              count={counts.bp}
              onClick={() => setFilters((f) => ({ ...f, source: 'bp_import' }))}
            />
            <FilterTab
              active={filters.source === 'native'}
              label="Native"
              count={counts.native}
              onClick={() => setFilters((f) => ({ ...f, source: 'native', bpTypeId: null }))}
            />

            {filters.source !== 'native' && (
              <>
                <div className="h-5 w-px bg-[#E5E7EB] mx-2" />
                {BP_TYPE_TABS.map((t) => (
                  <FilterTab
                    key={String(t.id)}
                    active={filters.bpTypeId === t.id}
                    label={t.label}
                    onClick={() => setFilters((f) => ({ ...f, bpTypeId: t.id, source: t.id === null ? f.source : 'bp_import' }))}
                  />
                ))}
              </>
            )}
          </div>

          {/* Status + search */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilters((f) => ({ ...f, status: s }))}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold capitalize border transition',
                    filters.status === s
                      ? 'bg-[#1E9A80] text-white border-[#1E9A80]'
                      : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F3F3EE]',
                  )}
                >
                  {s === 'all' ? 'All statuses' : s}
                  {s !== 'all' && counts.byStatus[s] !== undefined && (
                    <span className="ml-1.5 opacity-70">{counts.byStatus[s]}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 max-w-[400px] ml-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by recipient, company, title, email..."
                className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-[10px] text-sm bg-white focus:outline-none focus:border-[#1E9A80] focus:ring-2 focus:ring-[#1E9A80]/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-[1680px] mx-auto px-6 py-6">
        <Card className="border-[#E5E7EB]">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signed</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-[#6B7280] mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-[#6B7280] py-16">
                      No agreements match your filters. {counts.bp === 0 && (
                        <>
                          <br />
                          <span className="text-xs">Click <b>Sync now</b> above to import from Better Proposals.</span>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className="cursor-pointer hover:bg-[#F3F3EE]/60"
                    >
                      <TableCell>
                        <span className="text-xs font-semibold text-[#525252]">
                          {r.bp_type_id !== null ? BP_TYPE_LABELS[r.bp_type_id] ?? 'Doc' : 'Native'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-[#1A1A1A] max-w-[280px] truncate">
                        {r.title}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="text-[#1A1A1A]">{r.signer_name || r.recipient_name || '—'}</div>
                        {r.signer_email && (
                          <div className="text-xs text-[#9CA3AF]">{r.signer_email}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-[#6B7280] max-w-[180px] truncate">
                        {r.company_name || '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {r.amount > 0 ? `${r.currency} ${Number(r.amount).toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs capitalize', STATUS_COLORS[r.status])}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[#6B7280]">
                        {r.signed_at ? new Date(r.signed_at).toLocaleDateString('en-GB') : '—'}
                      </TableCell>
                      <TableCell>
                        {r.source === 'bp_import' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-600 border border-purple-200">
                            BP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            Native
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {rows.length === 500 && (
          <p className="text-xs text-[#9CA3AF] text-center mt-3">
            Showing first 500 records. Refine filters to narrow.
          </p>
        )}
      </div>

      {selectedId && (
        <DetailPanel id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function FilterTab({ active, label, count, onClick }: { active: boolean; label: string; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-sm font-medium transition',
        active
          ? 'bg-[#1A1A1A] text-white'
          : 'text-[#6B7280] hover:bg-[#F3F3EE] hover:text-[#1A1A1A]',
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn('ml-1.5 text-xs', active ? 'opacity-80' : 'opacity-60')}>{count}</span>
      )}
    </button>
  );
}

function LastSyncBadge({ run }: { run: ReturnType<typeof useLastImportRun>['run'] }) {
  if (!run) {
    return (
      <div className="text-xs text-[#9CA3AF] hidden sm:block">
        Never synced
      </div>
    );
  }
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

function DetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { row, loading } = useArchiveDetail(id);
  const [signedHtmlUrl, setSignedHtmlUrl] = useState<string | null>(null);

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
      <div
        className="flex-1 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
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
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={cn('text-xs capitalize', STATUS_COLORS[row.status])}>
                    {row.status}
                  </Badge>
                  <span className="text-xs text-[#9CA3AF]">
                    {row.bp_type_id !== null ? BP_TYPE_LABELS[row.bp_type_id] ?? 'Doc' : 'Native agreement'}
                  </span>
                  <span className="text-xs text-[#9CA3AF]">·</span>
                  <span className="text-xs text-[#9CA3AF] font-mono">
                    {row.source === 'bp_import' ? `BP #${row.bp_id}` : row.token}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#1A1A1A] truncate">{row.title}</h2>
                <p className="text-sm text-[#6B7280]">
                  {row.recipient_name || row.signer_name || row.company_name || 'No recipient'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[#F3F3EE] text-[#6B7280]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metadata grid */}
            <div className="px-6 py-4 border-b border-[#E5E7EB] grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-sm">
              <MetaItem label="Amount" value={row.amount > 0 ? `${row.currency} ${Number(row.amount).toLocaleString()}` : '—'} />
              <MetaItem label="Sent" value={row.date_sent ? new Date(row.date_sent).toLocaleDateString('en-GB') : '—'} />
              <MetaItem label="Signed" value={row.signed_at ? new Date(row.signed_at).toLocaleDateString('en-GB') : '—'} />
              <MetaItem label="Signer" value={row.signer_name || '—'} />
              <MetaItem label="Signer email" value={row.signer_email || '—'} />
              <MetaItem label="Recipient" value={row.recipient_name || '—'} />
              <MetaItem label="Company" value={row.company_name || '—'} />
              <MetaItem label="Imported" value={row.imported_at ? new Date(row.imported_at).toLocaleString('en-GB') : '—'} />
            </div>

            {/* Actions */}
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
              {row.terms_html && (
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

            {/* Document body */}
            <div className="flex-1 overflow-hidden">
              {row.terms_html ? (
                <iframe
                  title={row.title}
                  srcDoc={row.terms_html}
                  sandbox="allow-same-origin"
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="p-6 text-sm text-[#6B7280] flex items-center gap-2">
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
