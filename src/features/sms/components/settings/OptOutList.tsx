import { useState } from 'react';
import { Plus, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { SmsContact } from '../../types';
import PhoneNumber from '../shared/PhoneNumber';

interface OptOutListProps {
  contacts: SmsContact[];
}

const MOCK_OPT_OUTS = [
  { phone: '+447700100013', date: '2026-03-18', reason: 'Replied STOP' },
  { phone: '+447700200001', date: '2026-03-25', reason: 'Replied STOP' },
  { phone: '+447700200002', date: '2026-04-02', reason: 'Manual removal' },
];

export default function OptOutList({ contacts }: OptOutListProps) {
  const optedOut = contacts.filter((c) => c.optedOut);
  const allOptOuts = [
    ...optedOut.map((c) => ({ phone: c.phoneNumber, date: c.updatedAt.slice(0, 10), reason: 'Replied STOP' })),
    ...MOCK_OPT_OUTS.filter((m) => !optedOut.some((c) => c.phoneNumber === m.phone)),
  ];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [phone, setPhone] = useState('');

  function handleAdd() {
    if (!phone.trim()) return;
    toast.success('Number added to opt-out list');
    setDialogOpen(false);
    setPhone('');
  }

  if (allOptOuts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-2xl bg-[#F3F3EE] p-4 mb-4">
          <Ban className="h-8 w-8 text-[#9CA3AF]" />
        </div>
        <p className="text-[#1A1A1A] font-semibold mb-1">No opted-out numbers</p>
        <p className="text-sm text-[#6B7280] mb-4">Numbers that reply STOP will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F3F3EE]/50">
              <TableHead className="text-[#6B7280] font-medium text-xs">Phone Number</TableHead>
              <TableHead className="text-[#6B7280] font-medium text-xs">Date Opted Out</TableHead>
              <TableHead className="text-[#6B7280] font-medium text-xs">Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allOptOuts.map((entry, i) => (
              <TableRow key={`${entry.phone}-${i}`}>
                <TableCell>
                  <PhoneNumber number={entry.phone} className="text-sm text-[#1A1A1A]" />
                </TableCell>
                <TableCell className="text-sm text-[#6B7280]">{entry.date}</TableCell>
                <TableCell className="text-sm text-[#6B7280]">{entry.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} className="rounded-lg border-[#E5E7EB] text-[#6B7280]">
        <Plus className="h-4 w-4 mr-1.5" />
        Add manually
      </Button>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) setDialogOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">Add to Opt-out List</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-sm font-medium text-[#1A1A1A]">Phone number</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+447..."
              className="mt-1.5 rounded-lg border-[#E5E7EB]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="rounded-lg border-[#E5E7EB]">Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={!phone.trim()} className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
