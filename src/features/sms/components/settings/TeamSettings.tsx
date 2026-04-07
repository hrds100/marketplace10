import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { SmsTeamMember } from '../../types';
import StatusBadge from '../shared/StatusBadge';

interface TeamSettingsProps {
  members: SmsTeamMember[];
  onAdd: (member: SmsTeamMember) => void;
  onRemove: (id: string) => void;
}

export default function TeamSettings({ members, onAdd, onRemove }: TeamSettingsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'agent'>('agent');
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

  function handleAdd() {
    if (!name.trim() || !email.trim()) return;
    onAdd({ id: `tm-${Date.now()}`, name: name.trim(), email: email.trim(), role });
    toast.success('Team member added');
    setDialogOpen(false);
    setName('');
    setEmail('');
    setRole('agent');
  }

  function handleRemove(id: string) {
    if (removeConfirm === id) {
      onRemove(id);
      toast.success('Team member removed');
      setRemoveConfirm(null);
    } else {
      setRemoveConfirm(id);
    }
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-2xl bg-[#F3F3EE] p-4 mb-4">
          <Users className="h-8 w-8 text-[#9CA3AF]" />
        </div>
        <p className="text-[#1A1A1A] font-semibold mb-1">No team members</p>
        <p className="text-sm text-[#6B7280] mb-4">Add team members to collaborate on SMS</p>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Member
        </Button>
        <AddDialog open={dialogOpen} onClose={() => setDialogOpen(false)} name={name} email={email} role={role} onNameChange={setName} onEmailChange={setEmail} onRoleChange={setRole} onSave={handleAdd} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F3F3EE]/50">
              <TableHead className="text-[#6B7280] font-medium text-xs">Name</TableHead>
              <TableHead className="text-[#6B7280] font-medium text-xs">Email</TableHead>
              <TableHead className="text-[#6B7280] font-medium text-xs">Role</TableHead>
              <TableHead className="text-[#6B7280] font-medium text-xs w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-sm font-medium text-[#1A1A1A]">{m.name}</TableCell>
                <TableCell className="text-sm text-[#6B7280]">{m.email}</TableCell>
                <TableCell>
                  <StatusBadge status={m.role === 'admin' ? 'active' : 'sent'} className="capitalize" />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(m.id)}
                    className={cn('h-7 w-7 p-0', removeConfirm === m.id ? 'text-[#EF4444]' : 'text-[#9CA3AF] hover:text-[#EF4444]')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} className="rounded-lg border-[#E5E7EB] text-[#6B7280]">
        <Plus className="h-4 w-4 mr-1.5" />
        Add Member
      </Button>

      <AddDialog open={dialogOpen} onClose={() => setDialogOpen(false)} name={name} email={email} role={role} onNameChange={setName} onEmailChange={setEmail} onRoleChange={setRole} onSave={handleAdd} />
    </div>
  );
}

function AddDialog({
  open, onClose, name, email, role, onNameChange, onEmailChange, onRoleChange, onSave,
}: {
  open: boolean; onClose: () => void;
  name: string; email: string; role: 'admin' | 'agent';
  onNameChange: (v: string) => void; onEmailChange: (v: string) => void;
  onRoleChange: (v: 'admin' | 'agent') => void; onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A]">Add Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium text-[#1A1A1A]">Name</Label>
            <Input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Full name" className="mt-1.5 rounded-lg border-[#E5E7EB]" />
          </div>
          <div>
            <Label className="text-sm font-medium text-[#1A1A1A]">Email</Label>
            <Input value={email} onChange={(e) => onEmailChange(e.target.value)} placeholder="email@example.com" type="email" className="mt-1.5 rounded-lg border-[#E5E7EB]" />
          </div>
          <div>
            <Label className="text-sm font-medium text-[#1A1A1A]">Role</Label>
            <Select value={role} onValueChange={(v) => onRoleChange(v as 'admin' | 'agent')}>
              <SelectTrigger className="mt-1.5 rounded-lg border-[#E5E7EB]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-lg border-[#E5E7EB]">Cancel</Button>
          <Button size="sm" onClick={onSave} disabled={!name.trim() || !email.trim()} className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white">
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
