import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SCRIPT_SECTIONS } from './scriptContent';

interface Recording {
  id: string;
  section_index: number;
  audio_path: string;
  audio_url: string;
  created_at: string;
}

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '5891') {
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F3EE] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-10 w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="border-2 border-[#0A0A0A] rounded-lg px-2 py-0.5 text-sm font-bold tracking-wider" style={{ fontFamily: 'Sora, sans-serif' }}>nf</div>
          <span className="text-lg tracking-[2px]" style={{ fontFamily: 'Sora, sans-serif' }}>stay</span>
        </div>
        <p className="text-[#6B7280] text-sm mb-6">Enter PIN to access recording studio</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false); }}
            className="w-full text-center text-2xl tracking-[12px] border border-[#E5E5E5] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1E9A80] mb-4"
            placeholder="----"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mb-3">Wrong PIN</p>}
          <button type="submit" className="w-full bg-[#1E9A80] text-white font-medium rounded-xl py-3 hover:opacity-90 transition-opacity">
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}

function AudioRecorder({ sectionIndex, recordings, onNewRecording, onDelete }: {
  sectionIndex: number;
  recordings: Recording[];
  onNewRecording: (blob: Blob) => Promise<void>;
  onDelete: (rec: Recording) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        setUploading(true);
        await onNewRecording(blob);
        setUploading(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert('Microphone access denied. Please allow microphone access to record.');
    }
  }, [onNewRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const playRecording = (rec: Recording) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(rec.audio_url);
    audioRef.current = audio;
    setPlayingId(rec.id);
    audio.onended = () => setPlayingId(null);
    audio.play();
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
  };

  const sectionRecordings = recordings.filter((r) => r.section_index === sectionIndex);

  return (
    <div className="border-b border-[#E5E7EB] pb-6 mb-8">
      <div className="flex items-center gap-3 mb-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={uploading}
            className="flex items-center gap-2 bg-[#1E9A80] text-white text-sm font-medium rounded-full px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <span className="w-3 h-3 rounded-full bg-white" />
            {uploading ? 'Saving...' : `Record Section ${sectionIndex + 1}`}
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 bg-red-500 text-white text-sm font-medium rounded-full px-4 py-2 hover:opacity-90 transition-opacity animate-pulse"
          >
            <span className="w-3 h-3 rounded-sm bg-white" />
            Stop Recording
          </button>
        )}
        {sectionRecordings.length > 0 && (
          <span className="text-xs text-[#6B7280]">{sectionRecordings.length} take{sectionRecordings.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {sectionRecordings.length > 0 && (
        <div className="space-y-2">
          {sectionRecordings.map((rec, i) => (
            <div key={rec.id} className="flex items-center gap-3 bg-[#F3F3EE] rounded-lg px-3 py-2">
              <span className="text-xs text-[#6B7280] w-16">Take {i + 1}</span>
              <span className="text-xs text-[#9CA3AF]">
                {new Date(rec.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
              {playingId === rec.id ? (
                <button onClick={stopPlayback} className="text-xs font-medium text-[#1E9A80] hover:underline">Stop</button>
              ) : (
                <button onClick={() => playRecording(rec)} className="text-xs font-medium text-[#1E9A80] hover:underline">Play</button>
              )}
              <button onClick={() => { stopPlayback(); onDelete(rec); }} className="text-xs font-medium text-red-500 hover:underline ml-auto">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ScriptPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [editedContent, setEditedContent] = useState<Record<number, string>>({});
  const [recordings, setRecordings] = useState<Recording[]>([]);

  useEffect(() => {
    if (!unlocked) return;
    loadRecordings();
  }, [unlocked]);

  const loadRecordings = async () => {
    const { data } = await (supabase.from('script_recordings' as any) as any)
      .select('id, section_index, audio_path, created_at')
      .order('created_at', { ascending: true });
    if (!data) return;

    const mapped: Recording[] = (data as any[]).map((r) => {
      const { data: urlData } = supabase.storage.from('script-recordings').getPublicUrl(r.audio_path);
      return { ...r, audio_url: urlData.publicUrl };
    });
    setRecordings(mapped);
  };

  const handleNewRecording = useCallback(async (blob: Blob, sectionIndex: number) => {
    const filename = `section-${sectionIndex}-${Date.now()}.webm`;
    const { error: uploadErr } = await supabase.storage
      .from('script-recordings')
      .upload(filename, blob, { contentType: 'audio/webm' });
    if (uploadErr) { alert('Upload failed: ' + uploadErr.message); return; }

    await (supabase.from('script_recordings' as any) as any)
      .insert({ section_index: sectionIndex, audio_path: filename });

    await loadRecordings();
  }, []);

  const handleDelete = useCallback(async (rec: Recording) => {
    await supabase.storage.from('script-recordings').remove([rec.audio_path]);
    await (supabase.from('script_recordings' as any) as any).delete().eq('id', rec.id);
    setRecordings((prev) => prev.filter((r) => r.id !== rec.id));
  }, []);

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  const currentContent = editedContent[activeSection] ?? SCRIPT_SECTIONS[activeSection]?.content ?? '';

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar — section list */}
      <aside className="w-72 border-r border-[#E5E7EB] bg-[#F3F3EE] overflow-y-auto h-screen sticky top-0">
        <div className="p-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <div className="border-2 border-[#0A0A0A] rounded-lg px-1.5 py-0.5 text-xs font-bold tracking-wider" style={{ fontFamily: 'Sora, sans-serif' }}>nf</div>
            <span className="text-sm tracking-[2px]" style={{ fontFamily: 'Sora, sans-serif' }}>stay</span>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">Recording Studio</p>
        </div>
        <nav className="p-2">
          {SCRIPT_SECTIONS.map((section, i) => {
            const hasRecording = recordings.some((r) => r.section_index === i);
            return (
              <button
                key={i}
                onClick={() => setActiveSection(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                  activeSection === i
                    ? 'bg-white text-[#1A1A1A] font-medium shadow-sm border border-[#E5E7EB]'
                    : 'text-[#6B7280] hover:bg-white/60'
                }`}
              >
                <span className="text-xs text-[#9CA3AF] mr-2">{i + 1}.</span>
                {section.title}
                {hasRecording && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[#1E9A80]" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content — recorder at top, then script */}
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-3xl mx-auto px-8 py-12">
          {/* Section header */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#1E9A80] uppercase tracking-wider mb-1">
              Section {activeSection + 1} of {SCRIPT_SECTIONS.length}
            </p>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">{SCRIPT_SECTIONS[activeSection].title}</h1>
          </div>

          {/* Audio recorder — AT THE TOP */}
          <AudioRecorder
            sectionIndex={activeSection}
            recordings={recordings}
            onNewRecording={(blob) => handleNewRecording(blob, activeSection)}
            onDelete={handleDelete}
          />

          {/* Editable script content — key forces remount on section change */}
          <div
            key={activeSection}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const text = e.currentTarget?.innerText;
              if (text != null) setEditedContent((prev) => ({ ...prev, [activeSection]: text }));
            }}
            className="text-xl leading-relaxed text-[#1A1A1A] whitespace-pre-wrap focus:outline-none focus:ring-2 focus:ring-[#1E9A80]/20 rounded-xl p-4 -mx-4 min-h-[300px]"
          >
            {currentContent}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-10 pt-6 border-t border-[#E5E7EB]">
            <button
              onClick={() => setActiveSection((prev) => Math.max(0, prev - 1))}
              disabled={activeSection === 0}
              className="text-sm font-medium text-[#6B7280] hover:text-[#1A1A1A] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-[#9CA3AF]">{activeSection + 1} / {SCRIPT_SECTIONS.length}</span>
            <button
              onClick={() => setActiveSection((prev) => Math.min(SCRIPT_SECTIONS.length - 1, prev + 1))}
              disabled={activeSection === SCRIPT_SECTIONS.length - 1}
              className="text-sm font-medium bg-[#1E9A80] text-white rounded-full px-4 py-2 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next Section
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
