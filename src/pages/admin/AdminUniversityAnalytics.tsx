import { useState, useEffect, useCallback } from 'react';
import { Users, BookOpen, Trophy, Zap, ChevronDown, ChevronRight, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import type { Tables } from '@/integrations/supabase/types';

type ModuleRow = Tables<'modules'>;

interface UserProgressSummary {
  user_id: string;
  email: string;
  modules_completed: number;
  lessons_completed: number;
  xp: number;
  last_activity: string | null;
}

const PAGE_SIZE = 20;

export default function AdminUniversityAnalytics() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [resettingUser, setResettingUser] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<{ userId: string; email: string } | null>(null);

  // Admin guard
  const { data: profile } = useQuery({
    queryKey: ['admin-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch all modules
  const { data: modules = [] } = useQuery({
    queryKey: ['analytics-modules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('modules').select('*').order('order_index');
      if (error) throw error;
      return data as ModuleRow[];
    },
  });

  // Stat: total enrolled users
  const { data: totalEnrolled = 0 } = useQuery({
    queryKey: ['analytics-enrolled'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_progress').select('user_id');
      if (error) throw error;
      const unique = new Set((data ?? []).map(r => r.user_id));
      return unique.size;
    },
  });

  // Stat: total lesson completions (step_index = -1)
  const { data: totalCompletions = 0 } = useQuery({
    queryKey: ['analytics-completions'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('user_progress')
        .select('id', { count: 'exact', head: true })
        .eq('completed', true)
        .eq('step_index', -1);
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Stat: most completed module
  const { data: topModule = '—' } = useQuery({
    queryKey: ['analytics-top-module'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select('module_id')
        .eq('step_index', -1)
        .eq('completed', true);
      if (error || !data) return '—';
      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.module_id] = (counts[row.module_id] ?? 0) + 1;
      }
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (!top) return '—';
      return top[0];
    },
  });

  // Avg XP per user
  const { data: avgXP = 0 } = useQuery({
    queryKey: ['analytics-avg-xp'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_progress').select('user_id, step_index, completed');
      if (error || !data) return 0;
      const byUser: Record<string, { steps: number; lessons: number; modules: Record<string, boolean> }> = {};
      for (const row of data) {
        if (!byUser[row.user_id]) byUser[row.user_id] = { steps: 0, lessons: 0, modules: {} };
        if (row.step_index === -1 && row.completed) byUser[row.user_id].lessons++;
        else if (row.step_index !== null && row.step_index >= 0 && row.completed) byUser[row.user_id].steps++;
      }
      const users = Object.values(byUser);
      if (users.length === 0) return 0;
      const totalXP = users.reduce((sum, u) => sum + (u.steps * 5) + (u.lessons * 80), 0);
      return Math.round(totalXP / users.length);
    },
  });

  // Module completion table
  const { data: moduleStats = [] } = useQuery({
    queryKey: ['analytics-module-stats'],
    queryFn: async () => {
      const { data: allProgress, error } = await supabase
        .from('user_progress')
        .select('user_id, module_id, lesson_id, step_index, completed');
      if (error || !allProgress) return [];

      const { data: allLessons } = await supabase
        .from('lessons')
        .select('id, module_id, title')
        .eq('is_published', true);

      const lessonsByModule: Record<string, { id: string; title: string }[]> = {};
      for (const l of allLessons ?? []) {
        if (!l.module_id) continue;
        if (!lessonsByModule[l.module_id]) lessonsByModule[l.module_id] = [];
        lessonsByModule[l.module_id].push({ id: l.id, title: l.title });
      }

      // completions per user per module
      type ProgressRecord = { user_id: string; module_id: string; lesson_id: string; step_index: number | null; completed: boolean | null };
      const completionsByUser: Record<string, Record<string, Set<string>>> = {};
      for (const row of allProgress as ProgressRecord[]) {
        if (row.step_index !== -1 || !row.completed) continue;
        if (!completionsByUser[row.module_id]) completionsByUser[row.module_id] = {};
        if (!completionsByUser[row.module_id][row.user_id]) completionsByUser[row.module_id][row.user_id] = new Set();
        completionsByUser[row.module_id][row.user_id].add(row.lesson_id);
      }

      const startedByUser: Record<string, Set<string>> = {};
      for (const row of allProgress as ProgressRecord[]) {
        if (!startedByUser[row.module_id]) startedByUser[row.module_id] = new Set<string>();
        startedByUser[row.module_id].add(row.user_id);
      }

      return modules.map(mod => {
        const modLessons = lessonsByModule[mod.id] ?? [];
        const usersStarted = startedByUser[mod.id]?.size ?? 0;
        const usersCompleted = Object.entries(completionsByUser[mod.id] ?? {}).filter(([, completedSet]) =>
          modLessons.every(l => completedSet.has(l.id)),
        ).length;

        const lessonLevel = modLessons.map(l => {
          let completedCount = 0;
          for (const userSet of Object.values(completionsByUser[mod.id] ?? {})) {
            if (userSet.has(l.id)) completedCount++;
          }
          return { id: l.id, title: l.title, completedCount };
        });

        return {
          module: mod,
          usersStarted,
          usersCompleted,
          pct: usersStarted > 0 ? Math.round((usersCompleted / usersStarted) * 100) : 0,
          lessonLevel,
        };
      });
    },
    enabled: modules.length > 0,
  });

  // Paginated user table
  const { data: allUserProgress = [] } = useQuery({
    queryKey: ['analytics-user-progress-all'],
    queryFn: async () => {
      const { data: progressRows, error } = await supabase
        .from('user_progress')
        .select('user_id, step_index, completed, completed_at');
      if (error || !progressRows) return [];

      const { data: profileRows } = await supabase.from('profiles').select('id, email');
      const emailMap: Record<string, string> = {};
      for (const p of profileRows ?? []) {
        if (p.id && p.email) emailMap[p.id] = p.email;
      }

      type Row = typeof progressRows[0];
      const byUser: Record<string, { steps: number; lessons: number; lastActivity: string | null }> = {};
      for (const row of progressRows as Row[]) {
        if (!byUser[row.user_id]) byUser[row.user_id] = { steps: 0, lessons: 0, lastActivity: null };
        const u = byUser[row.user_id];
        if (row.step_index === -1 && row.completed) {
          u.lessons++;
          if (row.completed_at && (!u.lastActivity || row.completed_at > u.lastActivity)) {
            u.lastActivity = row.completed_at;
          }
        } else if (row.step_index !== null && row.step_index >= 0 && row.completed) {
          u.steps++;
        }
      }

      const summaries: UserProgressSummary[] = Object.entries(byUser).map(([uid, u]) => ({
        user_id: uid,
        email: emailMap[uid] ?? uid.slice(0, 8) + '…',
        modules_completed: 0,
        lessons_completed: u.lessons,
        xp: (u.steps * 5) + (u.lessons * 80),
        last_activity: u.lastActivity,
      }));

      summaries.sort((a, b) => b.xp - a.xp);
      return summaries;
    },
  });

  const paginatedUsers = allUserProgress.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(allUserProgress.length / PAGE_SIZE);

  const handleResetProgress = useCallback(async (userId: string) => {
    setResettingUser(userId);
    const { error } = await supabase.from('user_progress').delete().eq('user_id', userId);
    setResettingUser(null);
    setConfirmReset(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Progress reset');
  }, []);

  const handleExportCSV = useCallback(() => {
    if (allUserProgress.length === 0) { toast.error('No data to export'); return; }
    const headers = ['User ID', 'Email', 'Lessons Completed', 'XP', 'Last Activity'];
    const rows = allUserProgress.map(u => [
      u.user_id,
      u.email,
      String(u.lessons_completed),
      String(u.xp),
      u.last_activity ?? '',
    ]);
    const csvLines = [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    );
    const csv = csvLines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `university-progress-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [allUserProgress]);

  if (profile?.role !== 'admin') {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Admin access required.</div>;
  }

  const topModuleTitle = modules.find(m => m.id === topModule)?.title ?? topModule;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-foreground">University Analytics</h1>
        <button
          onClick={handleExportCSV}
          className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground inline-flex items-center gap-2 hover:bg-secondary transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Enrolled', value: String(totalEnrolled), color: '#3B82F6' },
          { icon: BookOpen, label: 'Lesson Completions', value: String(totalCompletions), color: '#1DB954' },
          { icon: Trophy, label: 'Most Completed Module', value: topModuleTitle, color: '#F59E0B' },
          { icon: Zap, label: 'Avg XP Per User', value: avgXP.toLocaleString(), color: '#8B5CF6' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground truncate">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Module completion table */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">Module Completion</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Module', 'Users Started', 'Users Completed', 'Rate'].map(h => (
                  <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {moduleStats.map((stat, i) => (
                <>
                  <tr
                    key={stat.module.id}
                    className={`cursor-pointer ${i % 2 === 1 ? 'bg-secondary' : ''} hover:bg-accent transition-colors`}
                    onClick={() => setExpandedModule(expandedModule === stat.module.id ? null : stat.module.id)}
                  >
                    <td className="p-3.5 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {expandedModule === stat.module.id
                          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                        {stat.module.emoji ?? ''} {stat.module.title}
                      </div>
                    </td>
                    <td className="p-3.5 text-muted-foreground">{stat.usersStarted}</td>
                    <td className="p-3.5 text-muted-foreground">{stat.usersCompleted}</td>
                    <td className="p-3.5">
                      <span
                        className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: stat.pct >= 50 ? '#ECFDF5' : '#FFFBEB',
                          color: stat.pct >= 50 ? '#065F46' : '#92400E',
                        }}
                      >
                        {stat.pct}%
                      </span>
                    </td>
                  </tr>
                  {expandedModule === stat.module.id && (
                    <tr key={`${stat.module.id}-expand`}>
                      <td colSpan={4} className="px-8 pb-4 pt-2 bg-muted/30">
                        <table className="w-full text-xs">
                          <thead>
                            <tr>
                              <th className="text-left pb-1.5 text-muted-foreground font-medium">Lesson</th>
                              <th className="text-left pb-1.5 text-muted-foreground font-medium">Completions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stat.lessonLevel.map(l => (
                              <tr key={l.id}>
                                <td className="py-0.5 text-foreground">{l.title}</td>
                                <td className="py-0.5 text-muted-foreground">{l.completedCount}</td>
                              </tr>
                            ))}
                            {stat.lessonLevel.length === 0 && (
                              <tr><td colSpan={2} className="text-muted-foreground py-1">No lesson data yet.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {moduleStats.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User progress table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">User Progress</h2>
          <span className="text-sm text-muted-foreground">{allUserProgress.length} users</span>
        </div>

        {confirmReset && (
          <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmReset(null)}>
            <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-foreground mb-2">Reset progress for {confirmReset.email}?</h3>
              <p className="text-sm text-muted-foreground mb-4">All user_progress rows will be deleted. This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmReset(null)} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-foreground">Cancel</button>
                <button
                  onClick={() => handleResetProgress(confirmReset.userId)}
                  disabled={resettingUser === confirmReset.userId}
                  className="flex-1 h-10 rounded-lg text-sm font-semibold text-white bg-red-600 disabled:opacity-60 flex items-center justify-center gap-1"
                >
                  {resettingUser === confirmReset.userId && <Loader2 className="w-3 h-3 animate-spin" />}
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Email', 'Lessons Completed', 'XP', 'Last Activity', 'Actions'].map(h => (
                  <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((u, i) => (
                <tr key={u.user_id} className={i % 2 === 1 ? 'bg-secondary' : ''}>
                  <td className="p-3.5 font-medium text-foreground max-w-[200px] truncate">{u.email}</td>
                  <td className="p-3.5 text-muted-foreground">{u.lessons_completed}</td>
                  <td className="p-3.5 text-muted-foreground">{u.xp.toLocaleString()}</td>
                  <td className="p-3.5 text-muted-foreground text-xs">
                    {u.last_activity ? new Date(u.last_activity).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="p-3.5">
                    <button
                      onClick={() => setConfirmReset({ userId: u.user_id, email: u.email })}
                      className="text-xs text-destructive font-medium hover:opacity-80"
                    >
                      Reset
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedUsers.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No user data yet.</td></tr>
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-sm font-medium text-foreground disabled:opacity-40 hover:text-primary"
              >
                ← Previous
              </button>
              <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="text-sm font-medium text-foreground disabled:opacity-40 hover:text-primary"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
