import { useParams, useNavigate } from 'react-router-dom';
import { getLessonById, modules as staticModules } from '@/data/universityData';
import { useUniversityProgress } from '@/hooks/useUniversityProgress';
import { useAuth } from '@/hooks/useAuth';
import { callAIChat } from '@/hooks/useAIChat';
import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, Zap, CheckSquare, AlertTriangle, MapPin, Copy, Code,
  BookOpen, Sparkles, ArrowUp, Lock as LockIcon, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

// CSS confetti
function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-[300]">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full animate-confetti-particle"
          style={{
            background: ['#1DB954', '#065F46', '#ECFDF5', '#10B981', '#34D399'][i % 5],
            left: `${20 + Math.random() * 60}%`,
            top: '40%',
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${1 + Math.random() * 1}s`,
          }}
        />
      ))}
    </div>
  );
}

function tierSatisfied(required: string, userTier: string): boolean {
  const tiers = ['free', 'monthly', 'yearly', 'lifetime', 'pro', 'premium'];
  const reqIdx = tiers.indexOf(required);
  const userIdx = tiers.indexOf(userTier);
  if (reqIdx <= 0) return true;
  return userIdx >= reqIdx;
}

export default function LessonPage() {
  const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    toggleStep, isStepDone, countCompletedSteps, completeLesson, isLessonComplete,
    progress, toggleQuickWinTask, isQuickWinTaskDone, allQuickWinTasksDone,
    curriculumModules, userTier,
  } = useUniversityProgress();

  // Try DB-driven curriculum first, then static fallback
  const dbResult = (() => {
    const dbMod = curriculumModules.find(m => m.id === (moduleId || ''));
    if (dbMod) {
      const lesson = dbMod.lessons.find(l => l.id === (lessonId || ''));
      if (lesson) return { module: dbMod, lesson };
    }
    return null;
  })();
  const staticResult = getLessonById(moduleId || '', lessonId || '');
  const result = dbResult ?? staticResult;

  const [showConfetti, setShowConfetti] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, typing]);

  if (!result) return <div className="p-8 text-center" style={{ color: '#6B7280' }}>Lesson not found</div>;

  const { module: mod, lesson } = result;

  // Tier gating
  const dbMod = curriculumModules.find(m => m.id === (moduleId || ''));
  const moduleTierRequired = (dbMod as unknown as { tier_required?: string } | undefined)?.tier_required ?? 'free';
  const isGated = !tierSatisfied(moduleTierRequired, userTier);
  const lessonIndex = mod.lessons.findIndex(l => l.id === lesson.id);
  const prevLesson = lessonIndex > 0 ? mod.lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < mod.lessons.length - 1 ? mod.lessons[lessonIndex + 1] : null;
  const completed = countCompletedSteps(mod.id, lesson.id, lesson.steps.length);
  const allStepsDone = completed === lesson.steps.length;
  const lessonDone = isLessonComplete(mod.id, lesson.id);

  const handleClaimXP = () => {
    completeLesson(mod.id, lesson.id);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2500);
  };

  const handleCopyScript = async () => {
    if (lesson.script) {
      await navigator.clipboard.writeText(lesson.script);
      toast.success('Copied ✓', { description: 'Script copied to clipboard' });
    }
  };

  const handleSendChat = async (text?: string) => {
    const msg = text || chatInput.trim();
    if (!msg || typing) return;
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput('');
    setTyping(true);

    const lessonContext = lesson.content.slice(0, 3).join(' ').substring(0, 400);
    const reply = await callAIChat({
      message: msg,
      lessonTitle: lesson.title,
      moduleTitle: mod.title,
      lessonContext,
      userId: user?.id,
    });

    setTyping(false);
    setChatMessages(prev => [...prev, { role: 'ai', text: reply }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  const progressPct = (lessonIndex / mod.lessons.length) * 100 + (lessonDone ? (1 / mod.lessons.length) * 100 : 0);

  // Show gated overlay instead of lesson content
  if (isGated) {
    return (
      <div className="max-w-[860px] mx-auto pb-20">
        <button onClick={() => navigate(`/university/${mod.id}`)} className="flex items-center gap-1 text-sm hover:opacity-70 mb-6" style={{ color: '#6B7280' }}>
          <ArrowLeft className="w-4 h-4" />{mod.title}
        </button>
        <div className="rounded-2xl border-2 p-12 flex flex-col items-center justify-center text-center" style={{ borderColor: '#E5E7EB' }}>
          <LockIcon className="w-10 h-10 mb-4" style={{ color: '#9CA3AF' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>Upgrade to {moduleTierRequired} to access this lesson</h2>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>This lesson is part of the {moduleTierRequired} tier.</p>
          <button
            onClick={() => { toast.info(`Upgrade to ${moduleTierRequired} to access this lesson`); navigate('/dashboard/settings'); }}
            className="h-11 px-6 rounded-[10px] text-sm font-semibold inline-flex items-center gap-2"
            style={{ background: '#111827', color: '#FFFFFF' }}
          >
            Upgrade Plan <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[860px] mx-auto pb-20">
      <Confetti show={showConfetti} />

      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[150] h-1" style={{ background: '#E5E7EB' }}>
        <div className="h-full transition-all duration-500" style={{ width: `${progressPct}%`, background: '#1DB954' }} />
      </div>

      {/* Sticky top bar */}
      <div className="sticky top-1 z-[140] rounded-xl border px-4 py-2.5 flex items-center justify-between gap-3 mb-6" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <button onClick={() => navigate(`/university/${mod.id}`)} className="flex items-center gap-1 text-sm hover:opacity-70" style={{ color: '#6B7280' }}>
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{mod.title}</span>
        </button>
        <span className="text-xs font-medium" style={{ color: '#6B7280' }}>Lesson {lessonIndex + 1} of {mod.lessons.length}</span>
        <div className="flex gap-1">
          {mod.lessons.map((l, i) => (
            <div key={l.id} className="w-2 h-2 rounded-full" style={{ background: isLessonComplete(mod.id, l.id) ? '#1DB954' : i === lessonIndex ? '#111827' : '#D1D5DB' }} />
          ))}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="text-xs mb-3" style={{ color: '#9CA3AF' }}>
        Academy → {mod.title} → Lesson {lessonIndex + 1}
      </div>

      {/* Title */}
      <h1 className="text-[26px] font-bold" style={{ color: '#111827' }}>{lesson.emoji} {lesson.title}</h1>
      <div className="flex items-center gap-3 mt-2">
        <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#F3F4F6', color: '#6B7280' }}>{lesson.duration} min</span>
        <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#ECFDF5', color: '#065F46' }}>
          <Zap className="w-3 h-3 mr-0.5" /> +80 XP
        </span>
      </div>

      {/* Why it matters */}
      <div className="mt-8 rounded-lg p-4" style={{ background: '#ECFDF5', borderLeft: '3px solid #1DB954' }}>
        <p className="text-sm italic" style={{ color: '#065F46' }}>{lesson.whyItMatters}</p>
      </div>

      {/* Main content */}
      <div className="mt-8 space-y-5">
        {lesson.content.map((p, i) => (
          <p key={i} className="text-[15px] leading-[1.7]" style={{ color: '#374151' }}
            dangerouslySetInnerHTML={{
              __html: p.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#065F46;font-weight:600">$1</strong>')
            }}
          />
        ))}
      </div>

      {/* Action Steps */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare className="w-5 h-5" style={{ color: '#1DB954' }} />
          <h2 className="text-base font-bold" style={{ color: '#111827' }}>Your action steps</h2>
        </div>
        <div className="space-y-2">
          {lesson.steps.map((step, i) => {
            const done = isStepDone(mod.id, lesson.id, i);
            return (
              <div
                key={i}
                className="rounded-[10px] border p-3 px-4 flex items-center gap-3 cursor-pointer transition-all duration-200"
                style={{
                  background: done ? '#ECFDF5' : '#FFFFFF',
                  borderColor: '#E5E7EB',
                }}
                onClick={() => toggleStep(mod.id, lesson.id, i)}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={{
                    borderColor: done ? '#1DB954' : '#D1D5DB',
                    background: done ? '#1DB954' : 'transparent',
                  }}
                >
                  {done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span className="text-sm font-medium" style={{
                  color: done ? '#6B7280' : '#111827',
                  textDecoration: done ? 'line-through' : 'none',
                }}>{step}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(completed / lesson.steps.length) * 100}%`, background: '#1DB954' }} />
          </div>
          <span className="text-xs" style={{ color: '#6B7280' }}>{completed} of {lesson.steps.length}</span>
        </div>

        {allStepsDone && !lessonDone && (
          <button onClick={handleClaimXP} className="mt-4 h-11 px-6 rounded-[10px] text-sm font-semibold inline-flex items-center gap-2 transition-opacity hover:opacity-90" style={{ background: '#111827', color: '#FFFFFF' }}>
            Well done! Claim your XP → <Zap className="w-4 h-4" />
          </button>
        )}
        {lessonDone && (
          <div className="mt-4 rounded-[10px] p-3 flex items-center gap-2" style={{ background: '#ECFDF5', border: '1px solid #1DB954' }}>
            <span className="text-sm font-semibold" style={{ color: '#065F46' }}>✓ Lesson completed — XP claimed!</span>
          </div>
        )}
      </div>

      {/* Common Mistakes */}
      {lesson.commonMistakes.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" style={{ color: '#F59E0B' }} />
            <h2 className="text-base font-bold" style={{ color: '#111827' }}>Common mistakes</h2>
          </div>
          <div className="space-y-2">
            {lesson.commonMistakes.map((m, i) => (
              <div key={i} className="rounded-lg p-3 px-4 text-sm" style={{ background: '#FFFBEB', borderLeft: '3px solid #F59E0B', color: '#92400E' }}>
                ⚠️ {m}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UK Notes */}
      {lesson.ukSpecificNotes.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5" style={{ color: '#3B82F6' }} />
            <h2 className="text-base font-bold" style={{ color: '#111827' }}>UK-specific notes</h2>
          </div>
          <div className="space-y-2">
            {lesson.ukSpecificNotes.map((n, i) => (
              <div key={i} className="rounded-lg p-3 px-4 text-sm" style={{ background: '#EFF6FF', borderLeft: '3px solid #3B82F6', color: '#1E40AF' }}>
                {n}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Win */}
      {lesson.quickAction && (
        <div className="mt-10 rounded-xl border-2 p-5" style={{ borderColor: '#1DB954' }}>
          <h3 className="text-base font-bold" style={{ color: '#111827' }}>⚡ Quick Win: {lesson.quickAction.title}</h3>
          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Complete these now to stay ahead</p>
          <div className="space-y-2 mt-4">
            {lesson.quickAction.tasks.map((task, i) => {
              const done = isQuickWinTaskDone(mod.id, lesson.id, i);
              return (
                <div
                  key={i}
                  className="rounded-[10px] border p-3 px-4 flex items-center gap-3 cursor-pointer transition-all duration-200"
                  style={{ background: done ? '#ECFDF5' : '#FFFFFF', borderColor: '#E5E7EB' }}
                  onClick={() => {
                    toggleQuickWinTask(mod.id, lesson.id, i);
                    // Check if all done after toggle
                    if (!done && lesson.quickAction) {
                      const allOthersDone = lesson.quickAction.tasks.every((_, j) => j === i || isQuickWinTaskDone(mod.id, lesson.id, j));
                      if (allOthersDone) {
                        toast.success('Quick Win Unlocked! 🎯', { duration: 3000 });
                      }
                    }
                  }}
                >
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200" style={{ borderColor: done ? '#1DB954' : '#D1D5DB', background: done ? '#1DB954' : 'transparent' }}>
                    {done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className="text-sm font-medium" style={{ color: done ? '#6B7280' : '#111827', textDecoration: done ? 'line-through' : 'none' }}>{task}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Script block */}
      {lesson.script && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5" style={{ color: '#6B7280' }} />
            <h2 className="text-base font-bold" style={{ color: '#111827' }}>Script</h2>
          </div>
          <div className="relative rounded-xl p-6" style={{ background: '#0F172A' }}>
            <button onClick={handleCopyScript} className="absolute top-4 right-4 h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:opacity-80 transition-opacity" style={{ background: '#1E293B', color: '#E2E8F0' }}>
              <Copy className="w-3.5 h-3.5" /> Copy script
            </button>
            <pre className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#E2E8F0', fontFamily: 'monospace' }}>{lesson.script}</pre>
          </div>
        </div>
      )}

      {/* Lesson Navigation */}
      <div className="mt-10 flex items-center justify-between gap-4">
        {prevLesson ? (
          <button onClick={() => navigate(`/university/${mod.id}/${prevLesson.id}`)} className="h-11 px-5 rounded-[10px] text-sm font-medium border flex items-center gap-2 hover:opacity-80 transition-opacity" style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
            <ArrowLeft className="w-4 h-4" /> Previous lesson
          </button>
        ) : <div />}
        <div className="flex gap-1">
          {mod.lessons.map((l, i) => (
            <div key={l.id} className="w-2 h-2 rounded-full" style={{ background: isLessonComplete(mod.id, l.id) ? '#1DB954' : i === lessonIndex ? '#111827' : '#D1D5DB' }} />
          ))}
        </div>
        {nextLesson ? (
          <button onClick={() => navigate(`/university/${mod.id}/${nextLesson.id}`)} className="h-11 px-5 rounded-[10px] text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity" style={{ background: '#111827', color: '#FFFFFF' }}>
            Next lesson <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={() => navigate(`/university/${mod.id}`)} className="h-11 px-5 rounded-[10px] text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity" style={{ background: '#1DB954', color: '#FFFFFF' }}>
            Back to module <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* AI Consultant Box */}
      <div className="mt-12" style={{ borderTop: '2px solid #1DB954', paddingTop: '32px' }}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <Sparkles className="w-[22px] h-[22px] mt-0.5 flex-shrink-0" style={{ color: '#1DB954' }} />
            <div>
              <h3 className="text-lg font-bold" style={{ color: '#111827' }}>nfstay AI Consultant</h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>Every insight and framework we have built — one question away.</p>
            </div>
          </div>
          <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#ECFDF5', color: '#065F46' }}>
            Powered by nfstay
          </span>
        </div>

        {/* Context card */}
        <div className="mt-4 rounded-xl border p-4" style={{ background: '#F7F8FA', borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4" style={{ color: '#6B7280' }} />
            <span className="text-xs font-medium" style={{ color: '#6B7280' }}>Currently on: {lesson.title}</span>
          </div>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            You're learning with our full operational playbook behind this interface. Ask anything about this lesson, go deeper on a concept, or apply it to your specific city and situation. This is your consultant — not a FAQ page.
          </p>
        </div>

        {/* Chat window */}
        <div className="mt-4 rounded-2xl border overflow-hidden" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <div className="p-5 space-y-4 overflow-y-auto" style={{ minHeight: '280px', maxHeight: '400px' }}>
            {chatMessages.length === 0 && !typing && (
              <div className="space-y-2">
                {lesson.suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendChat(prompt)}
                    className="block w-auto text-left text-sm px-4 py-2 rounded-full border cursor-pointer transition-all duration-200"
                    style={{ background: '#F7F8FA', borderColor: '#E5E7EB', color: '#374151' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1DB954'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0" style={{ background: '#1DB954' }}>
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                )}
                <div
                  className="max-w-[80%] text-sm px-4 py-2.5 whitespace-pre-wrap"
                  style={{
                    borderRadius: msg.role === 'user' ? '14px 14px 0 14px' : '14px 14px 14px 0',
                    background: msg.role === 'user' ? '#111827' : '#ECFDF5',
                    color: msg.role === 'user' ? '#FFFFFF' : '#065F46',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0" style={{ background: '#1DB954' }}>
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl flex gap-1" style={{ background: '#ECFDF5' }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#1DB954', animationDelay: `${j * 200}ms`, animationDuration: '800ms' }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center border-t px-4 py-3 gap-2" style={{ borderColor: '#E5E7EB' }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about this lesson..."
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: '#111827', padding: '6px 0' }}
            />
            <button
              onClick={() => handleSendChat()}
              disabled={!chatInput.trim() || typing}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity flex-shrink-0"
              style={{
                background: chatInput.trim() ? '#1DB954' : '#E5E7EB',
                color: '#FFFFFF',
                opacity: chatInput.trim() && !typing ? 1 : 0.5,
                cursor: chatInput.trim() && !typing ? 'pointer' : 'not-allowed',
              }}
            >
              <ArrowUp className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        <p className="text-center mt-3 text-xs" style={{ color: '#9CA3AF' }}>
          🔐 Your questions are private. This is your personal consultant.
        </p>
      </div>
    </div>
  );
}
