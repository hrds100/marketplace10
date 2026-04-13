import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table';
import { Upload, CheckCircle, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SmsContact } from '../../types';

interface CsvImportDialogProps {
  open: boolean;
  onClose: () => void;
  existingContacts: SmsContact[];
  onImport?: (rows: { phone_number: string; display_name?: string }[]) => Promise<void>;
}

interface ParsedRow {
  name?: string;
  phone?: string;
  [key: string]: string | undefined;
}

type Step = 'upload' | 'preview' | 'duplicates' | 'success';

export default function CsvImportDialog({ open, onClose, existingContacts, onImport }: CsvImportDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    setStep('upload');
    setRows([]);
    setDuplicateCount(0);
    setImportedCount(0);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function normaliseRows(raw: ParsedRow[]): ParsedRow[] {
    if (raw.length === 0) return raw;
    const firstKeys = Object.keys(raw[0]);
    // Find phone column — matches: phone, phone number, phone_number, mobile, tel, telephone, contact
    const phoneKey = firstKeys.find((k) =>
      /^(phone[\s_]?number?|mobile|tel(ephone)?|contact[\s_]?number?)$/i.test(k.trim())
    ) || firstKeys.find((k) => /phone|mobile|tel/i.test(k));
    // Find name column — matches: name, full name, contact name, first name, display name
    const nameKey = firstKeys.find((k) =>
      /^(full[\s_]?name|contact[\s_]?name|display[\s_]?name|first[\s_]?name|name)$/i.test(k.trim())
    ) || firstKeys.find((k) => /name/i.test(k));

    if (!phoneKey) return raw; // can't map, return as-is

    return raw.map((row) => ({
      ...row,
      phone: row[phoneKey]?.trim() || undefined,
      name: nameKey ? (row[nameKey]?.trim() || undefined) : undefined,
    }));
  }

  function parseFile(file: File) {
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setRows(normaliseRows(result.data));
        setStep('preview');
      },
    });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) parseFile(file);
  }

  function checkDuplicates() {
    const existingPhones = new Set(existingContacts.map((c) => c.phoneNumber));
    const dupes = rows.filter((r) => r.phone && existingPhones.has(r.phone));
    setDuplicateCount(dupes.length);
    setStep('duplicates');
  }

  async function handleImport(skipDuplicates: boolean) {
    const existingPhones = new Set(existingContacts.map((c) => c.phoneNumber));
    const toImport = skipDuplicates
      ? rows.filter((r) => r.phone && !existingPhones.has(r.phone))
      : rows.filter((r) => r.phone);

    if (onImport && toImport.length > 0) {
      try {
        await onImport(
          toImport.map((r) => ({
            phone_number: r.phone!,
            display_name: r.name || undefined,
          }))
        );
      } catch {
        // Error handled by hook toast
      }
    }

    setImportedCount(toImport.length);
    setStep('success');
  }

  const previewRows = rows.slice(0, 5);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A]">Import Contacts from CSV</DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl transition-colors',
              dragOver ? 'border-[#1E9A80] bg-[#ECFDF5]' : 'border-[#E5E7EB] bg-[#F3F3EE]/50'
            )}
          >
            <Upload className="h-10 w-10 text-[#9CA3AF] mb-3" />
            <p className="text-sm font-medium text-[#1A1A1A] mb-1">
              Drag and drop a CSV file here
            </p>
            <p className="text-xs text-[#6B7280] mb-4">or click to browse</p>
            <label className="cursor-pointer">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-[#E5E7EB]"
                asChild
              >
                <span>Choose File</span>
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <p className="text-sm text-[#6B7280]">
              Found <span className="font-semibold text-[#1A1A1A]">{rows.length}</span> rows.
              Preview (first 5):
            </p>
            <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F3F3EE]">
                    {columns.map((col) => (
                      <TableHead key={col} className="text-xs font-semibold text-[#1A1A1A]">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {columns.map((col) => (
                        <TableCell key={col} className="text-sm text-[#6B7280]">
                          {row[col] || '--'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Step 3: Duplicates */}
        {step === 'duplicates' && (
          <div className="flex flex-col items-center py-6 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-[#F59E0B]" />
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">
                Found {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-[#6B7280] mt-1">
                {duplicateCount > 0
                  ? 'These phone numbers already exist in your contacts.'
                  : 'No duplicates detected. All rows are new.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleImport(true)}
                className="rounded-lg border-[#E5E7EB]"
              >
                Skip duplicates
              </Button>
              <Button
                size="sm"
                onClick={() => handleImport(false)}
                className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
              >
                Import anyway
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-[#1E9A80] mb-3" />
            <p className="text-lg font-medium text-[#1A1A1A]">Import complete</p>
            <p className="text-sm text-[#6B7280] mt-1">
              {importedCount} contact{importedCount !== 1 ? 's' : ''} imported successfully.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'preview' && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
                className="rounded-lg border-[#E5E7EB]"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={checkDuplicates}
                className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          {step === 'success' && (
            <Button
              onClick={handleClose}
              className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
            >
              Done
            </Button>
          )}
          {step === 'upload' && (
            <Button
              variant="outline"
              onClick={handleClose}
              className="rounded-lg border-[#E5E7EB]"
            >
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
