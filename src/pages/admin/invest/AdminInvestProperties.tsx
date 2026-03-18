import { useState } from 'react';
import { Plus, Pencil, ChevronDown, Loader2 } from 'lucide-react';
import { useInvestProperties, useCreateProperty, useUpdateProperty } from '@/hooks/useInvestData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Property {
  id: number;
  title: string;
  location: string;
  country: string;
  price_per_share: number;
  total_shares: number;
  shares_sold: number;
  annual_yield: number;
  monthly_rent: number;
  property_value: number;
  type: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  year_built: number;
  description: string;
  status: 'open' | 'funded' | 'closed';
  blockchain_property_id: number;
}

const emptyProperty: Omit<Property, 'id'> & { id?: number } = {
  title: '', location: '', country: '', price_per_share: 0, total_shares: 0,
  shares_sold: 0, annual_yield: 0, monthly_rent: 0, property_value: 0, type: 'Villa',
  bedrooms: 0, bathrooms: 0, area: 0, year_built: 2025, description: '',
  status: 'open', blockchain_property_id: 0,
};

const statusColors: Record<string, string> = {
  open: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  funded: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  closed: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

export default function AdminInvestProperties() {
  const { data: properties = [], isLoading } = useInvestProperties();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(emptyProperty as Record<string, unknown>);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyProperty });
    setModalOpen(true);
  };

  const openEdit = (p: Property) => {
    setEditing(p);
    setForm({ ...p });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        const { id, ...updates } = form;
        await updateProperty.mutateAsync({ id: editing.id, ...updates });
      } else {
        const { id, ...newProp } = form;
        await createProperty.mutateAsync(newProp);
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to save property:', err);
    }
  };

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">Investment Properties</h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Property
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading properties...
        </div>
      ) : (
      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Price/Share</TableHead>
                <TableHead className="text-right">Total Shares</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Yield %</TableHead>
                <TableHead>Funded %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((p: Property) => {
                const fundedPct = p.total_shares ? Math.round((p.shares_sold / p.total_shares) * 100) : 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground">{p.location}</TableCell>
                    <TableCell className="text-right">${p.price_per_share}</TableCell>
                    <TableCell className="text-right">{p.total_shares.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{p.shares_sold.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">{p.annual_yield}%</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={fundedPct} className="h-2 w-20" />
                        <span className="text-xs text-muted-foreground">{fundedPct}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs capitalize', statusColors[p.status])}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Property' : 'Add Property'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Title</label>
              <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.title as string} onChange={(e) => updateField('title', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Location</label>
              <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.location as string} onChange={(e) => updateField('location', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Country</label>
              <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.country as string} onChange={(e) => updateField('country', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Price Per Share ($)</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.price_per_share as number} onChange={(e) => updateField('price_per_share', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Total Shares</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.total_shares as number} onChange={(e) => updateField('total_shares', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Annual Yield (%)</label>
              <input type="number" step="0.1" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.annual_yield as number} onChange={(e) => updateField('annual_yield', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Monthly Rent ($)</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.monthly_rent as number} onChange={(e) => updateField('monthly_rent', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Property Value ($)</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.property_value as number} onChange={(e) => updateField('property_value', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Type</label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.type as string} onChange={(e) => updateField('type', e.target.value)}>
                <option>Villa</option>
                <option>Apartment</option>
                <option>Residence</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Beds</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.bedrooms as number} onChange={(e) => updateField('bedrooms', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Baths</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.bathrooms as number} onChange={(e) => updateField('bathrooms', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Area (m²)</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.area as number} onChange={(e) => updateField('area', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Year Built</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.year_built as number} onChange={(e) => updateField('year_built', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Status</label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.status as string} onChange={(e) => updateField('status', e.target.value)}>
                <option value="open">Open</option>
                <option value="funded">Funded</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Blockchain Property ID</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.blockchain_property_id as number} onChange={(e) => updateField('blockchain_property_id', Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <textarea className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none" value={form.description as string} onChange={(e) => updateField('description', e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createProperty.isPending || updateProperty.isPending}>
              {(createProperty.isPending || updateProperty.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
