import { useState } from "react";
import { Search, MoreHorizontal, UserCheck, UserX, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NfsStatusBadge } from "@/components/nfstay/NfsStatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { mockUsers } from "@/data/nfstay/mock-admin";
import { toast } from "@/hooks/use-toast";

export default function AdminNfsUsers() {
  const [search, setSearch] = useState("");

  const all = mockUsers;
  const travelers = all.filter(u => u.role === 'traveler');
  const operators = all.filter(u => u.role === 'operator');
  const admins = all.filter(u => u.role === 'admin');

  const filterList = (list: typeof all) =>
    list.filter(u =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    );

  const UserTable = ({ data }: { data: typeof all }) => {
    const filtered = filterList(data);
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left bg-muted/30">
                <th className="p-4 font-medium text-muted-foreground">User</th>
                <th className="p-4 font-medium text-muted-foreground">Role</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Joined</th>
                <th className="p-4 font-medium text-muted-foreground">Last Active</th>
                <th className="p-4 font-medium text-muted-foreground w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No users found</td></tr>
              ) : filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                        {u.full_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4"><NfsStatusBadge status={u.role} /></td>
                  <td className="p-4"><NfsStatusBadge status={u.status} /></td>
                  <td className="p-4 text-muted-foreground">{u.created_at}</td>
                  <td className="p-4 text-muted-foreground">{u.last_sign_in || '—'}</td>
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg hover:bg-secondary"><MoreHorizontal className="w-4 h-4" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => toast({ title: "Email sent (mock)" })}><Mail className="w-4 h-4" /> Send email</DropdownMenuItem>
                        {u.status === 'active' ? (
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => toast({ title: `${u.full_name} suspended (mock)` })}><UserX className="w-4 h-4" /> Suspend</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="gap-2 text-primary" onClick={() => toast({ title: `${u.full_name} activated (mock)` })}><UserCheck className="w-4 h-4" /> Activate</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div data-feature="ADMIN__NFSTAY" className="p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">{all.length} registered users</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg" />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({all.length})</TabsTrigger>
          <TabsTrigger value="travelers">Travelers ({travelers.length})</TabsTrigger>
          <TabsTrigger value="operators">Operators ({operators.length})</TabsTrigger>
          <TabsTrigger value="admins">Admins ({admins.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4"><UserTable data={all} /></TabsContent>
        <TabsContent value="travelers" className="mt-4"><UserTable data={travelers} /></TabsContent>
        <TabsContent value="operators" className="mt-4"><UserTable data={operators} /></TabsContent>
        <TabsContent value="admins" className="mt-4"><UserTable data={admins} /></TabsContent>
      </Tabs>
    </div>
  );
}
