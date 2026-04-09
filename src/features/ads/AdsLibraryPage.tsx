import { useState } from 'react';
import { ExternalLink, Lock, Play, Download, Volume2, User } from 'lucide-react';

const PASSWORD = 'nfstay2026';

interface Ad {
  id: string;
  num: number;
  title: string;
  hook: string;
  voiceover: string;
  voiceType: string;
  cta: string;
  duration: string;
  sfxNotes: string;
  musicDirection: string;
  previewUrl: string;
}

const ADS: Ad[] = [
  {
    id: 'ad-01-airbnb-income',
    num: 1,
    title: 'Airbnb Income Without Owning',
    hook: 'Want to start Airbnb, but don\'t own a property?',
    voiceover: 'You do not need to buy a property first. nfstay shows you landlord-approved properties across the UK. You find a deal, message the landlord, and get started faster.',
    voiceType: 'Female British, warm',
    cta: 'Find your first Airbnb deal',
    duration: '22s',
    sfxNotes: 'Whoosh on hook, pop on card enter, message send on chat',
    musicDirection: 'Modern, curious, building momentum',
    previewUrl: 'https://motion.nfstay.com/code-examples?example=ad-01-airbnb-income',
  },
  {
    id: 'ad-02-uber-to-operator',
    num: 2,
    title: 'Uber to Airbnb Operator',
    hook: 'Still driving Uber every night?',
    voiceover: 'You can keep driving. But you can also start building something bigger. nfstay helps you find landlord-approved Airbnb properties in the UK, so you can start operating instead of only working shifts.',
    voiceType: 'Male British, confident',
    cta: 'Start building your first property income',
    duration: '24s',
    sfxNotes: 'Whoosh on hook, soft impact on "bigger", pop on card',
    musicDirection: 'Motivational, modern beat',
    previewUrl: 'https://motion.nfstay.com/code-examples?example=ad-02-uber-to-operator',
  },
  {
    id: 'ad-03-learn-from-zero',
    num: 3,
    title: 'Learn Airbnb From Zero',
    hook: 'Want to learn Airbnb from zero?',
    voiceover: 'Start with the basics. Learn how rent-to-rent works. Then find real deals and message real landlords, all in one place.',
    voiceType: 'Female British, encouraging',
    cta: 'Learn and start today',
    duration: '20s',
    sfxNotes: 'Whoosh, step pops, tap on app',
    musicDirection: 'Friendly, warm, educational',
    previewUrl: 'https://motion.nfstay.com/code-examples?example=ad-03-learn-from-zero',
  },
  {
    id: 'ad-04-start-small',
    num: 4,
    title: 'Start Small, Start With One',
    hook: 'You do not need to start big',
    voiceover: 'You do not need ten properties. You need one good deal. nfstay helps you find landlord-approved properties so you can start small and grow from there.',
    voiceType: 'Male British, calm',
    cta: 'Start with one deal',
    duration: '20s',
    sfxNotes: 'Whoosh, number slam, pop on card',
    musicDirection: 'Calm, confident, minimal',
    previewUrl: 'https://motion.nfstay.com/code-examples?example=ad-04-start-small',
  },
  {
    id: 'ad-05-landlords-approved',
    num: 5,
    title: 'Landlords Already Approved',
    hook: 'Landlords already said yes',
    voiceover: 'No guessing. No wasting time on the wrong properties. nfstay shows you Airbnb properties where the landlord already allows the model.',
    voiceType: 'Female British, direct',
    cta: 'See approved deals now',
    duration: '20s',
    sfxNotes: 'Checkmark sound, whoosh, pop on pills',
    musicDirection: 'Direct, modern, trustworthy',
    previewUrl: 'https://motion.nfstay.com/code-examples?example=ad-05-landlords-approved',
  },
  {
    id: 'ad-06-stop-booking',
    num: 6,
    title: 'Stop Booking, Start Operating',
    hook: 'Stop booking Airbnbs. Start operating them.',
    voiceover: 'If you already love staying in Airbnbs, learn how the business works on the other side. nfstay helps you learn, find deals, and start operating in the UK.',
    voiceType: 'Male British, energetic',
    cta: 'Start operating today',
    duration: '22s',
    sfxNotes: 'Whoosh, flip sound, step pops',
    musicDirection: 'Energetic, modern, building',
    previewUrl: 'https://motion.nfstay.com/code-examples?example=ad-06-stop-booking',
  },
  {
    id: 'ad-07-direct-booking',
    num: 7,
    title: 'Direct Booking Website',
    hook: 'Get your own Airbnb website',
    voiceover: 'Build your own direct booking website. Take bookings through your own brand. Keep more control, and grow beyond the platforms.',
    voiceType: 'Female British, professional',
    cta: 'Build your booking site',
    duration: '20s',
    sfxNotes: 'Whoosh, tap on app, pill pops',
    musicDirection: 'Professional, aspirational',
    previewUrl: 'https://motion.nfstay.com/code-examples?example=ad-07-direct-booking',
  },
  {
    id: 'ad-08-one-platform',
    num: 8,
    title: 'One Platform, Not Ten Tools',
    hook: 'Deals, messages, CRM, learning. In one place.',
    voiceover: 'Stop using ten different tools. nfstay gives you deals, landlord messages, CRM tracking, learning, and direct booking tools in one platform.',
    voiceType: 'Male British, matter-of-fact',
    cta: 'Run it all in one place',
    duration: '22s',
    sfxNotes: 'Cascade pops for pills, whoosh, tap',
    musicDirection: 'Clean, efficient, modern',
    previewUrl: 'https://motion.nfstay.com/code-examples?example=ad-08-one-platform',
  },
  {
    id: 'ad-09-uk-cities',
    num: 9,
    title: 'UK City-Based Deals',
    hook: 'Find Airbnb deals in UK cities',
    voiceover: 'Manchester, Leeds, Birmingham, Liverpool, London. Browse Airbnb-ready opportunities near you, and start where you already know the market.',
    voiceType: 'Female British, warm',
    cta: 'See deals in your city',
    duration: '22s',
    sfxNotes: 'Map pin sounds for each city, whoosh, pop',
    musicDirection: 'Warm, local, community-feel',
    previewUrl: 'https://motion.nfstay.com/code-examples?example=ad-09-uk-cities',
  },
  {
    id: 'ad-10-first-deal',
    num: 10,
    title: 'From First Message to Signed',
    hook: 'This is how you get your first deal',
    voiceover: 'Find a property. Message the landlord. Track the conversation. Book the viewing. Move the deal to signed.',
    voiceType: 'Male British, confident',
    cta: 'Start your first deal',
    duration: '24s',
    sfxNotes: 'Step pops, message send, checkmark at end',
    musicDirection: 'Confident, progressive, building',
    previewUrl: 'https://motion.nfstay.com/code-examples?example=ad-10-first-deal',
  },
  {
    id: 'ad-11-beginner-to-operator',
    num: 11,
    title: 'Beginner to Operator',
    hook: 'From beginner to Airbnb operator',
    voiceover: 'You do not need to know everything on day one. You just need a better starting point. nfstay helps you learn, take action, and grow step by step.',
    voiceType: 'Female British, encouraging',
    cta: 'Become an operator',
    duration: '20s',
    sfxNotes: 'Whoosh, step pops, soft impact',
    musicDirection: 'Encouraging, warm, progressive',
    previewUrl: 'https://motion.nfstay.com/code-examples?example=ad-11-beginner-to-operator',
  },
  {
    id: 'ad-12-hospitality',
    num: 12,
    title: 'Hospitality Workers',
    hook: 'Already working in hospitality?',
    voiceover: 'If you already understand guests, cleaning, bookings, or hosting, you are closer than you think. Use that experience to start operating properties with landlord approval.',
    voiceType: 'Male British, respectful',
    cta: 'Turn your experience into a business',
    duration: '22s',
    sfxNotes: 'Cascade pill pops, whoosh, card enter',
    musicDirection: 'Respectful, warm, aspirational',
    previewUrl: 'https://motion.nfstay.com/code-examples?example=ad-12-hospitality',
  },
  {
    id: 'ad-13-jv-partner',
    num: 13,
    title: 'JV Partner Angle',
    hook: 'Do not have everything? Partner up.',
    voiceover: 'Some people find deals. Some people bring experience. Some people bring support. nfstay helps you find the opportunity, then build from there.',
    voiceType: 'Female British, collaborative',
    cta: 'Find your next opportunity',
    duration: '22s',
    sfxNotes: 'Whoosh, row slides, tap on app',
    musicDirection: 'Collaborative, warm, modern',
    previewUrl: 'https://motion.nfstay.com/code-examples?example=ad-13-jv-partner',
  },
  {
    id: 'ad-14-real-platform',
    num: 14,
    title: 'Real Platform, Not Hype',
    hook: 'Not just another Airbnb course',
    voiceover: 'This is not just videos and promises. nfstay gives you real deals, real landlords, real messages, and real tools to move from idea to action.',
    voiceType: 'Male British, straight-talking',
    cta: 'See the real platform',
    duration: '22s',
    sfxNotes: 'Whoosh, pill pops, tap on app',
    musicDirection: 'Straight-talking, honest, modern',
    previewUrl: 'https://motion.nfstay.com/code-examples?example=ad-14-real-platform',
  },
  {
    id: 'ad-15-your-system',
    num: 15,
    title: 'Your First UK Airbnb System',
    hook: 'Your Airbnb system starts here',
    voiceover: 'Learn the model. Find landlord-approved properties. Message landlords. Track deals. Build your booking site. Grow your portfolio with one clear system.',
    voiceType: 'Female British, confident',
    cta: 'Start with nfstay',
    duration: '26s',
    sfxNotes: 'Step pops for each row, logo reveal whoosh, shimmer',
    musicDirection: 'Confident, building, cinematic close',
    previewUrl: 'https://motion.nfstay.com/code-examples?example=ad-15-your-system',
  },
];

