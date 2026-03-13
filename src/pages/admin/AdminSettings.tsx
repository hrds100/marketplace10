import { Settings, Globe, Bell } from 'lucide-react';

export default function AdminSettings() {
  return (
    <div className="max-w-[600px]">
      <h1 className="text-[28px] font-bold text-foreground mb-6">Admin Settings</h1>

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">Platform</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Site name</label>
              <input defaultValue="NFsTay" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Support email</label>
              <input defaultValue="support@nfstay.com" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">Notifications</h2>
          </div>
          <div className="space-y-3">
            {['Email new submissions to admin', 'Email new signups to admin', 'Weekly analytics digest'].map(s => (
              <div key={s} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-foreground">{s}</span>
                <button className="w-11 h-6 rounded-full bg-primary relative">
                  <span className="absolute top-0.5 left-[22px] w-5 h-5 rounded-full bg-white shadow" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button className="h-11 px-6 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm hover:opacity-90 transition-opacity">Save settings</button>
      </div>
    </div>
  );
}
