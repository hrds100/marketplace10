// /tinder/agents — admin-only view to manage who can access the Tinder
// (and CRM) workspace. Reuses the same wk-create-agent / wk-delete-agent
// edge functions and profiles.workspace_role column as /crm/settings.
//
// Adding an agent here is identical to adding one in /crm/settings. They
// can sign in and use both surfaces. For advanced settings (Twilio extension,
// daily spend limits, leaderboard visibility) the "Open in CRM" link sends
// admins to the full-featured CRM page.

import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsBrrrrAdmin } from "./hooks/useIsBrrrrAdmin";

const t = (name: string) => (supabase.from as any)(name);

type AgentRow = {
  id: string;
  name: string | null;
  email: string | null;
  workspace_role: "admin" | "agent" | "viewer" | null;
};

type Role = "admin" | "agent" | "viewer";

// Mirrors the wk-create-agent / wk-delete-agent invoke signatures used by
// /crm/settings/agents. Typed inline so we don't pull in CRM internals.
type SupabaseFunctionsTyped = {
  invoke<TBody, TData = unknown>(
    name: string,
    init: { body: TBody },
  ): Promise<{ data: TData | null; error: { message: string } | null }>;
};

export default function AgentsPage() {
  const { isAdmin, loading: adminLoading } = useIsBrrrrAdmin();

  // Non-admins shouldn't even see the page — TinderSidebar hides the link
  // but a direct URL hit needs a fallback redirect.
  if (!adminLoading && !isAdmin) {
    return <Navigate to="/tinder" replace />;
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-4xl mx-auto p-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Agents</h1>
            <p className="text-sm text-slate-500 mt-1">
              Who can access /tinder and /crm. Adding an agent here is the same
              as adding them in /crm/settings — they show up in both places.
            </p>
          </div>
          <a
            href="/crm/settings?scope=workspace-only&tab=agents"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-emerald-700 hover:underline whitespace-nowrap"
          >
            Open in CRM ↗
          </a>
        </header>

        {adminLoading ? (
          <div className="text-sm text-slate-400 py-12 text-center">Loading…</div>
        ) : (
          <AgentsTable />
        )}
      </div>
    </div>
  );
}

function AgentsTable() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<AgentRow | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await t("profiles")
        .select("id, name, email, workspace_role")
        .in("workspace_role", ["admin", "agent", "viewer"])
        .order("workspace_role", { ascending: true })
        .order("email", { ascending: true });
      if (e) throw e;
      setAgents((data as AgentRow[] | null) ?? []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  async function changeRole(agent: AgentRow, role: Role) {
    setBusy(agent.id);
    setError(null);
    try {
      const { error: e } = await t("profiles")
        .update({ workspace_role: role })
        .eq("id", agent.id);
      if (e) throw e;
      await load();
    } catch (e: any) {
      setError(`Failed to change role: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function removeAgent(agent: AgentRow) {
    setBusy(agent.id);
    setError(null);
    try {
      // Same edge function the CRM uses. Soft-delete: clears workspace_role,
      // hides from leaderboard, releases queue rows, removes wk_campaign_agents.
      const { data, error: e } = await (supabase.functions as unknown as SupabaseFunctionsTyped).invoke<
        { agent_id: string }, { error?: string }
      >("wk-delete-agent", { body: { agent_id: agent.id } });
      if (e) throw e;
      if (data?.error) throw new Error(data.error);
      await load();
      setConfirmRemove(null);
    } catch (e: any) {
      setError(`Failed to remove: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  const counts = useMemo(() => {
    const c = { admin: 0, agent: 0, viewer: 0 };
    agents.forEach((a) => {
      if (a.workspace_role === "admin") c.admin += 1;
      else if (a.workspace_role === "agent") c.agent += 1;
      else if (a.workspace_role === "viewer") c.viewer += 1;
    });
    return c;
  }, [agents]);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-3 text-xs">
          <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-medium">
            {counts.admin} admin{counts.admin === 1 ? "" : "s"}
          </span>
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
            {counts.agent} agent{counts.agent === 1 ? "" : "s"}
          </span>
          <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded font-medium">
            {counts.viewer} viewer{counts.viewer === 1 ? "" : "s"}
          </span>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="px-3 py-1.5 text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
        >+ Add agent</button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            )}
            {!loading && agents.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No agents yet. Click "Add agent" to invite one.</td></tr>
            )}
            {agents.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{a.name || "—"}</td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{a.email || "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={a.workspace_role ?? "viewer"}
                    onChange={(e) => changeRole(a, e.target.value as Role)}
                    disabled={busy === a.id}
                    className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                  >
                    <option value="admin">admin</option>
                    <option value="agent">agent</option>
                    <option value="viewer">viewer</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setConfirmRemove(a)}
                    disabled={busy === a.id}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium disabled:opacity-50"
                  >Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500 mt-4 leading-relaxed">
        Twilio extension, daily call spend limits, and leaderboard visibility are managed in{" "}
        <Link to="/crm/settings?scope=workspace-only&tab=agents" className="text-emerald-700 hover:underline">/crm/settings</Link>.
      </p>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onCreated={() => { setShowInvite(false); void load(); }}
        />
      )}

      {confirmRemove && (
        <ConfirmRemoveModal
          agent={confirmRemove}
          busy={busy === confirmRemove.id}
          onCancel={() => setConfirmRemove(null)}
          onConfirm={() => removeAgent(confirmRemove)}
        />
      )}
    </>
  );
}

function InviteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("agent");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    if (!trimmedEmail.includes("@")) { setError("Enter a valid email."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!trimmedName) { setError("Enter the agent's name."); return; }

    setBusy(true);
    try {
      const { data, error: e } = await (supabase.functions as unknown as SupabaseFunctionsTyped).invoke<
        { email: string; password: string; name: string; extension: string | null; role: Role; daily_limit_pence: number },
        { error?: string }
      >("wk-create-agent", {
        body: {
          email: trimmedEmail,
          password,
          name: trimmedName,
          extension: null,
          role,
          daily_limit_pence: 1000, // £10 default — same as the CRM default
        },
      });
      if (e) throw e;
      if (data?.error) throw new Error(data.error);
      onCreated();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-800">Add agent</h2>
        <p className="text-sm text-slate-500 mt-1">
          Creates a hub.nfstay.com login. They'll sign in with this email + password.
        </p>

        <label className="block mt-4 text-sm font-medium text-slate-700">Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Elijah"
            disabled={busy}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </label>

        <label className="block mt-3 text-sm font-medium text-slate-700">Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="elijah@nfstay.com"
            disabled={busy}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
          />
        </label>

        <label className="block mt-3 text-sm font-medium text-slate-700">Initial password
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            disabled={busy}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
          />
          <span className="text-xs text-slate-500 mt-1 block">Share this with the agent — they can change it after signing in.</span>
        </label>

        <label className="block mt-3 text-sm font-medium text-slate-700">Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={busy}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="agent">agent — swipe, push to pipeline, dial via CRM, fill questionnaire</option>
            <option value="admin">admin — full access, set offers, manage agents</option>
            <option value="viewer">viewer — read-only</option>
          </select>
        </label>

        {error && <div className="mt-3 p-2 rounded bg-rose-50 text-rose-700 text-sm">{error}</div>}

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} disabled={busy}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={busy}
            className="px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50">
            {busy ? "Creating…" : "Create agent"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmRemoveModal({
  agent, busy, onCancel, onConfirm,
}: {
  agent: AgentRow;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-800">Remove {agent.name || agent.email}?</h2>
        <p className="text-sm text-slate-500 mt-2">
          They'll lose access to both <span className="font-mono">/tinder</span> and <span className="font-mono">/crm</span>.
          Their account isn't deleted — you can re-grant access later by setting their role again.
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancel} disabled={busy}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy}
            className="px-4 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50">
            {busy ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}
