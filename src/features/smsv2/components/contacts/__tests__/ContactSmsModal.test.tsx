// ContactSmsModal — minimum behavioural contract.
//
// PR 50 (Hugo 2026-04-30): wired the SMS button to this modal.
// PR 63 (Hugo 2026-04-27 / multi-channel PR 4): added a SMS / WhatsApp /
//   Email channel picker. These tests pin all three send routes so a
//   future refactor can't silently regress one to a no-op.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { type ReactNode } from 'react';

const invokeMock = vi.fn().mockResolvedValue({ data: { sid: 'SM_TEST' }, error: null });
const pushToastMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => {
  // Two queries are issued: one against wk_sms_templates (.select.order)
  // and one against wk_numbers (.select.eq.eq.order). Build a fluent
  // chain that returns sensible fixtures for either.
  const buildQuery = (table: string) => {
    const q: Record<string, unknown> = {};
    q.select = vi.fn().mockReturnValue(q);
    q.eq = vi.fn().mockReturnValue(q);
    q.order = vi.fn().mockImplementation(() => {
      if (table === 'wk_numbers') {
        return Promise.resolve({
          data: [
            { id: 'n-elijah', e164: 'elijah@mail.nfstay.com' },
            { id: 'n-georgia', e164: 'georgia@mail.nfstay.com' },
          ],
          error: null,
        });
      }
      return Promise.resolve({
        data: [
          { id: 't1', name: 'Welcome', body_md: 'Hi {{first_name}}, this is {{agent_first_name}}.', move_to_stage_id: null, channel: null },
          { id: 't2', name: 'Email follow-up', body_md: 'Just checking in.', move_to_stage_id: null, channel: 'email' },
          { id: 't3', name: 'WA tease', body_md: 'Hey on WhatsApp.', move_to_stage_id: null, channel: 'whatsapp' },
        ],
        error: null,
      });
    });
    return q;
  };
  return {
    supabase: {
      from: vi.fn((t: string) => buildQuery(t)),
      functions: {
        invoke: (...args: unknown[]) => invokeMock(...args),
      },
    },
  };
});

vi.mock('../../../store/SmsV2Store', async () => {
  const actual = await vi.importActual<typeof import('../../../store/SmsV2Store')>(
    '../../../store/SmsV2Store'
  );
  return {
    ...actual,
    useSmsV2: () => ({
      ...actual.useSmsV2(),
      pushToast: pushToastMock,
    }),
  };
});

import ContactSmsModal from '../ContactSmsModal';
import { SmsV2Provider } from '../../../store/SmsV2Store';
import type { Contact } from '../../../types';

const fixture: Contact = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Hugo Souza',
  phone: '+447863992555',
  email: 'hugodesouzax@gmail.com',
  tags: [],
  isHot: false,
  customFields: {},
  pipelineColumnId: 'col-interested',
  ownerAgentId: undefined,
  createdAt: new Date().toISOString(),
  lastContactAt: undefined,
  dealValuePence: undefined,
};

function wrap(ui: ReactNode) {
  return <SmsV2Provider>{ui}</SmsV2Provider>;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  invokeMock.mockClear();
  pushToastMock.mockClear();
});

