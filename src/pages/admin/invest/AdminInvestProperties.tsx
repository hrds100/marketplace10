import { useState } from 'react';
import { Plus, Pencil, ChevronDown } from 'lucide-react';
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
  pricePerShare: number;
  totalShares: number;
  sharesSold: number;
  yield: number;
  monthlyRent: number;
  propertyValue: number;
  type: string;
  beds: number;
  baths: number;
  area: number;
  yearBuilt: number;
  description: string;
  status: 'open' | 'funded' | 'closed';
  blockchainPropertyId: number;
}

const initialProperties: Property[] = [
  {
    id: 1, title: 'Seseh Beachfront Villa', location: 'Bali', country: 'Indonesia',
    pricePerShare: 100, totalShares: 1000, sharesSold: 720, yield: 12.4,
    monthlyRent: 4200, propertyValue: 100000, type: 'Villa',
    beds: 3, baths: 2, area: 180, yearBuilt: 2023,
    description: 'Luxury beachfront villa in Seseh, Bali with stunning ocean views and private pool.',
    status: 'open', blockchainPropertyId: 1,
  },
  {
    id: 2, title: 'Marina Gate Apartment', location: 'Dubai', country: 'UAE',
    pricePerShare: 250, totalShares: 800, sharesSold: 800, yield: 9.8,
    monthlyRent: 8500, propertyValue: 200000, type: 'Apartment',
    beds: 2, baths: 2, area: 120, yearBuilt: 2024,
    description: 'Premium apartment in Dubai Marina with full marina views and premium amenities.',
    status: 'funded', blockchainPropertyId: 2,
  },
  {
    id: 3, title: 'KAEC Waterfront Residence', location: 'Saudi Arabia', country: 'Saudi Arabia',
    pricePerShare: 150, totalShares: 1200, sharesSold: 340, yield: 14.2,
    monthlyRent: 6800, propertyValue: 180000, type: 'Residence',
    beds: 4, baths: 3, area: 220, yearBuilt: 2025,
    description: 'Waterfront residence in King Abdullah Economic City with modern design and smart home features.',
    status: 'open', blockchainPropertyId: 3,
  },
];

const emptyProperty: Property = {
  id: 0, title: '', location: '', country: '', pricePerShare: 0, totalShares: 0,
  sharesSold: 0, yield: 0, monthlyRent: 0, propertyValue: 0, type: 'Villa',
  beds: 0, baths: 0, area: 0, yearBuilt: 2025, description: '',
  status: 'open', blockchainPropertyId: 0,
};

const statusColors: Record<string, string> = {
  open: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  funded: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  closed: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

export default function AdminInvestProperties() {
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [form, setForm] = useState<Property>(emptyProperty);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyProperty, id: Math.max(...properties.map((p) => p.id)) + 1 });
    setModalOpen(true);
  };

  const openEdit = (p: Property) => {
    setEditing(p);
    setForm({ ...p });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editing) {
      setProperties((prev) => prev.map((p) => (p.id === form.id ? form : p)));
    } else {
      setProperties((prev) => [...prev, form]);
    }
    setModalOpen(false);
  };

  const updateField = (field: keyof Property, value: string | number) => {
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
              {properties.map((p) => {
                const fundedPct = Math.round((p.sharesSold / p.totalShares) * 100);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground">{p.location}</TableCell>
                    <TableCell className="text-right">${p.pricePerShare}</TableCell>
                    <TableCell className="text-right">{p.totalShares.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{p.sharesSold.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">{p.yield}%</TableCell>
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

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Property' : 'Add Property'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Title</label>
              <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.title} onChange={(e) => updateField('title', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Location</label>
              <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.location} onChange={(e) => updateField('location', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Country</label>
              <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.country} onChange={(e) => updateField('country', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Price Per Share ($)</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.pricePerShare} onChange={(e) => updateField('pricePerShare', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Total Shares</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.totalShares} onChange={(e) => updateField('totalShares', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Annual Yield (%)</label>
              <input type="number" step="0.1" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.yield} onChange={(e) => updateField('yield', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Monthly Rent ($)</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.monthlyRent} onChange={(e) => updateField('monthlyRent', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Property Value ($)</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.propertyValue} onChange={(e) => updateField('propertyValue', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Type</label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.type} onChange={(e) => updateField('type', e.target.value)}>
                <option>Villa</option>
                <option>Apartment</option>
                <option>Residence</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Beds</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.beds} onChange={(e) => updateField('beds', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Baths</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.baths} onChange={(e) => updateField('baths', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Area (m²)</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.area} onChange={(e) => updateField('area', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Year Built</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.yearBuilt} onChange={(e) => updateField('yearBuilt', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Status</label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.status} onChange={(e) => updateField('status', e.target.value as Property['status'])}>
                <option value="open">Open</option>
                <option value="funded">Funded</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Blockchain Property ID</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.blockchainPropertyId} onChange={(e) => updateField('blockchainPropertyId', Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <textarea className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none" value={form.description} onChange={(e) => updateField('description', e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Property'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
