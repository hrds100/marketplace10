import { useState, useRef } from 'react';
import { Plus, Pencil, ChevronDown, Loader2, Upload, X, ImageIcon } from 'lucide-react';
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
  image?: string;
  images?: string[];
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

const emptyProperty: Omit<Property, 'id'> & { id?: number } = {
  title: '', location: '', country: '', price_per_share: 0, total_shares: 0,
  shares_sold: 0, annual_yield: 0, monthly_rent: 0, property_value: 0, type: 'Villa',
  bedrooms: 0, bathrooms: 0, area: 0, year_built: 2025, description: '',
  status: 'open', blockchain_property_id: 0, image: '', images: [],
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
  const [uploading, setUploading] = useState(false);
  const mainImageRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyProperty });
    setMainImageFile(null);
    setMainImagePreview(null);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setModalOpen(true);
  };

  const openEdit = (p: Property) => {
    setEditing(p);
    setForm({ ...p });
    setMainImageFile(null);
    setMainImagePreview(p.image || null);
    setGalleryFiles([]);
    setGalleryPreviews(p.images || []);
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
      // Remove from existing images array in form
      const currentImages = (form.images as string[]) || [];
      const updated = currentImages.filter((_, i) => i !== index);
      setForm(prev => ({ ...prev, images: updated }));
    } else {
      // Remove from newly added files
      const fileIndex = index - existingCount;
      setGalleryFiles(prev => prev.filter((_, i) => i !== fileIndex));
    }
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
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

      if (editing) {
        const { id, ...updates } = form;
        await updateProperty.mutateAsync({ id: editing.id, ...updates, image: mainImageUrl, images: allImages });
      } else {
        const { id, ...newProp } = form;
        await createProperty.mutateAsync({ ...newProp, image: mainImageUrl, images: allImages });
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
