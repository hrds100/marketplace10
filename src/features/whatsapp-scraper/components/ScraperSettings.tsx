import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ScraperConfig } from '../types';

interface ScraperSettingsProps {
  config: ScraperConfig;
  loading: boolean;
  error: string | null;
  onSave: (partial: Partial<ScraperConfig>) => Promise<boolean>;
}

export default function ScraperSettings({ config, loading, error, onSave }: ScraperSettingsProps) {
  const [form, setForm] = useState<ScraperConfig>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(config);
  }, [config]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const success = await onSave(form);
      if (success) {
        toast.success('Settings saved');
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-[14px] text-[#6B7280]">Loading settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[14px] text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-6">
        {/* Scan interval */}
        <div>
          <label className="block text-[14px] font-medium text-[#1A1A1A] mb-1.5">Scan Interval</label>
          <select
            value={form.scan_interval_minutes}
            onChange={(e) => setForm(prev => ({ ...prev, scan_interval_minutes: Number(e.target.value) }))}
            className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-[14px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1E9A80]"
          >
            <option value={5}>Every 5 minutes</option>
            <option value={10}>Every 10 minutes</option>
            <option value={15}>Every 15 minutes</option>
            <option value={30}>Every 30 minutes</option>
            <option value={60}>Every hour</option>
          </select>
          <p className="text-[12px] text-[#9CA3AF] mt-1">How often the extension scans for new messages</p>
        </div>

        {/* Lookback hours */}
        <div>
          <label className="block text-[14px] font-medium text-[#1A1A1A] mb-1.5">Lookback Window</label>
          <select
            value={form.lookback_hours}
            onChange={(e) => setForm(prev => ({ ...prev, lookback_hours: Number(e.target.value) }))}
            className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-[14px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1E9A80]"
          >
            <option value={6}>Last 6 hours</option>
            <option value={12}>Last 12 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={48}>Last 48 hours</option>
            <option value={72}>Last 72 hours</option>
          </select>
          <p className="text-[12px] text-[#9CA3AF] mt-1">How far back to scan for messages in each group</p>
        </div>

        {/* Max messages per group */}
        <div>
          <label className="block text-[14px] font-medium text-[#1A1A1A] mb-1.5">Max Messages Per Group</label>
          <input
            type="number"
            value={form.max_messages_per_group}
            onChange={(e) => setForm(prev => ({ ...prev, max_messages_per_group: Number(e.target.value) }))}
            min={10}
            max={500}
            className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-[14px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1E9A80]"
          />
          <p className="text-[12px] text-[#9CA3AF] mt-1">Maximum messages to process per group per scan</p>
        </div>

        {/* Duplicate window */}
        <div>
          <label className="block text-[14px] font-medium text-[#1A1A1A] mb-1.5">Duplicate Detection Window</label>
          <select
            value={form.duplicate_window_days}
            onChange={(e) => setForm(prev => ({ ...prev, duplicate_window_days: Number(e.target.value) }))}
            className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-[14px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1E9A80]"
          >
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
          <p className="text-[12px] text-[#9CA3AF] mt-1">Ignore messages already seen within this window</p>
        </div>

        {/* Divider */}
        <hr className="border-[#E5E7EB]" />

        {/* Notification email */}
        <div>
          <label className="block text-[14px] font-medium text-[#1A1A1A] mb-1.5">Notification Email</label>
          <input
            type="email"
            value={form.notification_email}
            onChange={(e) => setForm(prev => ({ ...prev, notification_email: e.target.value }))}
            className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-[14px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1E9A80]"
          />
          <p className="text-[12px] text-[#9CA3AF] mt-1">Email to receive scan notifications</p>
        </div>

        {/* Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[14px] font-medium text-[#1A1A1A]">Notifications</span>
              <p className="text-[12px] text-[#9CA3AF]">Send email when new deals are found</p>
            </div>
            <button
              onClick={() => setForm(prev => ({ ...prev, notifications_enabled: !prev.notifications_enabled }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.notifications_enabled ? 'bg-[#1E9A80]' : 'bg-[#E5E7EB]'}`}
              role="switch"
              aria-checked={form.notifications_enabled}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.notifications_enabled && 'translate-x-5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-[14px] font-medium text-[#1A1A1A]">Auto-Submit Approved</span>
              <p className="text-[12px] text-[#9CA3AF]">Automatically submit approved deals to the marketplace</p>
            </div>
            <button
              onClick={() => setForm(prev => ({ ...prev, auto_submit_approved: !prev.auto_submit_approved }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.auto_submit_approved ? 'bg-[#1E9A80]' : 'bg-[#E5E7EB]'}`}
              role="switch"
              aria-checked={form.auto_submit_approved}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.auto_submit_approved && 'translate-x-5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-[14px] font-medium text-[#1A1A1A]">Pause Scanner</span>
              <p className="text-[12px] text-[#9CA3AF]">Temporarily stop all scanning</p>
            </div>
            <button
              onClick={() => setForm(prev => ({ ...prev, is_paused: !prev.is_paused }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.is_paused ? 'bg-amber-500' : 'bg-[#E5E7EB]'}`}
              role="switch"
              aria-checked={form.is_paused}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_paused && 'translate-x-5'}`} />
            </button>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-10 px-6 rounded-lg bg-[#1E9A80] text-white text-[14px] font-medium hover:bg-[#178a72] transition-colors flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}
