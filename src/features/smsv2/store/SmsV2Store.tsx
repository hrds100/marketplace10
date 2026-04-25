import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import { MOCK_CONTACTS } from '../data/mockContacts';
import { ACTIVE_PIPELINE } from '../data/mockPipelines';
import { MOCK_AGENTS } from '../data/mockAgents';
import { MOCK_CAMPAIGNS, MOCK_TEMPLATES } from '../data/mockCampaigns';
import type {
  Agent,
  Contact,
  PipelineColumn,
  Campaign,
  ActivityEvent,
} from '../types';

// ─── Toast (transient cross-screen notification) ──────────────────────
export interface ToastMsg {
  id: string;
  text: string;
  kind: 'success' | 'info' | 'error';
  ts: number;
}

// ─── State ────────────────────────────────────────────────────────────
interface State {
  contacts: Contact[];
  columns: PipelineColumn[];
  agents: Agent[];
  campaigns: Campaign[];
  activeCampaignId: string;
  queue: string[]; // contact IDs ordered for dialer
  activity: ActivityEvent[];
  notesByContactId: Record<string, string>;
  toasts: ToastMsg[];
}

// ─── Actions ──────────────────────────────────────────────────────────
type Action =
  | { type: 'contact/upsert'; contact: Contact }
  | { type: 'contact/patch'; id: string; patch: Partial<Contact> }
  | { type: 'contact/remove'; id: string }
  | { type: 'column/set'; columns: PipelineColumn[] }
  | { type: 'column/upsert'; column: PipelineColumn }
  | { type: 'column/patch'; id: string; patch: Partial<PipelineColumn> }
  | { type: 'column/remove'; id: string }
  | { type: 'agent/upsert'; agent: Agent }
  | { type: 'agent/remove'; id: string }
  | { type: 'campaign/patch'; id: string; patch: Partial<Campaign> }
  | { type: 'campaign/setActive'; id: string }
  | { type: 'queue/set'; ids: string[] }
  | { type: 'queue/remove'; id: string }
  | { type: 'activity/push'; event: ActivityEvent }
  | { type: 'note/set'; contactId: string; body: string }
  | { type: 'toast/push'; toast: ToastMsg }
  | { type: 'toast/dismiss'; id: string };

const initialState: State = {
  contacts: MOCK_CONTACTS,
  columns: ACTIVE_PIPELINE.columns,
  agents: MOCK_AGENTS,
  campaigns: MOCK_CAMPAIGNS,
  activeCampaignId: MOCK_CAMPAIGNS[0].id,
  // Seed queue with all non-hot contacts (hot leads jumped via priority elsewhere)
  queue: MOCK_CONTACTS.map((c) => c.id),
  activity: [],
  notesByContactId: {},
  toasts: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'contact/upsert': {
      const exists = state.contacts.some((c) => c.id === action.contact.id);
      return {
        ...state,
        contacts: exists
          ? state.contacts.map((c) => (c.id === action.contact.id ? action.contact : c))
          : [...state.contacts, action.contact],
      };
    }
    case 'contact/patch':
      return {
        ...state,
        contacts: state.contacts.map((c) =>
          c.id === action.id ? { ...c, ...action.patch } : c
        ),
      };
    case 'contact/remove':
      return {
        ...state,
        contacts: state.contacts.filter((c) => c.id !== action.id),
        queue: state.queue.filter((id) => id !== action.id),
      };
    case 'column/set':
      return { ...state, columns: action.columns };
    case 'column/upsert': {
      const exists = state.columns.some((c) => c.id === action.column.id);
      return {
        ...state,
        columns: exists
          ? state.columns.map((c) => (c.id === action.column.id ? action.column : c))
          : [...state.columns, action.column],
      };
    }
    case 'column/patch':
      return {
        ...state,
        columns: state.columns.map((c) =>
          c.id === action.id ? { ...c, ...action.patch } : c
        ),
      };
    case 'column/remove':
      return { ...state, columns: state.columns.filter((c) => c.id !== action.id) };
    case 'agent/upsert': {
      const exists = state.agents.some((a) => a.id === action.agent.id);
      return {
        ...state,
        agents: exists
          ? state.agents.map((a) => (a.id === action.agent.id ? action.agent : a))
          : [...state.agents, action.agent],
      };
    }
    case 'agent/remove':
      return { ...state, agents: state.agents.filter((a) => a.id !== action.id) };
    case 'campaign/patch':
      return {
        ...state,
        campaigns: state.campaigns.map((c) =>
          c.id === action.id ? { ...c, ...action.patch } : c
        ),
      };
    case 'campaign/setActive':
      return { ...state, activeCampaignId: action.id };
    case 'queue/set':
      return { ...state, queue: action.ids };
    case 'queue/remove':
      return { ...state, queue: state.queue.filter((id) => id !== action.id) };
    case 'activity/push':
      return { ...state, activity: [action.event, ...state.activity].slice(0, 200) };
    case 'note/set':
      return {
        ...state,
        notesByContactId: { ...state.notesByContactId, [action.contactId]: action.body },
      };
    case 'toast/push':
      return { ...state, toasts: [...state.toasts, action.toast] };
    case 'toast/dismiss':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}

