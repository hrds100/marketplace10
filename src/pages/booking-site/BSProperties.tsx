import { useState, useEffect } from 'react';
import { Building2, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import { supabase } from '@/integrations/supabase/client';

export default function BSProperties() {
  const { isAdmin } = useAuth();
  const { operator } = useNfsOperator();
  const [properties, setProperties] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin && !operator?.id) return;
    setLoading(true);

    const query = isAdmin
      ? (supabase.from('nfs_properties') as any)
          .select('id, name, city, status, images, operator_id, nfs_operators(brand_name)')
          .order('created_at', { ascending: false })
      : (supabase.from('nfs_properties') as any)
          .select('id, name, city, status, images')
          .eq('operator_id', operator!.id)
          .order('created_at', { ascending: false });

    query.then(({ data }: { data: Array<Record<string, unknown>> | null }) => {
      setProperties(data || []);
      setLoading(false);
    });
  }, [operator?.id, isAdmin]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-sm text-muted-foreground">{properties.length} properties managed</p>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No properties found</p>
          <p className="text-sm text-muted-foreground">Add your first property to get started</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left bg-muted/30">
                  <th className="p-4 font-medium text-muted-foreground">Property</th>
                  {isAdmin && <th className="p-4 font-medium text-muted-foreground">Operator</th>}
                  <th className="p-4 font-medium text-muted-foreground">Location</th>
                  <th className="p-4 font-medium text-muted-foreground">Status</th>
                  <th className="p-4 font-medium text-muted-foreground w-12"></th>
                </tr>
              </thead>
              <tbody>
                {properties.map((prop) => {
                  const images = (prop.images as string[]) || [];
                  const opData = prop.nfs_operators as Record<string, unknown> | null;
                  return (
                    <tr key={String(prop.id)} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {images[0] ? (
                            <img src={String(images[0])} alt={String(prop.name)} className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{String(prop.name || 'Unnamed')}</p>
                          </div>
                        </div>
                      </td>
                      {isAdmin && <td className="p-4 text-muted-foreground">{opData ? String(opData.brand_name || 'Unknown') : '-'}</td>}
                      <td className="p-4 text-muted-foreground">{String(prop.city || '-')}</td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${prop.status === 'active' || prop.status === 'listed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {String(prop.status || 'draft')}
                        </span>
                      </td>
                      <td className="p-4">
                        <button className="p-1.5 rounded-lg hover:bg-secondary">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
