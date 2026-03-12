import { useState } from 'react';
import { universityModules as initialModules, type UniversityModule } from '@/data/mockData';
import { X, ChevronRight, BookOpen, CheckCircle } from 'lucide-react';

const moduleContent: Record<string, string[]> = {
  'mod-1': [
    'Welcome to Rent-to-Rent! In this module, you\'ll learn the fundamentals of the R2R business model and how to set yourself up for success.',
    'Lesson 1: What is Rent-to-Rent? — Rent-to-rent is a strategy where you lease a property from a landlord on a long-term basis and then sublet it on a short-term basis for a higher return. The difference between what you pay the landlord and what you earn from guests is your profit.',
    'Lesson 2: Is R2R Right for You? — R2R requires minimal upfront capital compared to buying property. However, it does require dedication, good communication skills, and the ability to manage multiple properties.',
    'Lesson 3: Setting Up Your Business — Register as a sole trader or limited company. Get landlord insurance, public liability insurance, and ensure you comply with local regulations.',
    'Lesson 4: Understanding Your Market — Research your target city. Look at average nightly rates on Airbnb, occupancy rates, and seasonal demand patterns.',
    'Lesson 5: Financial Planning — Create a spreadsheet to track rent paid, income earned, cleaning costs, utilities, and your net profit per property.',
    'Lesson 6: Your First 30-Day Plan — Week 1: Set up your business. Week 2: Start property hunting. Week 3: View properties and pitch landlords. Week 4: Secure your first deal.',
  ],
  'mod-2': [
    'Finding the right properties is the foundation of a successful R2R business. This module covers everything from where to look to what to look for.',
    'Lesson 1: Where to Find Properties — Use property portals like Rightmove, Zoopla, and OpenRent. Also explore letting agent relationships and direct landlord outreach.',
    'Lesson 2: What Makes a Good R2R Property — Look for properties in areas with high short-term rental demand, near transport links, city centres, universities, or tourist attractions.',
    'Lesson 3: Analysing Deal Numbers — Calculate your expected monthly rent, estimated Airbnb income, cleaning costs, utilities, and net profit. Aim for at least £300/month profit per unit.',
    'Lesson 4: Viewing Properties — What to look for during viewings: condition, furnishing potential, parking, local amenities, and landlord flexibility.',
    'Lesson 5: Red Flags to Avoid — Avoid properties with restrictive leases, high service charges, unfriendly neighbours, or areas with low short-term rental demand.',
    'Lesson 6: Building Agent Relationships — Letting agents can be your best source of deals. Build rapport, explain your business model clearly, and follow up consistently.',
    'Lesson 7: Using NFsTay to Find Deals — How to use the platform\'s filters, save favourites, and set up deal alerts for your target areas.',
    'Lesson 8: Batch Viewing Strategy — Schedule multiple viewings in one area on the same day to maximise efficiency and compare properties directly.',
  ],
  'mod-3': [
    'Winning over landlords is a skill that can be learned. This module gives you proven scripts and strategies to secure deals.',
    'Lesson 1: Understanding Landlord Concerns — Landlords worry about damage, non-payment, and anti-social behaviour. Address these concerns proactively.',
    'Lesson 2: Your Elevator Pitch — "I run a professional short-term rental management company. I guarantee your rent every month, maintain the property to a high standard, and handle all guest interactions."',
    'Lesson 3: The Initial Call Script — Step-by-step guide to your first phone call with a landlord or agent, including objection handling.',
    'Lesson 4: The Viewing Pitch — What to say during property viewings to build trust and demonstrate professionalism.',
    'Lesson 5: Closing the Deal — How to negotiate terms, draft a proposal, and get the landlord to say yes.',
  ],
  'mod-4': [
    'Listing your properties on the right platforms is crucial for maximising bookings and revenue.',
    'Lesson 1: Airbnb Optimisation — Create listings that stand out with professional photos, compelling descriptions, and competitive pricing.',
    'Lesson 2: Booking.com Setup — How to list on Booking.com and manage the different commission structure.',
    'Lesson 3: Vrbo & Other Platforms — Expanding your reach across multiple short-term rental platforms.',
    'Lesson 4: Direct Booking Websites — Setting up your own booking website to avoid platform fees.',
  ],
  'mod-5': [
    'The right furnishing can dramatically increase your nightly rates and booking frequency.',
    'Lesson 1: Budget Furnishing — How to furnish a property for under £2,000 using IKEA, Facebook Marketplace, and wholesale suppliers.',
    'Lesson 2: Photography Tips — Take professional-looking photos with your smartphone. Lighting, angles, and staging tips.',
    'Lesson 3: Design That Books — What colours, layouts, and amenities guests look for when choosing a short-term rental.',
    'Lesson 4: The Welcome Pack — Create a memorable first impression with a well-stocked welcome pack and house manual.',
    'Lesson 5: Maintenance & Upkeep — Keep your properties in top condition to maintain high ratings and repeat bookings.',
    'Lesson 6: Seasonal Refreshes — Update your decor and photos seasonally to keep listings fresh and attractive.',
  ],
  'mod-6': [
    'Staying compliant is essential for a sustainable R2R business.',
    'Lesson 1: Planning Permission — When do you need planning permission for short-term letting? Understanding the 90-day rule in London.',
    'Lesson 2: Insurance Requirements — Landlord insurance, public liability, and contents insurance explained.',
    'Lesson 3: Health & Safety — Fire safety, gas safety certificates, electrical checks, and risk assessments.',
    'Lesson 4: Tax Obligations — Income tax, allowable expenses, and keeping proper records for HMRC.',
    'Lesson 5: Guest Contracts — What terms and conditions to include in your guest agreements.',
    'Lesson 6: Data Protection — GDPR compliance when collecting and storing guest information.',
    'Lesson 7: Local Authority Regulations — How to check and comply with local council rules on short-term letting.',
  ],
  'mod-7': [
    'Maximise your revenue with smart pricing strategies.',
    'Lesson 1: Dynamic Pricing — Use tools like PriceLabs or Wheelhouse to automatically adjust your nightly rates based on demand.',
    'Lesson 2: Minimum Stay Strategies — When to use 2-night minimums vs. 1-night stays for maximum revenue.',
    'Lesson 3: Seasonal Pricing — Adjust rates for peak seasons, events, and holidays in your area.',
    'Lesson 4: Discount Strategies — Weekly and monthly discounts to fill gaps and maintain occupancy.',
    'Lesson 5: Competitor Analysis — Monitor similar listings in your area to stay competitive.',
  ],
  'mod-8': [
    'Master the art of outreach to landlords and agents.',
    'Lesson 1: Cold Calling Framework — A step-by-step framework for cold calling letting agents and landlords.',
    'Lesson 2: Email Templates — 5 proven email templates for different scenarios: initial outreach, follow-up, post-viewing, and proposal.',
    'Lesson 3: LinkedIn Outreach — How to find and connect with landlords on LinkedIn.',
    'Lesson 4: Follow-Up Cadence — The ideal follow-up schedule: when and how often to reach out without being pushy.',
  ],
  'mod-9': [
    'Smooth operations are the key to scaling your R2R portfolio.',
    'Lesson 1: Cleaning Systems — How to find, train, and manage reliable cleaners. Checklists and quality standards.',
    'Lesson 2: Check-In Solutions — Smart locks, key safes, and self-check-in systems compared.',
    'Lesson 3: Guest Communication — Templates for pre-arrival, during stay, and post-checkout messages.',
    'Lesson 4: Problem Solving — How to handle common guest issues: noise complaints, lockouts, maintenance emergencies.',
    'Lesson 5: Reviews & Ratings — Strategies to consistently earn 5-star reviews.',
    'Lesson 6: Automation Tools — Hospitable, Guesty, and other tools to automate your operations.',
    'Lesson 7: Scaling to 5+ Properties — Systems and team building for managing a growing portfolio.',
    'Lesson 8: Monthly Reporting — Track occupancy, revenue, expenses, and profit across all properties.',
  ],
};

