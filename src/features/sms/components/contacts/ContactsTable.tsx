import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { SmsContact, SmsLabel, SmsPipelineStage } from '../../types';
import LabelBadge from '../shared/LabelBadge';
import PhoneNumber from '../shared/PhoneNumber';

interface ContactsTableProps {
  contacts: SmsContact[];
  labels: SmsLabel[];
  stages: SmsPipelineStage[];
  onEdit: (contact: SmsContact) => void;
  onDelete: (contactId: string) => void;
}

const PAGE_SIZE = 10;

export default function ContactsTable({
  contacts,
  labels,
  stages,
  onEdit,
  onDelete,
}: ContactsTableProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [labelFilter, setLabelFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let result = contacts;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          (c.displayName?.toLowerCase().includes(q) ?? false) ||
          c.phoneNumber.includes(q)
      );
    }

    if (labelFilter !== 'all') {
      result = result.filter((c) => c.labels.some((l) => l.id === labelFilter));
    }

    if (stageFilter !== 'all') {
      result = result.filter((c) => c.pipelineStageId === stageFilter);
    }

    return result;
  }, [contacts, search, labelFilter, stageFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  useMemo(() => setPage(0), [search, labelFilter, stageFilter]);

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="h-12 w-12 text-[#9CA3AF] mb-4" />
        <p className="text-lg font-medium text-[#1A1A1A] mb-1">No contacts yet</p>
        <p className="text-sm text-[#6B7280]">Add your first contact to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-[10px] border-[#E5E5E5]"
          />
        </div>

        <Select value={labelFilter} onValueChange={setLabelFilter}>
          <SelectTrigger className="w-full sm:w-44 rounded-[10px] border-[#E5E5E5]">
            <SelectValue placeholder="All Labels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Labels</SelectItem>
            {labels.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full sm:w-44 rounded-[10px] border-[#E5E5E5]">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F3F3EE]">
              <TableHead className="text-[#1A1A1A] font-semibold text-xs">Name</TableHead>
              <TableHead className="text-[#1A1A1A] font-semibold text-xs">Phone</TableHead>
              <TableHead className="text-[#1A1A1A] font-semibold text-xs">Labels</TableHead>
              <TableHead className="text-[#1A1A1A] font-semibold text-xs">Stage</TableHead>
              <TableHead className="text-[#1A1A1A] font-semibold text-xs">Last Message</TableHead>
              <TableHead className="text-[#1A1A1A] font-semibold text-xs">Assigned To</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-[#6B7280]">
                  No contacts match your filters.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((contact) => {
                const stage = stages.find((s) => s.id === contact.pipelineStageId);
                return (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer hover:bg-[#F3F3EE]/50 transition-colors"
                    onClick={() => navigate('/sms/inbox')}
                  >
                    <TableCell className="text-sm font-medium text-[#1A1A1A]">
                      {contact.displayName || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <PhoneNumber number={contact.phoneNumber} className="text-sm text-[#6B7280]" />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.labels.map((l) => (
                          <LabelBadge key={l.id} label={l} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {stage ? (
                        <span className="flex items-center gap-1.5 text-sm text-[#6B7280]">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: stage.colour }}
                          />
                          {stage.name}
                        </span>
                      ) : (
                        <span className="text-sm text-[#9CA3AF]">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-[#6B7280]">
                      {formatDistanceToNow(new Date(contact.updatedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-sm text-[#6B7280]">
                      {contact.assignedTo || '--'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B7280]">
          Showing {page * PAGE_SIZE + 1}--{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{' '}
          {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border-[#E5E7EB]"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border-[#E5E7EB]"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