// ─── API surface (selectors + actions) ────────────────────────────────
export interface SmsV2API {
  // Selectors
  contacts: Contact[];
  columns: PipelineColumn[];
  agents: Agent[];
  campaigns: Campaign[];
  activeCampaign: Campaign;
  queue: string[];
  activity: ActivityEvent[];
  toasts: ToastMsg[];
  getContact: (id: string) => Contact | undefined;
  getColumn: (id: string) => PipelineColumn | undefined;
  getNote: (contactId: string) => string;

  // Contact actions
  upsertContact: (c: Contact) => void;
  patchContact: (id: string, patch: Partial<Contact>) => void;
  removeContact: (id: string) => void;

  // Pipeline actions
  setColumns: (cols: PipelineColumn[]) => void;
  upsertColumn: (col: PipelineColumn) => void;
  patchColumn: (id: string, patch: Partial<PipelineColumn>) => void;
  removeColumn: (id: string) => void;

  // Agent actions
  upsertAgent: (a: Agent) => void;
  removeAgent: (id: string) => void;

  // Campaign actions
  patchCampaign: (id: string, patch: Partial<Campaign>) => void;
  setActiveCampaign: (id: string) => void;

  // Queue actions
  setQueue: (ids: string[]) => void;
  popNextFromQueue: () => string | null;

  // Note actions
  saveNote: (contactId: string, body: string) => void;

  // Toasts
  pushToast: (text: string, kind?: ToastMsg['kind']) => void;
  dismissToast: (id: string) => void;

  /**
   * The big one: apply a pipeline outcome to a contact.
   * - Moves the contact to the column
   * - Runs the column's automation badges (mock: pushes activity entries)
   * - Returns { nextContactId, badges } so caller can surface toast and start next call
   */
  applyOutcome: (
    contactId: string,
    columnId: string,
    note?: string
  ) => { nextContactId: string | null; badges: string[]; columnName: string };
}

const Ctx = createContext<SmsV2API | null>(null);

