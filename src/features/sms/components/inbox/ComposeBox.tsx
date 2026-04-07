import { useState, useRef, useCallback } from 'react';
import { Clock, FileText, Paperclip, Send, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { SmsQuickReply, SmsTemplate } from '../../types';

interface ComposeBoxProps {
  onSend: (body: string) => void;
  templates: SmsTemplate[];
  quickReplies: SmsQuickReply[];
}

export default function ComposeBox({ onSend, templates, quickReplies }: ComposeBoxProps) {
  const [body, setBody] = useState('');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = body.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setBody('');
    toast('Message sent');
  }, [body, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertTemplate = (tpl: SmsTemplate) => {
    setBody(tpl.body);
    setTemplateOpen(false);
    textareaRef.current?.focus();
  };

  const sendQuickReply = (qr: SmsQuickReply) => {
    onSend(qr.body);
    setQuickReplyOpen(false);
    toast('Message sent');
  };

  return (
    <div className="border-t border-[#E5E7EB] bg-white">
      {/* Action bar */}
      <div className="flex items-center gap-1 px-3 pt-2">
        <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <FileText className="h-4 w-4 text-[#6B7280]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0">
            <div className="px-3 py-2 border-b border-[#E5E7EB]">
              <p className="text-xs font-medium text-[#1A1A1A]">Templates</p>
            </div>
            <ScrollArea className="max-h-60">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => insertTemplate(tpl)}
                  className="w-full text-left px-3 py-2 hover:bg-black/[0.04] transition-colors"
                >
                  <p className="text-sm font-medium text-[#1A1A1A]">{tpl.name}</p>
                  <p className="text-xs text-[#9CA3AF] truncate mt-0.5">{tpl.body}</p>
                </button>
              ))}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <Popover open={quickReplyOpen} onOpenChange={setQuickReplyOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Zap className="h-4 w-4 text-[#6B7280]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-0">
            <div className="px-3 py-2 border-b border-[#E5E7EB]">
              <p className="text-xs font-medium text-[#1A1A1A]">Quick Replies</p>
            </div>
            <ScrollArea className="max-h-48">
              {quickReplies.map((qr) => (
                <button
                  key={qr.id}
                  type="button"
                  onClick={() => sendQuickReply(qr)}
                  className="w-full text-left px-3 py-2 hover:bg-black/[0.04] transition-colors"
                >
                  <p className="text-sm font-medium text-[#1A1A1A]">{qr.label}</p>
                  <p className="text-xs text-[#9CA3AF] truncate mt-0.5">{qr.body}</p>
                </button>
              ))}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Paperclip className="h-4 w-4 text-[#6B7280]" />
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Clock className="h-4 w-4 text-[#6B7280]" />
        </Button>
      </div>

      {/* Input row */}
      <div className="flex items-end gap-2 px-3 pb-3 pt-1">
        <Textarea
          ref={textareaRef}
          placeholder="Type a message..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="resize-none min-h-[40px] max-h-[120px] text-sm border-[#E5E7EB] focus-visible:ring-[#1E9A80]"
        />
        <Button
          onClick={handleSend}
          disabled={!body.trim()}
          className="h-10 w-10 shrink-0 bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white rounded-lg"
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
