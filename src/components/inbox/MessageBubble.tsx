import type { Message } from './types';

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const time = new Date(message.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (message.messageType === 'system') {
    return (
      <div className="text-center py-3">
        <span className="text-xs text-gray-400">{message.body}</span>
      </div>
    );
  }

  const isMe = message.senderId === 'me';

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${isMe ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-foreground'}`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.body}</p>
        <div className={`text-[10px] mt-1 ${isMe ? 'text-gray-400' : 'text-muted-foreground'}`}>{time}</div>
      </div>
    </div>
  );
}