describe('ContactSmsModal', () => {
  it('renders nothing when contact is null', () => {
    const { queryByTestId } = render(
      wrap(<ContactSmsModal contact={null} onClose={() => {}} agentFirstName="Hugo" />)
    );
    expect(queryByTestId('contact-sms-modal')).toBeNull();
  });

  it('renders with the contact name + phone in the header', () => {
    const { getByTestId, container } = render(
      wrap(<ContactSmsModal contact={fixture} onClose={() => {}} agentFirstName="Hugo" />)
    );
    expect(getByTestId('contact-sms-modal')).toBeTruthy();
    const text = container.textContent ?? '';
    expect(text).toMatch(/Hugo Souza|Hugo/);
    expect(text).toMatch(/\+447863992555/);
  });

  it('Send button fires sms-send with the typed body', async () => {
    const { getByTestId } = render(
      wrap(<ContactSmsModal contact={fixture} onClose={() => {}} agentFirstName="Hugo" />)
    );
    const textarea = getByTestId('contact-sms-modal-body') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Hi from the contacts page' } });
    fireEvent.click(getByTestId('contact-sms-modal-send'));
    await tick();
    expect(invokeMock).toHaveBeenCalledWith('sms-send', {
      body: { to: '+447863992555', body: 'Hi from the contacts page' },
    });
    expect(pushToastMock).toHaveBeenCalledWith('SMS sent', 'success');
  });

  it('Send button is disabled when body is empty', () => {
    const { getByTestId } = render(
      wrap(<ContactSmsModal contact={fixture} onClose={() => {}} agentFirstName="Hugo" />)
    );
    const sendBtn = getByTestId('contact-sms-modal-send') as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(true);
  });

  it('clicking the backdrop fires onClose', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      wrap(<ContactSmsModal contact={fixture} onClose={onClose} agentFirstName="Hugo" />)
    );
    fireEvent.click(getByTestId('contact-sms-modal'));
    expect(onClose).toHaveBeenCalled();
  });

  // Multi-channel coverage (PR 63 / multi-channel PR 4).

  it('switching to WhatsApp routes Send to wazzup-send with contact_id + body', async () => {
    const { getByTestId } = render(
      wrap(<ContactSmsModal contact={fixture} onClose={() => {}} agentFirstName="Hugo" />)
    );
    fireEvent.click(getByTestId('channel-radio-whatsapp'));
    const textarea = getByTestId('contact-sms-modal-body') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Hey via WhatsApp' } });
    fireEvent.click(getByTestId('contact-sms-modal-send'));
    await tick();
    expect(invokeMock).toHaveBeenCalledWith('wazzup-send', {
      body: { contact_id: fixture.id, body: 'Hey via WhatsApp' },
    });
    expect(pushToastMock).toHaveBeenCalledWith('WhatsApp sent', 'success');
  });

  it('switching to Email requires a non-empty subject + routes to wk-email-send', async () => {
    const { getByTestId } = render(
      wrap(<ContactSmsModal contact={fixture} onClose={() => {}} agentFirstName="Hugo" />)
    );
    fireEvent.click(getByTestId('channel-radio-email'));
    const textarea = getByTestId('contact-sms-modal-body') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Hi via email' } });
    const sendBtn = getByTestId('contact-sms-modal-send') as HTMLButtonElement;
    // Body filled but subject empty → still disabled.
    expect(sendBtn.disabled).toBe(true);
    fireEvent.change(getByTestId('contact-sms-modal-subject'), {
      target: { value: 'Welcome to NFstay' },
    });
    expect(sendBtn.disabled).toBe(false);
    fireEvent.click(sendBtn);
    await tick();
    expect(invokeMock).toHaveBeenCalledWith(
      'wk-email-send',
      expect.objectContaining({
        body: expect.objectContaining({
          contact_id: fixture.id,
          subject: 'Welcome to NFstay',
          body: 'Hi via email',
        }),
      })
    );
  });

  it('email mode loads from-address picker from wk_numbers (Elijah + Georgia)', async () => {
    const { getByTestId, queryByTestId } = render(
      wrap(<ContactSmsModal contact={fixture} onClose={() => {}} agentFirstName="Hugo" />)
    );
    // Wait for the wk_numbers fetch to resolve.
    await tick();
    fireEvent.click(getByTestId('channel-radio-email'));
    await tick();
    const fromSelect = queryByTestId('contact-sms-modal-from') as HTMLSelectElement | null;
    expect(fromSelect).toBeTruthy();
    const optionLabels = Array.from(fromSelect!.options).map((o) => o.textContent);
    expect(optionLabels.some((l) => l?.includes('elijah@mail.nfstay.com'))).toBe(true);
    expect(optionLabels.some((l) => l?.includes('georgia@mail.nfstay.com'))).toBe(true);
  });
});
