// ContactSmsModal — minimum behavioural contract.
// Hugo's 2026-04-30 bug: SMS buttons on /smsv2/contacts and
// /smsv2/contacts/:id were stubbed. Phase 2 PR wires this modal as the
// destination. This test pins the wiring so the buttons can't silently
// regress to no-ops.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { type ReactNode } from 'react';

const invokeMock = vi.fn().mockResolvedValue({ data: { sid: 'SM_TEST' }, error: null });
const pushToastMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => {
  const buildQuery = () => {
    const q: Record<string, unknown> = {};
    q.select = vi.fn().mockReturnValue(q);
    q.order = vi.fn().mockResolvedValue({
      data: [
        { id: 't1', name: 'Welcome', body_md: 'Hi {{first_name}}, this is {{agent_first_name}}.' },
        { id: 't2', name: 'Follow-up', body_md: 'Just checking in.' },
      ],
      error: null,
    });
    return q;
  };
  return {
    supabase: {
      from: vi.fn(buildQuery),
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
  email: undefined,
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
    // Wait a tick for the async invoke
    await new Promise((r) => setTimeout(r, 0));
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
});
