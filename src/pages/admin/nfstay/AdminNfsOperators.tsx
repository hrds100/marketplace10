import { useState } from "react";
import { Search, CheckCircle2, XCircle, Globe, Building2, Phone, Mail, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NfsStatusBadge } from "@/components/nfstay/NfsStatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockOperatorApplications } from "@/data/nfstay/mock-admin";
import { toast } from "@/hooks/use-toast";

export default function AdminNfsOperators() {
  const [search, setSearch] = useState("");
  const [apps, setApps] = useState(mockOperatorApplications);

  const pending = apps.filter(a => a.status === 'pending');
  const approved = apps.filter(a => a.status === 'approved');
  const rejected = apps.filter(a => a.status === 'rejected');

  const handleApprove = (id: string) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' as const, reviewed_at: new Date().toISOString().split('T')[0] } : a));
    toast({ title: "Operator approved ✓", description: "They can now list properties on the platform." });
  };

  const handleReject = (id: string) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' as const, reviewed_at: new Date().toISOString().split('T')[0] } : a));
    toast({ title: "Application rejected", variant: "destructive" });
  };

  const filterList = (list: typeof apps) =>
    list.filter(a => a.business_name.toLowerCase().includes(search.toLowerCase()) || a.contact_email.toLowerCase().includes(search.toLowerCase()));

  const AppCard = ({ app }: { app: typeof apps[0] }) => (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-base">{app.business_name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Applied {app.applied_at} {app.reviewed_at ? `· Reviewed ${app.reviewed_at}` : ''}</p>
        </div>
        <NfsStatusBadge status={app.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" />{app.contact_email}</div>
        <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" />{app.contact_phone}</div>
        <div className="flex items-center gap-2 text-muted-foreground"><Globe className="w-3.5 h-3.5" />{app.country}</div>
        <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="w-3.5 h-3.5" />{app.property_count} properties</div>
      </div>

      {app.website && (
        <a href={app.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
          {app.website} <ExternalLink className="w-3 h-3" />
        </a>
      )}

      {app.notes && (
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Notes:</span> {app.notes}</p>
        </div>
      )}

      {app.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="rounded-lg gap-1 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => handleReject(app.id)}>
            <XCircle className="w-3.5 h-3.5" /> Reject
          </Button>
          <Button size="sm" className="rounded-lg gap-1" onClick={() => handleApprove(app.id)}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </Button>
        </div>
      )}
    </div>
  );

  const renderList = (list: typeof apps) => {
    const filtered = filterList(list);
    return filtered.length === 0
      ? <p className="text-sm text-muted-foreground text-center py-8">No applications found.</p>
      : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map(a => <AppCard key={a.id} app={a} />)}</div>;
  };

  return (
    <div className="p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Operator Management</h1>
        <p className="text-sm text-muted-foreground">{apps.length} total applications · {pending.length} pending</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search operators..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg" />
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          <TabsTrigger value="all">All ({apps.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">{renderList(pending)}</TabsContent>
        <TabsContent value="approved" className="mt-4">{renderList(approved)}</TabsContent>
        <TabsContent value="rejected" className="mt-4">{renderList(rejected)}</TabsContent>
        <TabsContent value="all" className="mt-4">{renderList(apps)}</TabsContent>
      </Tabs>
    </div>
  );
}
