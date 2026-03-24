import { useState, useRef } from 'react';
import { Plus, Pencil, Loader2, Upload, X, ImageIcon, Link2, Trash2, Download, FileText } from 'lucide-react';
import { useInvestProperties, useCreateProperty, useUpdateProperty } from '@/hooks/useInvestData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocEntry {
  name: string;
  url: string;
  path: string;
}

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
  occupancy_rate: number;
  status: 'open' | 'funded' | 'closed';
  blockchain_property_id: number;
  rent_cost: number;
  image?: string;
  images?: string[];
  highlights?: string[];
  documents?: string[];
  appreciation_rate?: number;
  property_docs?: DocEntry[];
}

async function uploadImage(file: File, propertyId: number): Promise<string> {
  const fileName = `${propertyId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('property-images')
    .upload(fileName, file, { cacheControl: '3600', upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage
    .from('property-images')
    .getPublicUrl(data.path);
  return publicUrl;
}

async function uploadDoc(file: File, propertyId: number): Promise<DocEntry> {
  const path = `${propertyId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('inv-property-docs')
    .upload(path, file, { cacheControl: '3600', upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage
    .from('inv-property-docs')
    .getPublicUrl(data.path);
  return { name: file.name, url: publicUrl, path: data.path };
}

const emptyProperty: Omit<Property, 'id'> & { id?: number } = {
  title: '', location: '', country: '', price_per_share: 0, total_shares: 0,
  shares_sold: 0, annual_yield: 0, monthly_rent: 0, property_value: 0, type: 'Villa',
  bedrooms: 0, bathrooms: 0, area: 0, year_built: 2025, description: '',
  occupancy_rate: 0, status: 'open', blockchain_property_id: 0, rent_cost: 0,
  image: '', images: [], highlights: [], documents: [], appreciation_rate: 5.2, property_docs: [],
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
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [highlightInput, setHighlightInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const mainImageRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyProperty });
    setMainImageFile(null);
    setMainImagePreview(null);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setDocFiles([]);
    setHighlightInput('');
    setModalOpen(true);
  };

  const openEdit = (p: Property) => {
    setEditing(p);
    setForm({ ...p });
    setMainImageFile(null);
    setMainImagePreview(p.image || null);
    setGalleryFiles([]);
    setGalleryPreviews(p.images || []);
    setDocFiles([]);
    setHighlightInput('');
    setModalOpen(true);
  };

  const handleMainImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMainImageFile(file);
    setMainImagePreview(URL.createObjectURL(file));
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setGalleryFiles(prev => [...prev, ...files]);
    setGalleryPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeGalleryImage = (index: number) => {
    const existingCount = (editing?.images || []).length;
    if (index < existingCount) {
      const currentImages = (form.images as string[]) || [];
      const updated = currentImages.filter((_, i) => i !== index);
      setForm(prev => ({ ...prev, images: updated }));
    } else {
      const fileIndex = index - existingCount;
      setGalleryFiles(prev => prev.filter((_, i) => i !== fileIndex));
    }
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addHighlight = () => {
    const text = highlightInput.trim();
    if (!text) return;
    const current = (form.highlights as string[]) || [];
    setForm(prev => ({ ...prev, highlights: [...current, text] }));
    setHighlightInput('');
  };

  const removeHighlight = (index: number) => {
    const current = (form.highlights as string[]) || [];
    setForm(prev => ({ ...prev, highlights: current.filter((_, i) => i !== index) }));
  };

  const removeDoc = async (index: number) => {
    const docs = (form.property_docs as DocEntry[]) || [];
    const doc = docs[index];
    try {
      if (doc.path) {
        await supabase.storage.from('inv-property-docs').remove([doc.path]);
      }
    } catch {
      // non-fatal — still remove from form
    }
    setForm(prev => ({
      ...prev,
      property_docs: docs.filter((_, i) => i !== index),
    }));
  };

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setUploading(true);
      const propertyId = editing?.id || Date.now();

      // Upload main image if a new file was selected
      let mainImageUrl = form.image as string;
      if (mainImageFile) {
        try {
          mainImageUrl = await uploadImage(mainImageFile, propertyId);
        } catch (err) {
          toast.error('Failed to upload main image');
          setUploading(false);
          return;
        }
      }

      // Upload gallery images (new files only)
      const existingImages = editing ? ((form.images as string[]) || []) : [];
      const newGalleryUrls: string[] = [];
      for (const file of galleryFiles) {
        try {
          const url = await uploadImage(file, propertyId);
          newGalleryUrls.push(url);
        } catch (err) {
          toast.error(`Failed to upload ${file.name}`);
          setUploading(false);
          return;
        }
      }
      const allImages = [...existingImages, ...newGalleryUrls];

      // Upload new document files
      const existingDocs = (form.property_docs as DocEntry[]) || [];
      const newDocEntries: DocEntry[] = [];
      for (const file of docFiles) {
        try {
          const entry = await uploadDoc(file, propertyId);
          newDocEntries.push(entry);
        } catch {
          toast.error(`Failed to upload ${file.name}`);
          setUploading(false);
          return;
        }
      }
      const allDocs = [...existingDocs, ...newDocEntries];

      if (editing) {
        const { id, ...updates } = form;
        await updateProperty.mutateAsync({
          id: editing.id,
          ...updates,
          image: mainImageUrl,
          images: allImages,
          property_docs: allDocs,
        });
      } else {
        const { id, ...newProp } = form;
        await createProperty.mutateAsync({
          ...newProp,
          image: mainImageUrl,
          images: allImages,
          property_docs: allDocs,
        });
      }
      setUploading(false);
      setModalOpen(false);
      toast.success(editing ? 'Property updated' : 'Property created');
    } catch (err) {
      setUploading(false);
      console.error('Failed to save property:', err);
      toast.error('Failed to save property');
    }
  };

  return (
    <div data-feature="ADMIN__INVEST">
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
          <Table data-feature="ADMIN__INVEST_PROPERTIES_TABLE">
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
                      <Button data-feature="ADMIN__INVEST_PROPERTIES_EDIT" variant="ghost" size="sm" onClick={() => openEdit(p)}>
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

          {/* ── Blockchain Data (read-only) ─────────────────────── */}
          {editing && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 mb-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                  From Blockchain — read only
                </span>
                <Link2 className="w-3 h-3 text-emerald-500 ml-auto" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Shares', value: (form.total_shares as number)?.toLocaleString() ?? '—' },
                  { label: 'Shares Sold', value: (form.shares_sold as number)?.toLocaleString() ?? '—' },
                  {
                    label: 'Remaining',
                    value: ((form.total_shares as number) - (form.shares_sold as number))?.toLocaleString() ?? '—',
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-background/60 border border-emerald-500/20 px-3 py-2">
                    <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" />
                      {label}
                    </p>
                    <p className="text-sm font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                These values are sourced directly from the smart contract and cannot be edited here.
              </p>
            </div>
          )}

          {/* ── Editable Details ────────────────────────────────── */}
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
              <label className="text-sm font-medium text-foreground mb-1.5 block">Monthly Yield (%)</label>
              <input type="number" step="0.1" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.annual_yield as number} onChange={(e) => updateField('annual_yield', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Appreciation Rate (%)</label>
              <input type="number" step="0.1" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={(form.appreciation_rate as number) ?? 5.2} onChange={(e) => updateField('appreciation_rate', Number(e.target.value))} />
              <p className="text-[11px] text-muted-foreground mt-1">Used in the 5-year projection calculator</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Monthly Rent ($)</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.monthly_rent as number} onChange={(e) => updateField('monthly_rent', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Rent Cost (GBP)</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.rent_cost as number} onChange={(e) => updateField('rent_cost', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Property Value ($)</label>
              <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.property_value as number} onChange={(e) => updateField('property_value', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Occupancy Rate (%)</label>
              <input type="number" step="0.1" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.occupancy_rate as number} onChange={(e) => updateField('occupancy_rate', Number(e.target.value))} />
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

            {/* ── Highlights ──────────────────────────────────────── */}
            <div className="col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Highlights</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {((form.highlights as string[]) || []).map((h, i) => (
                  <div key={i} className="flex items-center gap-1 rounded-full border bg-muted/50 px-3 py-1 text-sm">
                    <span>{h}</span>
                    <button
                      type="button"
                      onClick={() => removeHighlight(i)}
                      className="text-muted-foreground hover:text-foreground ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm"
                  placeholder="e.g. HMO license"
                  value={highlightInput}
                  onChange={(e) => setHighlightInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHighlight(); } }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addHighlight} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
            </div>

            {/* ── Documents ───────────────────────────────────────── */}
            <div className="col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Documents</label>
              <div className="space-y-2 mb-3">
                {((form.property_docs as DocEntry[]) || []).map((doc, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{doc.name}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="ghost" size="sm">
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeDoc(i)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <input
                ref={docRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                multiple
                className="hidden"
                onChange={(e) => setDocFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => docRef.current?.click()} className="gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Upload Documents
              </Button>
              {docFiles.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">{docFiles.length} file(s) staged for upload</p>
              )}
            </div>

            {/* Main Image Upload */}
            <div className="col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Main Image</label>
              <div className="flex items-start gap-4">
                {mainImagePreview ? (
                  <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-border flex-shrink-0">
                    <img src={mainImagePreview} alt="Main" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setMainImageFile(null); setMainImagePreview(null); setForm(prev => ({ ...prev, image: '' })); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground flex-shrink-0">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <input ref={mainImageRef} type="file" accept="image/*" className="hidden" onChange={handleMainImageSelect} />
                  <Button type="button" variant="outline" size="sm" onClick={() => mainImageRef.current?.click()} className="gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Upload Image
                  </Button>
                  <p className="text-[11px] text-muted-foreground mt-1">Primary image shown on property card</p>
                </div>
              </div>
            </div>

            {/* Gallery Images Upload */}
            <div className="col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Gallery Images</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {galleryPreviews.map((src, i) => (
                  <div key={i} className="relative w-24 h-20 rounded-lg overflow-hidden border border-border">
                    <img src={src} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGallerySelect} />
              <Button type="button" variant="outline" size="sm" onClick={() => galleryRef.current?.click()} className="gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Add Gallery Images
              </Button>
              <p className="text-[11px] text-muted-foreground mt-1">Additional images for the property detail page</p>
            </div>
          </div>

          {/* Marketplace Preview — matches frontend layout */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Marketplace Preview</h4>
            <div className="rounded-2xl border bg-card overflow-hidden">
              {/* Hero image with overlay */}
              {(mainImagePreview || (form.image as string)) ? (
                <div className="relative aspect-[16/9] w-full">
                  <img
                    src={mainImagePreview || (form.image as string)}
                    alt="Preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
                    <h3 className="text-lg font-bold text-white">{(form.title as string) || 'Property Name'}</h3>
                    <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {(form.location as string) || 'Location'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="aspect-[16/9] w-full bg-muted flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                </div>
              )}

              <div className="p-4 space-y-3">
                {/* Property badges */}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px] gap-0.5">{(form.type as string) || 'Type'}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{(form.bedrooms as number) || 0} Bed</Badge>
                  <Badge variant="secondary" className="text-[10px]">{(form.bathrooms as number) || 0} Bath</Badge>
                  <Badge variant="secondary" className="text-[10px]">{(form.area as number) || 0} m&sup2;</Badge>
                  <Badge variant="secondary" className="text-[10px]">Built {(form.year_built as number) || '-'}</Badge>
                  <Badge className={cn('text-[10px]', (form.status as string) === 'open' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                    {(form.status as string) === 'open' ? 'Open for Investment' : 'Funded'}
                  </Badge>
                </div>

                {/* Metric pills — 4 columns */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Yield', value: `${(form.annual_yield as number) || 0}%` },
                    { label: 'Occupancy', value: `${(form.occupancy_rate as number) || 0}%` },
                    { label: 'Rent Cost', value: `£${((form.rent_cost as number) || 0).toLocaleString()}` },
                    { label: 'Value', value: `$${(((form.property_value as number) || 0) / 1000).toFixed(0)}k` },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg bg-muted/50 p-2 text-center">
                      <p className="text-[9px] text-muted-foreground">{m.label}</p>
                      <p className="text-xs font-bold">{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Stats row — Owners / Total Shares / Remaining */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-[9px] text-muted-foreground">Owners</p>
                    <p className="text-xs font-bold">-</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-[9px] text-muted-foreground">Total Shares</p>
                    <p className="text-xs font-bold">{((form.total_shares as number) || 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-[9px] text-muted-foreground">Remaining</p>
                    <p className="text-xs font-bold">{(((form.total_shares as number) || 0) - ((form.shares_sold as number) || 0)).toLocaleString()}</p>
                  </div>
                </div>

                {/* Funding progress */}
                <div className="space-y-1">
                  <Progress value={(() => { const t = (form.total_shares as number) || 1; const s = (form.shares_sold as number) || 0; return Math.round((s / t) * 100); })()} className="h-2" />
                  <p className="text-[10px] text-muted-foreground">
                    {((form.shares_sold as number) || 0).toLocaleString()} allocations sold &middot; {(((form.total_shares as number) || 0) - ((form.shares_sold as number) || 0)).toLocaleString()} remaining
                  </p>
                </div>

                {/* Allocation price + invest preview */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Allocation price</p>
                    <p className="text-lg font-bold">${(form.price_per_share as number) || 0}</p>
                  </div>
                  <Button size="sm" className="text-xs" disabled>
                    Secure Your Allocations
                  </Button>
                </div>

                {/* Description preview */}
                {(form.description as string) && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{form.description as string}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createProperty.isPending || updateProperty.isPending || uploading}>
              {(createProperty.isPending || updateProperty.isPending || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {uploading ? 'Uploading...' : editing ? 'Save Changes' : 'Create Property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
