import { useState } from 'react';
import { X, Upload, FileText, Users, Lock } from 'lucide-react';
import { MOCK_AGENTS } from '../../data/mockAgents';
import { ACTIVE_PIPELINE } from '../../data/mockPipelines';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Bulk CSV upload + assign-to-user. In Phase 1 this will POST to
 * wk-leads-import which:
 *   - parses CSV
 *   - creates wk_contacts rows (visibility = ownerAgentId)
 *   - inserts wk_lead_assignments
 *   - kicks wk-leads-distribute if mode=round_robin
 */
export default function BulkUploadModal({ open, onClose }: Props) {
  const [step, setStep] = useState<'pick' | 'review' | 'done'>('pick');
  const [assignTo, setAssignTo] = useState<string>('round_robin');
  const [stageId, setStageId] = useState<string>(ACTIVE_PIPELINE.columns[0].id);
  const [tags, setTags] = useState<string>('imported');

  if (!open) return null;

  const reset = () => {
    setStep('pick');
    setAssignTo('round_robin');
    setStageId(ACTIVE_PIPELINE.columns[0].id);
    setTags('imported');
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-[640px] bg-white rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.18)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-[#1A1A1A]">Bulk import contacts</h3>
            <p className="text-[11px] text-[#6B7280]">
              CSV → assign to user → only that user + admins can see them
            </p>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded hover:bg-[#F3F3EE]"
          >
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>

        {step === 'pick' && (
          <>
            <div className="p-5 space-y-4">
              <label className="block border-2 border-dashed border-[#E5E7EB] rounded-2xl p-8 text-center cursor-pointer hover:border-[#1E9A80] hover:bg-[#ECFDF5]/30 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={() => setStep('review')}
                />
                <Upload className="w-7 h-7 text-[#9CA3AF] mx-auto mb-2" />
                <div className="text-[14px] font-medium text-[#1A1A1A]">
                  Drop CSV or click to browse
                </div>
                <div className="text-[11px] text-[#6B7280] mt-0.5">
                  Required cols: name, phone · Optional: email, tags, custom fields
                </div>
              </label>
              <button
                onClick={() => setStep('review')}
                className="text-[11px] text-[#1E9A80] hover:underline"
              >
                Skip · use mock CSV (112 rows)
              </button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#ECFDF5] border border-[#1E9A80]/30 rounded-[10px]">
                <FileText className="w-4 h-4 text-[#1E9A80]" />
                <div className="flex-1 text-[12px]">
                  <span className="font-semibold text-[#1A1A1A]">
                    landlords-april-2026.csv
                  </span>
                  <span className="text-[#6B7280] ml-2">
                    · 112 rows · 3 duplicates skipped · 0 errors
                  </span>
                </div>
              </div>

              <div>
                <Label icon={<Users className="w-3.5 h-3.5" />}>
                  Assign to
                </Label>
                <select
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px] bg-white"
                >
                  <option value="round_robin">Round-robin across all agents</option>
                  <option value="pull">Shared queue (agents pull)</option>
                  <optgroup label="Specific agent (only they + admins see)">
                    {MOCK_AGENTS.filter((a) => !a.isAdmin).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {assignTo !== 'round_robin' && assignTo !== 'pull' && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#1E9A80]">
                    <Lock className="w-3 h-3" />
                    Visibility: only{' '}
                    {MOCK_AGENTS.find((a) => a.id === assignTo)?.name} + admins
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Initial stage</Label>
                  <select
                    value={stageId}
                    onChange={(e) => setStageId(e.target.value)}
                    className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px] bg-white"
                  >
                    {ACTIVE_PIPELINE.columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px]"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-[#F3F3EE]/50 border-t border-[#E5E7EB] flex justify-between">
              <button
                onClick={() => setStep('pick')}
                className="text-[12px] text-[#6B7280] hover:text-[#1A1A1A]"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep('done')}
                className="bg-[#1E9A80] text-white text-[13px] font-semibold px-4 py-2 rounded-[10px] hover:bg-[#1E9A80]/90 shadow-[0_4px_12px_rgba(30,154,128,0.35)]"
              >
                Import 112 contacts
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#ECFDF5] text-[#1E9A80] flex items-center justify-center mx-auto mb-3 text-[24px]">
              ✓
            </div>
            <h3 className="text-[16px] font-semibold text-[#1A1A1A]">
              112 contacts imported
            </h3>
            <p className="text-[12px] text-[#6B7280] mt-1">
              Assigned to{' '}
              {assignTo === 'round_robin'
                ? '5 agents (round-robin)'
                : assignTo === 'pull'
                  ? 'shared queue'
                  : MOCK_AGENTS.find((a) => a.id === assignTo)?.name}
            </p>
            <button
              onClick={close}
              className="mt-4 bg-[#1E9A80] text-white text-[13px] font-semibold px-5 py-2 rounded-[10px]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Label({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1 flex items-center gap-1">
      {icon}
      {children}
    </div>
  );
}