export function SmsV2Provider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const popNextFromQueue = useCallback((): string | null => {
    const next = state.queue[0] ?? null;
    if (next) dispatch({ type: 'queue/remove', id: next });
    return next;
  }, [state.queue]);

  const pushToast = useCallback((text: string, kind: ToastMsg['kind'] = 'success') => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    dispatch({
      type: 'toast/push',
      toast: { id, text, kind, ts: Date.now() },
    });
    setTimeout(() => dispatch({ type: 'toast/dismiss', id }), 4000);
  }, []);

  const applyOutcome = useCallback<SmsV2API['applyOutcome']>(
    (contactId, columnId, note) => {
      const col = state.columns.find((c) => c.id === columnId);
      const contact = state.contacts.find((c) => c.id === contactId);
      const columnName = col?.name ?? 'Unknown';
      const badges: string[] = [];

      if (!col || !contact) {
        return { nextContactId: null, badges, columnName };
      }

      // 1. Move contact to column
      dispatch({
        type: 'contact/patch',
        id: contactId,
        patch: { pipelineColumnId: columnId, lastContactAt: new Date().toISOString() },
      });

      // 2. Stage moved activity
      dispatch({
        type: 'activity/push',
        event: {
          id: `a-${Date.now()}-stage`,
          contactId,
          kind: 'stage_moved',
          title: `Moved to ${col.name}`,
          ts: new Date().toISOString(),
        },
      });

      // 3. Automation effects (mock — real ones happen server-side in Phase 1)
      const a = col.automation;
      if (a.sendSms) {
        const tpl = MOCK_TEMPLATES.find((t) => t.id === a.smsTemplateId);
        const label = tpl?.name ?? 'SMS template';
        badges.push(`SMS: ${label}`);
        dispatch({
          type: 'activity/push',
          event: {
            id: `a-${Date.now()}-sms`,
            contactId,
            kind: 'sms_outbound',
            title: `Auto SMS sent (${label})`,
            body: tpl?.bodyMd,
            ts: new Date().toISOString(),
          },
        });
      }
      if (a.createTask) {
        badges.push(`Task: ${a.taskTitle ?? '—'}`);
        dispatch({
          type: 'activity/push',
          event: {
            id: `a-${Date.now()}-task`,
            contactId,
            kind: 'task_created',
            title: `Task created: ${a.taskTitle ?? 'Follow-up'}`,
            ts: new Date().toISOString(),
          },
        });
      }
      if (a.retryDial) {
        badges.push(`Retry in ${a.retryInHours}h`);
        dispatch({
          type: 'activity/push',
          event: {
            id: `a-${Date.now()}-retry`,
            contactId,
            kind: 'note',
            title: `Retry queued in ${a.retryInHours}h`,
            ts: new Date().toISOString(),
          },
        });
      }
      if (a.addTag && a.tag) {
        badges.push(`Tag +${a.tag}`);
        const updated = [...new Set([...contact.tags, a.tag])];
        dispatch({
          type: 'contact/patch',
          id: contactId,
          patch: { tags: updated },
        });
        dispatch({
          type: 'activity/push',
          event: {
            id: `a-${Date.now()}-tag`,
            contactId,
            kind: 'tag_added',
            title: `Tag added: #${a.tag}`,
            ts: new Date().toISOString(),
          },
        });
      }

      // 4. Save the note if any
      if (note && note.trim()) {
        dispatch({ type: 'note/set', contactId, body: note });
      }

      // 5. Pop the next contact from the queue
      dispatch({ type: 'queue/remove', id: contactId });
      const remaining = state.queue.filter((id) => id !== contactId);
      const nextContactId = remaining[0] ?? null;

      return { nextContactId, badges, columnName };
    },
    [state.columns, state.contacts, state.queue]
  );

  const api = useMemo<SmsV2API>(
    () => ({
      // Selectors
      contacts: state.contacts,
      columns: state.columns,
      agents: state.agents,
      campaigns: state.campaigns,
      activeCampaign:
        state.campaigns.find((c) => c.id === state.activeCampaignId) ?? state.campaigns[0],
      queue: state.queue,
      activity: state.activity,
      toasts: state.toasts,
      getContact: (id) => state.contacts.find((c) => c.id === id),
      getColumn: (id) => state.columns.find((c) => c.id === id),
      getNote: (id) => state.notesByContactId[id] ?? '',

      // Contact
      upsertContact: (c) => dispatch({ type: 'contact/upsert', contact: c }),
      patchContact: (id, patch) => dispatch({ type: 'contact/patch', id, patch }),
      removeContact: (id) => dispatch({ type: 'contact/remove', id }),

      // Pipeline
      setColumns: (cols) => dispatch({ type: 'column/set', columns: cols }),
      upsertColumn: (col) => dispatch({ type: 'column/upsert', column: col }),
      patchColumn: (id, patch) => dispatch({ type: 'column/patch', id, patch }),
      removeColumn: (id) => dispatch({ type: 'column/remove', id }),

      // Agents
      upsertAgent: (a) => dispatch({ type: 'agent/upsert', agent: a }),
      removeAgent: (id) => dispatch({ type: 'agent/remove', id }),

      // Campaigns
      patchCampaign: (id, patch) => dispatch({ type: 'campaign/patch', id, patch }),
      setActiveCampaign: (id) => dispatch({ type: 'campaign/setActive', id }),

      // Queue
      setQueue: (ids) => dispatch({ type: 'queue/set', ids }),
      popNextFromQueue,

      // Notes
      saveNote: (contactId, body) => dispatch({ type: 'note/set', contactId, body }),

      // Toasts
      pushToast,
      dismissToast: (id) => dispatch({ type: 'toast/dismiss', id }),

      // Outcome
      applyOutcome,
    }),
    [state, popNextFromQueue, pushToast, applyOutcome]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useSmsV2(): SmsV2API {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSmsV2 must be used inside <SmsV2Provider>');
  return v;
}