export default function AdsLibraryPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === PASSWORD) {
      setUnlocked(true);
      setError('');
    } else {
      setError('Wrong password');
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#F3F3EE] flex items-center justify-center p-6">
        <form onSubmit={handleUnlock} className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl border-2 border-[#0A0A0A] flex items-center justify-center text-sm font-bold" style={{ fontFamily: 'Sora, Inter, sans-serif' }}>
                nf
              </div>
              <span className="text-2xl font-normal tracking-wider text-[#0A0A0A]" style={{ fontFamily: 'Sora, Inter, sans-serif' }}>stay</span>
            </div>
            <h1 className="text-lg font-semibold text-[#1A1A1A] mb-1">Ads Library</h1>
            <p className="text-sm text-[#6B7280] mb-6">Enter password to access</p>
            <div className="relative mb-4">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E9A80] focus:border-transparent"
              />
            </div>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#1E9A80] text-white text-sm font-semibold hover:bg-[#1a8a72] transition-colors"
            >
              Unlock
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F3EE]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg border-2 border-[#0A0A0A] flex items-center justify-center text-xs font-bold" style={{ fontFamily: 'Sora, Inter, sans-serif' }}>
                nf
              </div>
              <span className="text-lg font-normal tracking-wider text-[#0A0A0A]" style={{ fontFamily: 'Sora, Inter, sans-serif' }}>stay</span>
            </div>
            <div className="h-6 w-px bg-[#E5E7EB]" />
            <h1 className="text-sm font-semibold text-[#1A1A1A]">Ads Library</h1>
            <span className="text-xs font-medium text-[#1E9A80] bg-[rgba(30,154,128,0.08)] px-2.5 py-1 rounded-full">
              {ADS.length} ads
            </span>
          </div>
          <a
            href="https://motion.nfstay.com/code-examples"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#6B7280] hover:text-[#1A1A1A] flex items-center gap-1.5 transition-colors"
          >
            Motion Studio <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Ad detail modal */}
      {selectedAd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={() => setSelectedAd(null)}>
          <div className="bg-white rounded-2xl border border-[#E5E7EB] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#E5E7EB]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#1E9A80] bg-[rgba(30,154,128,0.08)] w-8 h-8 rounded-lg flex items-center justify-center">
                    {selectedAd.num}
                  </span>
                  <h2 className="text-lg font-semibold text-[#1A1A1A]">{selectedAd.title}</h2>
                </div>
                <button onClick={() => setSelectedAd(null)} className="text-[#9CA3AF] hover:text-[#1A1A1A] text-xl">&times;</button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Hook</label>
                <p className="text-base font-semibold text-[#1A1A1A] mt-1">{selectedAd.hook}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Voiceover Script</label>
                <p className="text-sm text-[#6B7280] mt-1 leading-relaxed">{selectedAd.voiceover}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Voice
                  </label>
                  <p className="text-sm text-[#1A1A1A] mt-1">{selectedAd.voiceType}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Duration</label>
                  <p className="text-sm text-[#1A1A1A] mt-1">{selectedAd.duration}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 className="w-3 h-3" /> SFX Notes
                </label>
                <p className="text-sm text-[#6B7280] mt-1">{selectedAd.sfxNotes}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Music Direction</label>
                <p className="text-sm text-[#6B7280] mt-1">{selectedAd.musicDirection}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">CTA</label>
                <p className="text-sm font-semibold text-[#1E9A80] mt-1">{selectedAd.cta}</p>
              </div>
              <div className="pt-3 flex gap-3">
                <a
                  href={selectedAd.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-xl bg-[#1E9A80] text-white text-sm font-semibold text-center hover:bg-[#1a8a72] transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" /> Preview in Motion Studio
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADS.map((ad) => (
            <button
              key={ad.id}
              onClick={() => setSelectedAd(ad)}
              className="text-left bg-white rounded-xl border border-[#E5E7EB] p-5 hover:shadow-md hover:border-[#1E9A80]/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold text-[#1E9A80] bg-[rgba(30,154,128,0.08)] w-7 h-7 rounded-lg flex items-center justify-center">
                  {ad.num}
                </span>
                <span className="text-xs text-[#9CA3AF]">{ad.duration}</span>
              </div>
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1.5 group-hover:text-[#1E9A80] transition-colors">
                {ad.title}
              </h3>
              <p className="text-xs text-[#6B7280] line-clamp-2 mb-3">{ad.hook}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#9CA3AF]">{ad.voiceType}</span>
                <div className="flex items-center gap-1 text-xs text-[#1E9A80] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-3 h-3" /> Preview
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
