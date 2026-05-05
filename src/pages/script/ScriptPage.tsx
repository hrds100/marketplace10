import { useState, useRef, useCallback } from 'react';
import { SCRIPT_SECTIONS } from './scriptContent';

interface Recording {
  url: string;
  blob: Blob;
  timestamp: number;
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

function AudioRecorder({ sectionIndex }: { sectionIndex: number }) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
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

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordings((prev) => [...prev, { url, blob, timestamp: Date.now() }]);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert('Microphone access denied. Please allow microphone access to record.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const playRecording = (index: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(recordings[index].url);
    audioRef.current = audio;
    setPlayingIndex(index);
    audio.onended = () => setPlayingIndex(null);
    audio.play();
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingIndex(null);
  };

  const deleteRecording = (index: number) => {
    if (playingIndex === index) stopPlayback();
    URL.revokeObjectURL(recordings[index].url);
    setRecordings((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-[#E5E7EB] pt-4 mt-6">
      <div className="flex items-center gap-3 mb-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 bg-[#1E9A80] text-white text-sm font-medium rounded-full px-4 py-2 hover:opacity-90 transition-opacity"
          >
            <span className="w-3 h-3 rounded-full bg-white" />
            Record Section {sectionIndex + 1}
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
        {recordings.length > 0 && (
          <span className="text-xs text-[#6B7280]">{recordings.length} take{recordings.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {recordings.length > 0 && (
        <div className="space-y-2">
          {recordings.map((rec, i) => (
            <div key={rec.timestamp} className="flex items-center gap-3 bg-[#F3F3EE] rounded-lg px-3 py-2">
              <span className="text-xs text-[#6B7280] w-16">Take {i + 1}</span>
              {playingIndex === i ? (
                <button onClick={stopPlayback} className="text-xs font-medium text-[#1E9A80] hover:underline">Stop</button>
              ) : (
                <button onClick={() => playRecording(i)} className="text-xs font-medium text-[#1E9A80] hover:underline">Play</button>
              )}
              <button onClick={() => deleteRecording(i)} className="text-xs font-medium text-red-500 hover:underline ml-auto">Delete</button>
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
          {SCRIPT_SECTIONS.map((section, i) => (
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
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content — teleprompter + recorder */}
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-3xl mx-auto px-8 py-12">
          {/* Section header */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-[#1E9A80] uppercase tracking-wider mb-1">
              Section {activeSection + 1} of {SCRIPT_SECTIONS.length}
            </p>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">{SCRIPT_SECTIONS[activeSection].title}</h1>
          </div>

          {/* Editable script content */}
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              setEditedContent((prev) => ({ ...prev, [activeSection]: e.currentTarget.innerText }));
            }}
            className="text-xl leading-relaxed text-[#1A1A1A] whitespace-pre-wrap focus:outline-none focus:ring-2 focus:ring-[#1E9A80]/20 rounded-xl p-4 -mx-4 min-h-[300px]"
          >
            {currentContent}
          </div>

          {/* Audio recorder */}
          <AudioRecorder sectionIndex={activeSection} />

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
