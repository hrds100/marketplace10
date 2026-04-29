// BulkUploadModal — CSV → wk_contacts batch insert.
// Expected columns (case-insensitive): name, phone, email. Extra
// columns are ignored. Phone is required; rows without phone are
// skipped and reported.

import { useState } from 'react';
import { X, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCallerToasts } from '../../store/toastsProvider';

interface Props {
  open: boolean;
  onClose: () => void;
  onUploaded?: () => void;
}

interface ParsedRow {
  name: string | null;
  phone: string;
  email: string | null;
}

function parseCsv(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], errors: ['Empty file.'] };
  const header = lines[0].split(',').map((s) => s.trim().toLowerCase());
  const nameIdx = header.indexOf('name');
  const phoneIdx = header.indexOf('phone');
  const emailIdx = header.indexOf('email');
  if (phoneIdx === -1) {
    return { rows: [], errors: ['Header must include a `phone` column.'] };
  }
  const rows: ParsedRow[] = [];
  const errors: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((s) => s.trim());
    const phone = cols[phoneIdx] ?? '';
    if (!phone) {
      errors.push(`Row ${i + 1}: missing phone — skipped`);
      continue;
    }
    rows.push({
      name: nameIdx >= 0 ? cols[nameIdx] || null : null,
      phone,
      email: emailIdx >= 0 ? cols[emailIdx] || null : null,
    });
  }
  return { rows, errors };
}

export default function BulkUploadModal({ open, onClose, onUploaded }: Props) {
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    inserted: number;
    failed: number;
  } | null>(null);
  const toasts = useCallerToasts();

  if (!open) return null;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const { rows, errors } = parseCsv(text);
    setParsed(rows);
    setParseErrors(errors);
    setUploadResult(null);
  };

  const onUpload = async () => {
    if (!parsed || parsed.length === 0) return;
    setUploading(true);
    let inserted = 0;
    let failed = 0;
    const batchSize = 100;
    for (let i = 0; i < parsed.length; i += batchSize) {
      const batch = parsed.slice(i, i + batchSize).map((r) => ({
        name: r.name,
        phone: r.phone,
        email: r.email,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: e, data } = await (supabase.from('wk_contacts' as any) as any)
        .insert(batch)
        .select('id');
      if (e) {
        failed += batch.length;
      } else {
        inserted += (data ?? []).length;
      }
    }
    setUploadResult({ inserted, failed });
    setUploading(false);
    if (inserted > 0) {
      toasts.push(`Imported ${inserted} contacts`, 'success');
      onUploaded?.();
    }
    if (failed > 0) {
      toasts.push(`${failed} rows failed to insert`, 'error');
    }
  };

  const close = () => {
    setParsed(null);
    setParseErrors([]);
    setUploadResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
          <h2 className="text-[15px] font-bold text-[#1A1A1A] inline-flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Bulk upload contacts
          </h2>
          <button
            type="button"
            onClick={close}
            className="text-[#9CA3AF] hover:text-[#1A1A1A] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="text-[12px] text-[#6B7280] leading-relaxed">
            Upload a CSV. The header must contain a <code>phone</code> column;
            optional columns: <code>name</code>, <code>email</code>. Extra columns
            are ignored.
          </div>

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="text-[12px] block w-full"
          />

          {parseErrors.length > 0 && (
            <div className="text-[11px] text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded-[8px] px-3 py-2 max-h-[120px] overflow-y-auto">
              <div className="font-semibold mb-1">Parse warnings</div>
              <ul className="list-disc pl-4">
                {parseErrors.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {parsed && parsed.length > 0 && (
            <div className="text-[12px] text-[#1A1A1A] bg-[#F3F3EE] rounded-[10px] px-3 py-2">
              Ready to import <strong>{parsed.length}</strong> rows.
            </div>
          )}

          {uploadResult && (
            <div
              className={`text-[12px] rounded-[10px] px-3 py-2 inline-flex items-center gap-2 ${uploadResult.failed === 0 ? 'bg-[#ECFDF5] text-[#065F46]' : 'bg-[#FEF2F2] text-[#B91C1C]'}`}
            >
              {uploadResult.failed === 0 ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              Imported {uploadResult.inserted} · failed {uploadResult.failed}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            onClick={close}
            className="text-[12px] font-semibold text-[#6B7280] px-3 py-1.5 hover:text-[#1A1A1A]"
          >
            {uploadResult ? 'Done' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => void onUpload()}
            disabled={!parsed || parsed.length === 0 || uploading}
            className="inline-flex items-center gap-2 text-[12px] font-semibold text-white bg-[#1E9A80] px-3 py-1.5 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {uploading ? 'Uploading…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
