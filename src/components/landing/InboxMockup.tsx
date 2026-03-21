const THREADS = [
  { name: 'James Thornton', initials: 'JT', preview: 'Hi, is the Manchester flat still available?', time: '2m', unread: true, color: '#3b82f6' },
  { name: 'Sarah Chen', initials: 'SC', preview: 'I can do Thursday for a viewing', time: '1h', unread: false, color: '#8b5cf6' },
  { name: 'David Walsh', initials: 'DW', preview: 'Great, I\'ll send the contract over', time: '3h', unread: false, color: '#1e9a80' },
];

const MESSAGES = [
  { from: 'them', text: 'Hi there! I saw your listing for the 2-bed flat in Ancoats. Is it still available?', time: '10:24 AM' },
  { from: 'me', text: 'Hi James! Yes, it\'s still available. Monthly rent is £850 with an estimated profit of £1,200/mo on Airbnb.', time: '10:26 AM' },
  { from: 'them', text: 'That sounds great. When can I arrange a viewing?', time: '10:28 AM' },
  { from: 'me', text: 'I can do Thursday or Friday this week. Which works better for you?', time: '10:30 AM' },
];

export default function InboxMockup() {
  return (
    <div className="flex h-full text-[11px]">
      {/* Thread list */}
      <div className="w-[200px] border-r flex flex-col" style={{ borderColor: '#e8e5df' }}>
        <div className="px-3 py-2.5 border-b" style={{ borderColor: '#e8e5df' }}>
          <span className="font-semibold text-[#0a0a0a] text-xs">Messages</span>
          <span className="ml-1.5 text-[9px] font-medium text-white bg-[#1e9a80] rounded-full px-1.5 py-0.5">3</span>
        </div>
        {THREADS.map((t, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
              i === 0 ? 'bg-[#ecfdf5]' : 'hover:bg-[#fafafa]'
            }`}
            style={i < THREADS.length - 1 ? { borderBottom: '1px solid #f3f4f6' } : {}}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0"
              style={{ background: t.color }}
            >
              {t.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#0a0a0a] text-[10px] truncate">{t.name}</span>
                <span className="text-[9px] text-[#9ca3af] flex-shrink-0">{t.time}</span>
              </div>
              <p className="text-[9px] text-[#737373] truncate mt-0.5">{t.preview}</p>
            </div>
            {t.unread && <span className="w-1.5 h-1.5 rounded-full bg-[#1e9a80] flex-shrink-0 mt-2" />}
          </div>
        ))}
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="px-4 py-2.5 border-b flex items-center gap-2.5" style={{ borderColor: '#e8e5df' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-semibold" style={{ background: '#3b82f6' }}>
            JT
          </div>
          <div>
            <span className="font-semibold text-[#0a0a0a] text-[11px]">James Thornton</span>
            <span className="block text-[9px] text-[#1e9a80]">● Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-3 space-y-2.5 overflow-auto" style={{ background: '#fafafa' }}>
          {MESSAGES.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                  m.from === 'me'
                    ? 'bg-[#1e9a80] text-white rounded-br-md'
                    : 'bg-white border rounded-bl-md'
                }`}
                style={m.from === 'them' ? { borderColor: '#e8e5df' } : {}}
              >
                <p className="text-[10px] leading-relaxed">{m.text}</p>
                <span className={`text-[8px] block mt-1 ${m.from === 'me' ? 'text-white/60' : 'text-[#9ca3af]'}`}>
                  {m.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="px-3 py-2 border-t" style={{ borderColor: '#e8e5df' }}>
          <div className="flex items-center gap-2 h-8 rounded-lg border px-2.5" style={{ borderColor: '#e5e7eb', background: '#fff' }}>
            <span className="text-[10px] text-[#9ca3af]">Type a message...</span>
            <div className="ml-auto w-5 h-5 rounded-full bg-[#1e9a80] flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
