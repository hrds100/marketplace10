import { Clock } from 'lucide-react';
import { useRowActivity } from '../hooks/useActivity';

interface Props {
  rowId: string;
}

function formatAction(action: string): string {
  switch (action) {
    case 'row.create':
      return 'created this property';
    case 'row.update':
      return 'updated property details';
    case 'cell.update':
      return 'edited a field';
    case 'credential.update':
      return 'updated credentials';
    case 'document.upload':
      return 'uploaded a document';
    case 'document.delete':
      return 'removed a document';
    default:
      return action;
  }
}

export default function ActivityTimeline({ rowId }: Props) {
  const { data: entries = [], isLoading } = useRowActivity(rowId);

  if (isLoading) {
    return <div className="text-[13px] text-[#6B7280]">Loading activity…</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="border border-dashed border-[#E5E7EB] bg-white rounded-[12px] p-8 text-center">
        <Clock className="w-6 h-6 text-[#9CA3AF] mx-auto mb-2" />
        <div className="text-[13px] text-[#6B7280]">No activity yet</div>
      </div>
    );
  }

  return (
    <ol className="relative border-l-2 border-[#E5E7EB] ml-2 pl-6 space-y-4">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-[#1E9A80] border-2 border-white" />
          <div className="bg-white border border-[#E8E5DF] rounded-[10px] px-4 py-3">
            <div className="text-[12px] text-[#0A0A0A]">
              <span className="font-medium">Someone</span>{' '}
              <span className="text-[#6B7280]">{formatAction(e.action)}</span>
            </div>
            <div className="text-[11px] text-[#9CA3AF] mt-0.5">
              {new Date(e.created_at).toLocaleString()}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
