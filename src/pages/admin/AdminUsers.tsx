import { adminUsers } from '@/data/mockData';

export default function AdminUsers() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">Users</h1>
        <button className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">Export CSV</button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              {['Name', 'Email', 'Plan', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {adminUsers.map((u, i) => (
              <tr key={u.id} className={i % 2 === 1 ? 'bg-secondary' : ''}>
                <td className="p-3.5 font-medium text-foreground">{u.name}</td>
                <td className="p-3.5 text-muted-foreground">{u.email}</td>
                <td className="p-3.5 text-foreground">{u.plan}</td>
                <td className="p-3.5">
                  <span className={u.status === 'Active' ? 'badge-green' : u.status === 'Trial' ? 'badge-amber' : 'badge-gray'}>{u.status}</span>
                </td>
                <td className="p-3.5 text-muted-foreground">{u.joined}</td>
                <td className="p-3.5">
                  <div className="flex gap-2">
                    <button className="text-xs text-primary font-medium">View</button>
                    <button className="text-xs text-foreground font-medium">Suspend</button>
                    <button className="text-xs text-destructive font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