export default function UniversityPage() {
  const [modules, setModules] = useState<UniversityModule[]>(initialModules);
  const [openModule, setOpenModule] = useState<string | null>(null);

  const completed = modules.filter(m => m.status === 'completed').length;
  const activeModule = modules.find(m => m.id === openModule);

  const handleOpenModule = (id: string) => {
    setOpenModule(id);
    // Auto set to in-progress if not started
    setModules(prev => prev.map(m => m.id === id && m.status === 'not-started' ? { ...m, status: 'in-progress' as const } : m));
  };

  const handleSetStatus = (id: string, status: UniversityModule['status']) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, status } : m));
  };

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground">Airbnb University</h1>
      <p className="text-sm text-muted-foreground mt-1">Master rent-to-rent operations from zero to operator.</p>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-foreground">{completed} of {modules.length} modules completed</span>
      </div>
      <div className="w-full max-w-[360px] h-1.5 bg-border rounded-full mt-2 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(completed / modules.length) * 100}%` }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
        {modules.map(mod => (
          <div key={mod.id} className="bg-card border border-border rounded-2xl p-5 card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{mod.emoji}</span>
                <h3 className="text-base font-bold text-foreground">{mod.title}</h3>
              </div>
              <img src={mod.image} className="w-[72px] h-12 rounded-lg object-cover" alt="" loading="lazy" />
            </div>
            <p className="text-sm text-muted-foreground">{mod.description}</p>
            <div className="mt-3">
              {mod.status === 'completed' && <span className="badge-green">Completed ✓</span>}
              {mod.status === 'in-progress' && <span className="badge-amber">In progress</span>}
              {mod.status === 'not-started' && <span className="badge-gray">Not started</span>}
            </div>
            <button
              onClick={() => handleOpenModule(mod.id)}
              className="w-full h-10 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm mt-4 hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
            >
              Open Module <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Module Content Modal */}
      {openModule && activeModule && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setOpenModule(null)}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-[680px] max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeModule.emoji}</span>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{activeModule.title}</h2>
                  <p className="text-xs text-muted-foreground">{activeModule.description}</p>
                </div>
              </div>
              <button onClick={() => setOpenModule(null)} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            {/* Status buttons */}
            <div className="flex gap-2 px-6 pt-4">
              {([
                { status: 'in-progress' as const, label: 'Still Studying', icon: BookOpen },
                { status: 'completed' as const, label: 'Completed', icon: CheckCircle },
              ]).map(s => (
                <button
                  key={s.status}
                  onClick={() => handleSetStatus(openModule, s.status)}
                  className={`h-9 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                    activeModule.status === s.status
                      ? s.status === 'completed' ? 'bg-primary text-primary-foreground' : 'bg-amber-100 text-amber-800'
                      : 'border border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <s.icon className="w-3.5 h-3.5" /> {s.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(moduleContent[openModule] || ['Content coming soon...']).map((text, i) => (
                <div key={i} className={i === 0 ? '' : 'pl-4 border-l-2 border-primary/20'}>
                  <p className={`text-sm leading-relaxed ${i === 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
