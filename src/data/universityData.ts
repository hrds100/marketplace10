export interface LessonStep {
  text: string;
}

export interface QuickAction {
  title: string;
  tasks: string[];
}

export interface Lesson {
  id: string;
  emoji: string;
  title: string;
  duration: number;
  whyItMatters: string;
  content: string[];
  steps: string[];
  commonMistakes: string[];
  ukSpecificNotes: string[];
  quickAction?: QuickAction;
  script?: string;
  suggestedPrompts: string[];
}

export interface Module {
  id: string;
  emoji: string;
  title: string;
  summary: string;
  status: 'completed' | 'in-progress' | 'not-started';
  image: string;
  xpReward: number;
  lessons: Lesson[];
  learningOutcomes: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockCondition: string;
}

export const achievements: Achievement[] = [
  { id: 'first-steps', title: 'First Steps', description: 'Completed module 1', icon: '✅', unlockCondition: 'complete-module-1' },
  { id: 'deal-hunter', title: 'Deal Hunter', description: 'Viewed first deal', icon: '✅', unlockCondition: 'view-first-deal' },
  { id: 'negotiator', title: 'Negotiator', description: 'Complete module 3', icon: '🔒', unlockCondition: 'complete-module-3' },
  { id: 'full-operator', title: 'Full Operator', description: 'Complete all modules', icon: '🔒', unlockCondition: 'complete-all-modules' },
  { id: 'script-master', title: 'Script Master', description: 'Complete outreach module', icon: '🔒', unlockCondition: 'complete-module-8' },
];

export const modules: Module[] = [
  {
    id: 'getting-started',
    emoji: '🚀',
    title: 'Getting Started',
    summary: 'Set up your R2R business from scratch — choose your model, register your company, and build a 90-day launch plan.',
    status: 'completed',
    image: 'https://picsum.photos/seed/uni-gs/640/360',
    xpReward: 320,
    learningOutcomes: [
      'Choose the right rent-to-rent model for your area',
      'Set up a professional business entity',
      'Know what makes a good R2R deal',
      'Build and execute a 90-day launch plan',
    ],
    lessons: [
      {
        id: 'choose-model',
        emoji: '🧭',
        title: 'Choose your rent-to-rent model',
        duration: 8,
        whyItMatters: 'Most beginners waste months mixing strategies. A focused operator moves faster and burns less cash.',
        content: [
          'The main UK models are SA (serviced accommodation), HMO (house of multiple occupation), company lets, and supported housing. Each has different compliance requirements, capital needs, and demand drivers.',
          'Choose based on local demand, property type, ease of entry, and compliance burden. Match to one model for 90 days — ignore the others. Spreading thin is the number one killer of new operators.',
          'A clean rule: choose the model with the simplest path to authorised operation and predictable demand. If contractors dominate your area, SA makes sense. If student demand is strong, HMO might fit.',
          'The key is commitment. Pick, execute, learn, adjust. Do not try to run three models from day one.',
        ],
        steps: [
          'Choose your target city',
          'Identify the strongest demand driver in that city',
          'Match the demand to one R2R model',
          'Write down why this model fits your situation',
          'Commit to this model for 90 days',
        ],
        commonMistakes: [
          'Trying SA, HMO, and company lets simultaneously',
          'Copying a guru strategy that doesn\'t fit your area',
          'Ignoring compliance difficulty when choosing a model',
        ],
        ukSpecificNotes: [
          'Manchester, Birmingham, Leeds, and Sheffield all support different models by micro-area. Demand is postcode-level, not city-level.',
        ],
        quickAction: {
          title: 'Lock in your model today',
          tasks: [
            'Open a map of your target city',
            'List the top 3 demand drivers you can identify',
            'Write one sentence: "I am going to focus on [model] because [reason]"',
          ],
        },
        suggestedPrompts: [
          'Which model suits Manchester best?',
          'How do I know if my area has enough demand?',
          'What should I do in my first 30 days?',
        ],
      },
      {
        id: 'setup-business',
        emoji: '🏢',
        title: 'Set up the business properly',
        duration: 7,
        whyItMatters: 'Landlords assess whether you look safe to work with, not just your deal.',
        content: [
          'Before you pitch a single landlord, your business needs to look professional. This means a limited company, a business bank account, a professional email address, and a branded overview document.',
          'Reduce uncertainty for the landlord. A clean documents folder, a company number, and a professional email address signal that you are serious and organised.',
          'Your landlord pack should include: company overview, insurance details, references if you have them, and a clear explanation of how the arrangement works.',
        ],
        steps: [
          'Set up a limited company on Companies House',
          'Open a business bank account',
          'Buy a domain and set up professional email',
          'Create a one-page company overview PDF',
          'Prepare your landlord pack with key documents',
        ],
        commonMistakes: [
          'Pitching landlords with no documents ready',
          'Using a personal Gmail address for business',
          'Sending voice notes instead of clean written information',
        ],
        ukSpecificNotes: [
          'Agents respond better to clear company details and a professional online presence.',
          'Landlords want stable and low-maintenance operators, not flashy pitches.',
        ],
        quickAction: {
          title: 'Get your basics sorted',
          tasks: [
            'Register your company name today',
            'Order business cards or create a digital card',
            'Draft your one-page overview document',
          ],
        },
        suggestedPrompts: [
          'What should my company overview include?',
          'How much does it cost to set up a limited company?',
          'What insurance do I need before starting?',
        ],
      },
      {
        id: 'good-deal',
        emoji: '📊',
        title: 'Know what makes a good R2R deal',
        duration: 9,
        whyItMatters: 'Too many people call something great just because rent feels low. Good deals survive scrutiny.',
        content: [
          'Four pillars define a good deal: numbers, permission, demand, and operational suitability. All four must be present — not just one or two.',
          'Gross income must cover rent, bills, cleaning, platform fees, maintenance, furnishing amortisation, and a buffer. If your numbers only work at peak occupancy, it is not a good deal.',
          'Good operators underwrite conservatively. They assume 65-70% occupancy, not 90%. They use realistic average nightly rates, not peak weekend prices. The boring months pay your bills.',
        ],
        steps: [
          'List all monthly fixed costs for a typical property',
          'Estimate variable costs (cleaning, supplies, maintenance)',
          'Stress-test your numbers at 65% occupancy',
          'Verify the property has permission for your intended use',
          'Assess the layout and location for operational suitability',
        ],
        commonMistakes: [
          'Ignoring setup costs and furnishing investment',
          'Using peak weekend rates as your average nightly rate',
          'Skipping lease restrictions and assuming permission',
          'Assuming demand without checking actual comparable performance',
        ],
        ukSpecificNotes: [
          '2-3 bed flexibility does not automatically mean profitability. One road can outperform the next by a wide margin.',
        ],
        quickAction: {
          title: 'Build your deal calculator',
          tasks: [
            'Create a spreadsheet with rent, bills, cleaning, and platform fees',
            'Add a column for conservative occupancy (65%)',
            'Calculate your minimum viable nightly rate',
          ],
        },
        suggestedPrompts: [
          'What occupancy rate should I use for planning?',
          'How do I calculate my break-even nightly rate?',
          'What costs do beginners usually forget?',
        ],
      },
      {
        id: 'launch-plan',
        emoji: '🗓️',
        title: 'Build your 90-day launch plan',
        duration: 6,
        whyItMatters: 'People fail not because R2R is impossible but because they polish branding for 6 weeks and never build a pipeline.',
        content: [
          '90 days is your sprint. Break it into three phases: clarity, deal flow, and repetition.',
          'Days 1-30: Lock your market, complete your setup, define your criteria, and prepare your outreach materials. No pitching yet — just preparation.',
          'Days 31-60: Start outreach. Make calls, send emails, attend viewings, and refine your pitch based on real feedback. Volume matters here.',
          'Days 61-90: Negotiate, sign agreements, handle compliance, and launch your first property. This is where preparation meets execution.',
        ],
        steps: [
          'Set 30-day outreach and viewing targets',
          'Break monthly targets into weekly actions',
          'Track replies, calls, and viewings in a simple spreadsheet',
          'Review bottlenecks every Friday afternoon',
          'Adjust your approach based on data, not feelings',
        ],
        commonMistakes: [
          'Researching forever without taking action',
          'Setting goals without activity-based targets',
          'Quitting after a handful of rejections',
          'Confusing motion with actual progress',
        ],
        ukSpecificNotes: [],
        quickAction: {
          title: 'Write your first weekly plan',
          tasks: [
            'Set a target: contact 10 agents this week',
            'Block 2 hours per day for outreach',
            'Create a tracking sheet for responses',
          ],
        },
        suggestedPrompts: [
          'What should my first week look like?',
          'How many agents should I contact per day?',
          'What if I have a full-time job — how do I fit this in?',
        ],
      },
    ],
  },
  {
    id: 'property-hunting',
    emoji: '🏠',
    title: 'Property Hunting',
    summary: 'Find the best rent-to-rent opportunities by learning to filter, analyse demand, and avoid bad stock.',
    status: 'in-progress',
    image: 'https://picsum.photos/seed/uni-ph/640/360',
    xpReward: 320,
    learningOutcomes: [
      'Choose the right area based on demand drivers',
      'Filter listings quickly to save time',
      'Check demand and revenue properly',
      'Avoid bad stock and fake deals',
    ],
    lessons: [
      {
        id: 'choose-area',
        emoji: '🗺️',
        title: 'Choose the right area first',
        duration: 8,
        whyItMatters: 'A pretty flat in a weak location is still a weak deal.',
        content: [
          'Define your demand type first. Are you targeting contractors, relocations, healthcare workers, students, or leisure travellers? The answer determines your area.',
          'Right areas have strong transport links, employment centres, hospitals, business parks, or universities nearby. Being 5 minutes from a hospital beats a nicer unit in a dead pocket.',
          'Operational practicality matters too. Parking, access, safety, and cleaner availability all affect your margins and your sanity.',
        ],
        steps: [
          'Pick 3 target postcodes in your city',
          'Identify the demand driver for each postcode',
          'Check transport links and local amenities',
          'Review competitor stock on Airbnb in those areas',
          'Prioritise the most operationally practical streets',
        ],
        commonMistakes: [
          'Choosing based on cheap rent alone',
          'Thinking city centre always means demand',
          'Ignoring safety, parking, and access issues',
          'Picking areas based on hearsay without checking data',
        ],
        ukSpecificNotes: [
          'Manchester, Birmingham, and Leeds all have strong and weak micro-markets within the same city.',
        ],
        quickAction: {
          title: 'Map your target area',
          tasks: [
            'Open Google Maps and pin your 3 target postcodes',
            'List the nearest hospital, station, and business park for each',
            'Check Airbnb for 10+ active listings in each area',
          ],
        },
        suggestedPrompts: [
          'Which postcodes in Manchester have the best demand?',
          'How do I check if an area has enough Airbnb demand?',
          'What demand driver is most reliable for beginners?',
        ],
      },
      {
        id: 'filter-listings',
        emoji: '🔎',
        title: 'Filter listings quickly',
        duration: 7,
        whyItMatters: 'Your edge is not seeing every listing — it is spotting the 5% worth your time.',
        content: [
          'A good sourcing process starts with speed. You should be able to reject weak stock in under a minute.',
          'Property type, bedrooms, condition, access, parking, transport proximity, and listing wording all give you signals. Learn to read these fast.',
          'Save only listings that are worth deeper review. Everything else is noise.',
        ],
        steps: [
          'Scan the title and location for immediate red flags',
          'Review photos for layout suitability and condition',
          'Check if the property fits your chosen model',
          'Flag any restrictive wording in the listing',
          'Save only listings worth a phone call',
        ],
        commonMistakes: [
          'Over-analysing bad stock instead of moving on',
          'Getting emotionally attached to nice photos',
          'Ignoring block restrictions in leasehold flats',
          'Assuming landlord flexibility without asking',
        ],
        ukSpecificNotes: [
          '"No company lets" in a listing usually tells you enough.',
          'Leasehold flats need extra caution — always check freeholder rules.',
        ],
        quickAction: {
          title: 'Practice your filtering',
          tasks: [
            'Open Rightmove and scan 20 listings in your target area',
            'Reject 15 of them in under 60 seconds each',
            'Save the best 5 to a shortlist',
          ],
        },
        suggestedPrompts: [
          'What are the biggest red flags in a property listing?',
          'How do I tell if a flat allows short-term lets?',
          'Should I focus on houses or flats?',
        ],
      },
      {
        id: 'check-demand',
        emoji: '📈',
        title: 'Check demand and revenue properly',
        duration: 10,
        whyItMatters: 'Most bad deals look good on imaginary occupancy. Proper underwriting strips the fantasy out.',
        content: [
          'High nightly rates on portals do not equal real revenue. You need to look at actual availability patterns, competition density, and property quality.',
          'Use comps — comparable units with similar size, finish, capacity, location, and review count. What are they actually booking at, not what they are listed at?',
          'Underwrite conservatively. The boring weeks pay your bills. Event spikes are a bonus, not your baseline.',
        ],
        steps: [
          'Find 3-5 comparable units on Airbnb in your target area',
          'Compare weekday and weekend pricing for each',
          'Estimate a conservative average nightly rate',
          'Estimate cautious occupancy (65-70%)',
          'Build a monthly gross income range',
        ],
        commonMistakes: [
          'Using headline prices with no context',
          'Ignoring low season and quiet midweek periods',
          'Comparing your property to premium units with 200+ reviews',
          'Forgetting platform fees (typically 3-15%)',
        ],
        ukSpecificNotes: [
          'Business and contractor demand creates stronger midweek performance in many UK cities.',
          'Event spikes are bonus income, not core revenue.',
        ],
        quickAction: {
          title: 'Run your first comp analysis',
          tasks: [
            'Find 3 similar Airbnb listings in your area',
            'Note their nightly rate, reviews, and availability',
            'Calculate a conservative average nightly rate for your unit',
          ],
        },
        suggestedPrompts: [
          'How do I find good comps on Airbnb?',
          'What is a realistic occupancy rate for a new listing?',
          'How do platform fees affect my margins?',
        ],
      },
      {
        id: 'avoid-bad-stock',
        emoji: '🚫',
        title: 'Avoid bad stock and fake deals',
        duration: 7,
        whyItMatters: 'Weak stock drains attention. Fake optimism drains your bank account.',
        content: [
          'Some properties are cheap because they are hard to operate, clean, access, or insure. Others are blocked by ownership structure or freeholder rules.',
          'Build a rejection checklist. If the deal depends on everyone saying yes later, it is not a deal yet.',
          'Practical management issues are the silent killer. A difficult parking situation or unreliable access point will cost you in cleaner time, guest complaints, and reviews.',
        ],
        steps: [
          'Inspect access routes and parking availability',
          'Check block complexity and management company rules',
          'Assess day-to-day management friction',
          'Look for hidden restrictions in the lease or listing',
          'Reject anything that already feels like a fight',
        ],
        commonMistakes: [
          'Ignoring practical management issues because the numbers look good',
          'Believing verbal softness equals real approval',
          'Letting cheap rent hypnotise you into a bad situation',
        ],
        ukSpecificNotes: [],
        quickAction: {
          title: 'Build your rejection checklist',
          tasks: [
            'Write a list of 5 deal-breakers for any property',
            'Apply the list to your current shortlist',
            'Remove any property that fails 2 or more criteria',
          ],
        },
        suggestedPrompts: [
          'What are the most common hidden deal-breakers?',
          'How do I check freeholder rules before signing?',
          'When should I walk away from a deal?',
        ],
      },
    ],
  },
  {
    id: 'landlord-pitching',
    emoji: '💬',
    title: 'Landlord Pitching',
    summary: 'Win landlords over with proven scripts, trust-building tactics, and objection-handling frameworks.',
    status: 'in-progress',
    image: 'https://picsum.photos/seed/uni-lp/640/360',
    xpReward: 320,
    learningOutcomes: [
      'Explain rent-to-rent clearly in one sentence',
      'Build trust fast with professional materials',
      'Handle objections without sounding defensive',
      'Position guaranteed rent as friction reduction',
    ],
    lessons: [
      {
        id: 'explain-r2r',
        emoji: '🧠',
        title: 'Explain rent-to-rent in one clean sentence',
        duration: 5,
        whyItMatters: 'Landlords don\'t want a TED Talk. They want clarity, confidence, and low drama.',
        content: [
          'Your one-liner: "We take properties on a fixed-rent basis and manage them professionally under an agreed use model, giving owners predictable income and less day-to-day hassle."',
          'Keep the focus on owner benefit. Avoid talking about your Airbnb profit margins. The landlord cares about reliability, not your revenue model.',
          'Practice saying it aloud until it sounds natural. If you stumble, the landlord notices.',
        ],
        steps: [
          'Write a one-sentence explanation of your model',
          'Test it aloud three times',
          'Remove any jargon or investor buzzwords',
          'Make the owner benefit the first thing they hear',
        ],
        commonMistakes: [
          'Talking too much and over-explaining',
          'Leading with your profit instead of their benefit',
          'Using hype language that sounds too good to be true',
          'Sounding defensive before any objections are raised',
        ],
        ukSpecificNotes: [
          'Agents respond better to neutral professional language than investor-heavy buzzwords.',
        ],
        quickAction: {
          title: 'Nail your pitch today',
          tasks: [
            'Write your one-liner on a sticky note',
            'Say it to a friend or family member',
            'Ask them what they understood — refine if needed',
          ],
        },
        suggestedPrompts: [
          'Write me a simple pitch for a 2-bed flat',
          'How do I explain this to a skeptical agent?',
          'What\'s the best first sentence to use?',
        ],
      },
      {
        id: 'build-trust',
        emoji: '🤝',
        title: 'Build trust fast',
        duration: 7,
        whyItMatters: 'Owners are lending you operational control over a real asset. They need confidence, not charisma.',
        content: [
          'Trust signals include clean documents, calm messaging, fast replies, professional formatting, a simple process, and honest limits.',
          'Over-promising kills trust faster than a modest, honest explanation. If you don\'t know the answer to something, say so — and follow up promptly.',
          'Your trust pack should include: company overview, insurance details, a sample agreement, and references if available.',
        ],
        steps: [
          'Prepare your trust pack with all key documents',
          'Use clean, well-formatted written explanations',
          'Answer risk questions calmly and directly',
          'Keep your process easy for the landlord to follow',
        ],
        commonMistakes: [
          'Sending rambling voice notes instead of clear emails',
          'Using messy or inconsistent PDF documents',
          'Avoiding compliance questions or changing the subject',
          'Trying too hard to sound impressive rather than reliable',
        ],
        ukSpecificNotes: [
          'Many owners care less about maximum upside and more about predictable rent, property condition, and minimal hassle.',
        ],
        quickAction: {
          title: 'Build your trust pack',
          tasks: [
            'Create a clean one-page company overview',
            'Gather your insurance documents',
            'Write a clear FAQ sheet for landlords',
          ],
        },
        suggestedPrompts: [
          'What documents should I show a landlord?',
          'How do I handle the "what if you can\'t pay rent" question?',
          'What makes a landlord trust a new operator?',
        ],
      },
      {
        id: 'handle-objections',
        emoji: '🛡️',
        title: 'Handle objections without sounding slippery',
        duration: 8,
        whyItMatters: 'Objections are normal. Bad answers create doubt. Good answers reduce it.',
        content: [
          'Use the ACRR framework: Agree with the concern, Clarify your actual model, explain your Controls, and Redirect to what matters most to them.',
          'Never bluff on compliance. If you don\'t know the answer, say "Let me check that and come back to you." That builds more trust than a confident guess.',
          'The most common objections are about property damage, neighbour complaints, unauthorised use, and compliance. Prepare short, calm answers for each.',
        ],
        steps: [
          'List the top 5 objections you expect to hear',
          'Write a short, calm answer for each one',
          'Make every answer sound reassuring, not defensive',
          'Test your responses aloud until they feel natural',
        ],
        commonMistakes: [
          'Talking too much after answering the objection',
          'Trying to win the argument instead of reassuring them',
          'Bluffing on compliance or legal restrictions',
        ],
        ukSpecificNotes: [
          'Most common objections: damage, neighbours, unauthorised use, and compliance requirements.',
        ],
        quickAction: {
          title: 'Prepare your objection responses',
          tasks: [
            'Write answers to "What about damage?" and "What about neighbours?"',
            'Practice delivering them calmly',
            'Get a friend to role-play the objection conversation',
          ],
        },
        suggestedPrompts: [
          'How do I respond to "No Airbnb" from an agent?',
          'What if the landlord asks about insurance?',
          'How do I handle "I\'ve heard bad things about this"?',
        ],
      },
      {
        id: 'guaranteed-rent',
        emoji: '📄',
        title: 'Position guaranteed rent properly',
        duration: 6,
        whyItMatters: 'Overhyped guaranteed rent claims make you sound like a salesman, not a serious operator.',
        content: [
          'Better framing: the owner receives predictability, professional communication, and less hassle. You are not selling magic — you are selling friction reduction.',
          'Best pitch: "I will make your life easier while operating this professionally." Focus on outcomes the landlord actually cares about.',
          'Avoid the word "guaranteed" if it makes you sound too salesy. "Fixed monthly rent" often lands better.',
        ],
        steps: [
          'Rewrite your pitch to focus on owner outcomes',
          'Reduce hype words and replace with process language',
          'Add clear, realistic expectations',
          'Make the arrangement feel simple and low-risk',
        ],
        commonMistakes: [
          'Overselling guaranteed rent like a miracle solution',
          'Ignoring risk questions or dismissing concerns',
          'Making the arrangement sound too good to be true',
        ],
        ukSpecificNotes: [],
        quickAction: {
          title: 'Refine your guaranteed rent pitch',
          tasks: [
            'Rewrite your pitch without using the word "guaranteed"',
            'Focus on three specific benefits for the landlord',
            'Test it on someone who doesn\'t know R2R',
          ],
        },
        suggestedPrompts: [
          'What\'s a better way to say "guaranteed rent"?',
          'How do I make my offer feel low-risk?',
          'What do landlords actually care about most?',
        ],
      },
    ],
  },
  {
    id: 'best-uk-portals',
    emoji: '🔍',
    title: 'Best UK Portals',
    summary: 'Where to source deals and list your properties for maximum visibility and bookings.',
    status: 'not-started',
    image: 'https://picsum.photos/seed/uni-bp/640/360',
    xpReward: 320,
    learningOutcomes: [
      'Know the best platforms for sourcing deals',
      'Choose the right listing platforms for bookings',
      'Match your channel strategy to your model',
      'Build direct relationships beyond portal dependency',
    ],
    lessons: [
      {
        id: 'source-deals',
        emoji: '🏘️',
        title: 'Where to source deals',
        duration: 7,
        whyItMatters: 'The best deals rarely come from one source. Smart operators diversify their sourcing.',
        content: [
          'Core portals: Rightmove, Zoopla, OpenRent, SpareRoom. These give you volume and a broad market view.',
          'Also worth exploring: Facebook Marketplace, Gumtree, and direct agent relationships. Portals give volume; direct relationships give edge.',
          'The best operators combine portal scanning with proactive outreach to agents and landlords they have already spoken to.',
        ],
        steps: [
          'Choose 3 sourcing channels to start with',
          'Check them daily for new listings',
          'Track response quality from each channel',
          'Double down on whichever channel produces the best leads',
        ],
        commonMistakes: ['Relying on one portal only', 'Not tracking which source produces the best leads', 'Ignoring direct agent relationships'],
        ukSpecificNotes: ['Rightmove dominates UK property search. Zoopla is second. OpenRent is growing fast for direct landlord deals.'],
        quickAction: { title: 'Set up your sourcing routine', tasks: ['Create saved searches on Rightmove and Zoopla', 'Join 3 local property Facebook groups', 'List 5 letting agents to contact this week'] },
        suggestedPrompts: ['Which portal is best for finding R2R deals?', 'How do I approach letting agents?', 'Is Facebook Marketplace worth using?'],
      },
      {
        id: 'list-bookings',
        emoji: '🛎️',
        title: 'Where to list for bookings',
        duration: 6,
        whyItMatters: 'Listing on the wrong platform wastes time. Listing on the right one fills your calendar.',
        content: [
          'Short stays: Airbnb, Booking.com, Vrbo. These platforms have built-in demand and handle payments.',
          'Medium stays: direct bookings and business relationships. As your systems improve, direct bookings reduce dependency on platforms.',
          'Beginners should start with OTAs (online travel agencies) for built-in demand, then layer in direct bookings as they gain experience.',
        ],
        steps: ['Set up your Airbnb listing', 'Create a Booking.com profile', 'Research Vrbo for your area', 'Plan your direct booking strategy for later'],
        commonMistakes: ['Listing on too many platforms before mastering one', 'Ignoring Booking.com because "everyone uses Airbnb"', 'Not optimising listings before going live'],
        ukSpecificNotes: ['Booking.com is stronger in the UK for international travellers than many operators realise.'],
        quickAction: { title: 'Get your first listing live', tasks: ['Write your Airbnb listing title and description', 'Take or gather 10 photos', 'Set your initial pricing'] },
        suggestedPrompts: ['Should I use Airbnb or Booking.com first?', 'How do I write a listing that converts?', 'What photos matter most?'],
      },
      {
        id: 'match-channel',
        emoji: '🎯',
        title: 'Match channel to strategy',
        duration: 5,
        whyItMatters: 'Different models need different channels. One playbook does not fit all.',
        content: [
          'SA properties → OTAs (Airbnb, Booking.com). This is your primary demand channel for short-term stays.',
          'HMOs → room-demand platforms like SpareRoom and Rightmove Rooms. Different audience, different platform.',
          'Company and contractor lets → direct outreach and relationship-based demand. Build repeatable pipelines with corporate clients.',
        ],
        steps: ['Identify your primary model', 'Choose the 2 best channels for that model', 'Set up profiles on both', 'Track which channel delivers more bookings'],
        commonMistakes: ['Using SA channels for HMO demand', 'Ignoring direct corporate relationships for contractor lets', 'Spreading across 5 platforms with no optimisation on any'],
        ukSpecificNotes: ['SpareRoom is the dominant platform for room rentals in the UK.'],
        quickAction: { title: 'Align your channels', tasks: ['Write down your model', 'List the 2 best channels for it', 'Set up or optimise your profile on each'] },
        suggestedPrompts: ['What channel works best for contractor lets?', 'Should I use SpareRoom for SA?', 'How do I get corporate bookings?'],
      },
      {
        id: 'beyond-portals',
        emoji: '📞',
        title: 'Do not rely on portals alone',
        duration: 5,
        whyItMatters: 'Portals are useful. Dependency is dangerous. Diversify your demand sources.',
        content: [
          'Strong operators combine portals with direct outreach, repeatable follow-up systems, referrals, local networking, and agent relationships.',
          'Direct bookings have no commission fees. A returning guest who books directly is your most profitable booking.',
          'Build systems: an email list, a simple website, a WhatsApp broadcast for repeat guests. These compound over time.',
        ],
        steps: ['List your current demand sources', 'Identify one non-portal channel to develop', 'Create a simple direct booking process', 'Ask 3 past guests to book directly next time'],
        commonMistakes: ['100% reliance on Airbnb', 'No follow-up system for past guests', 'Ignoring the value of repeat bookings'],
        ukSpecificNotes: ['Many UK operators successfully fill 20-40% of their calendar through direct bookings and repeat clients.'],
        quickAction: { title: 'Start your direct channel', tasks: ['Set up a simple booking page or form', 'Message 3 past guests with a direct booking offer', 'Create a WhatsApp group for repeat guests'] },
        suggestedPrompts: ['How do I get direct bookings?', 'What percentage of bookings should be direct?', 'How do I build a repeat guest list?'],
      },
    ],
  },
  {
    id: 'furnishing',
    emoji: '🛋️',
    title: 'Furnishing',
    summary: 'Style properties that book themselves — budget-friendly, photo-ready, and easy to maintain.',
    status: 'not-started',
    image: 'https://picsum.photos/seed/uni-fur/640/360',
    xpReward: 320,
    learningOutcomes: ['Buy what guests actually notice', 'Furnish on budget without looking cheap', 'Make properties photo-ready', 'Design for operational efficiency'],
    lessons: [
      {
        id: 'what-guests-notice',
        emoji: '🛏️',
        title: 'Buy what guests actually notice',
        duration: 6,
        whyItMatters: 'Guests notice comfort, cleanliness, and basics. They rarely notice your accent cushions.',
        content: [
          'Highest-value items: beds, mattresses, curtains, lighting, seating, WiFi quality, and bathroom experience. These shape reviews.',
          'Fancy styling matters less than strong basics. A great mattress with simple decor beats a styled room with a terrible bed.',
          'Invest where it impacts sleep, comfort, and cleanliness. Everything else is secondary.',
        ],
        steps: ['List the 5 items guests interact with most', 'Allocate 60% of your furnishing budget to those items', 'Choose durable, easy-clean materials', 'Test the bed yourself before buying in bulk'],
        commonMistakes: ['Spending too much on decorative items', 'Cheap mattresses and pillows', 'Ignoring WiFi quality', 'Over-furnishing small spaces'],
        ukSpecificNotes: ['IKEA, Dunelm, and Facebook Marketplace are the go-to sources for UK operators.'],
        quickAction: { title: 'Create your furnishing checklist', tasks: ['List every item you need for one property', 'Price each item from 2 sources', 'Calculate total furnishing cost'] },
        suggestedPrompts: ['What is the ideal furnishing budget per property?', 'What mattress do you recommend?', 'Where should I buy furniture in bulk?'],
      },
      {
        id: 'budget-furnishing',
        emoji: '💸',
        title: 'Furnish on budget without looking cheap',
        duration: 7,
        whyItMatters: 'Consistency beats cost. A coordinated budget setup looks better than a random expensive one.',
        content: [
          'Neutral tones, clean lines, consistency, and restraint. Pick durable basics and use anchor pieces to create a focal point.',
          'What makes a place feel cheap is usually inconsistency, not cost. Mismatched styles and colours look worse than coordinated budget pieces.',
          'Use IKEA for structure, Dunelm for soft furnishings, and Facebook Marketplace for one-off pieces.',
        ],
        steps: ['Choose a colour palette (max 3 colours)', 'Source all core furniture from one supplier for consistency', 'Add 2-3 accent pieces per room', 'Remove anything that looks cluttered or mismatched'],
        commonMistakes: ['Mixing too many styles and colours', 'Over-decorating to compensate for quality', 'Buying white sofas for Airbnb use', 'Ignoring durability for aesthetics'],
        ukSpecificNotes: ['Argos, IKEA, and Dunelm offer the best value-to-quality ratio for UK operators.'],
        quickAction: { title: 'Set your style template', tasks: ['Pick your 3-colour palette', 'Create a mood board on Pinterest', 'List your go-to suppliers'] },
        suggestedPrompts: ['What colour scheme works best for Airbnb?', 'How much should I spend per room?', 'IKEA vs Dunelm — which is better?'],
      },
      {
        id: 'photo-ready',
        emoji: '📸',
        title: 'Make it photo-ready',
        duration: 6,
        whyItMatters: 'Guests decide from photos before they read a single word of your listing.',
        content: [
          'Natural light is free. Open all curtains and blinds. Shoot during the day when light is best.',
          'Clear surfaces make rooms look larger. Remove personal items, excess toiletries, and clutter before shooting.',
          'Three hero shots matter most: living area, bedroom, and bathroom. Get these right and the rest follows.',
        ],
        steps: ['Clear and clean every room before photos', 'Open all curtains and shoot in daylight', 'Take 3 hero shots: living room, bedroom, bathroom', 'Review photos on a phone screen — that is how guests see them'],
        commonMistakes: ['Shooting at night with artificial light', 'Leaving clutter visible in photos', 'Using wide-angle that distorts room proportions', 'Not reviewing photos on mobile'],
        ukSpecificNotes: ['UK natural light is limited in winter — shoot on the brightest day you can find, or use warm supplemental lighting.'],
        quickAction: { title: 'Take your hero shots', tasks: ['Clean and stage one room completely', 'Take 5 photos from different angles', 'Pick the best one and compare to top Airbnb listings nearby'] },
        suggestedPrompts: ['Should I hire a professional photographer?', 'What makes a listing photo stand out?', 'How many photos should my listing have?'],
      },
      {
        id: 'design-operations',
        emoji: '🧼',
        title: 'Design for operations',
        duration: 5,
        whyItMatters: 'Beautiful but impractical properties cost you in cleaning time, damage claims, and guest complaints.',
        content: [
          'Easy-clean materials save hours every week. Choose wipeable surfaces, dark-patterned fabrics, and minimal decorative noise.',
          'Simple linen systems reduce turnaround time. White bedding looks clean and is easy to bleach. Have 3 sets per bed.',
          'Fewer fragile items mean fewer damage claims and less replacement cost. Design for durability, not just aesthetics.',
        ],
        steps: ['Audit every item for cleanability', 'Switch to white, hotel-style bedding', 'Remove fragile or hard-to-clean decorations', 'Create a cleaning checklist based on your layout'],
        commonMistakes: ['Light-coloured sofas in high-traffic areas', 'Too many small decorative items', 'Complex bedding that takes too long to change', 'No backup linen sets'],
        ukSpecificNotes: ['Buy hotel-quality white bedding from wholesale suppliers — it lasts longer and looks more professional.'],
        quickAction: { title: 'Optimise for operations', tasks: ['List items that are hardest to clean', 'Replace or remove the top 3', 'Set up a linen rotation system'] },
        suggestedPrompts: ['What bedding do professional operators use?', 'How do I reduce turnaround time?', 'What items cause the most damage claims?'],
      },
    ],
  },
  {
    id: 'compliance',
    emoji: '⚖️',
    title: 'Compliance',
    summary: 'Stay legal and avoid costly mistakes — permissions, safety, licensing, and planning.',
    status: 'not-started',
    image: 'https://picsum.photos/seed/uni-comp/640/360',
    xpReward: 320,
    learningOutcomes: ['Understand permission beyond owner approval', 'Know core property safety requirements', 'Navigate HMO and licensing risks', 'Handle planning and local variation'],
    lessons: [
      {
        id: 'owner-permission',
        emoji: '✅',
        title: 'Owner permission is step one, not the whole answer',
        duration: 6,
        whyItMatters: 'The owner saying yes does not mean the building, lender, or council say yes.',
        content: [
          'Owner permission is necessary but not sufficient. You also need to check the lease terms, freeholder restrictions, lender conditions, and planning use class.',
          'Many leases explicitly prohibit subletting or short-term use. A verbal "yes" from the landlord does not override a restrictive lease.',
          'Always get permission in writing and check every layer: owner, lease, freeholder, lender, and local authority.',
        ],
        steps: ['Get written owner permission', 'Read the lease in full for restrictions', 'Check freeholder rules if leasehold', 'Verify lender conditions on the mortgage', 'Check local authority position on short-term lets'],
        commonMistakes: ['Assuming owner permission covers everything', 'Not reading the lease before signing', 'Ignoring freeholder restrictions in blocks of flats', 'Starting operations before all permissions are confirmed'],
        ukSpecificNotes: ['Many UK leasehold flats have restrictive covenants that prohibit short-term letting regardless of owner permission.'],
        quickAction: { title: 'Check your permissions', tasks: ['Request a copy of the lease', 'Search for subletting or short-let restrictions', 'Confirm lender position if the property is mortgaged'] },
        suggestedPrompts: ['What lease terms should I look for?', 'How do I check freeholder rules?', 'What if the owner says yes but the lease says no?'],
      },
      {
        id: 'safety-basics',
        emoji: '🔥',
        title: 'Core property safety basics',
        duration: 7,
        whyItMatters: 'Safety compliance is non-negotiable. Getting this wrong can end your business and put people at risk.',
        content: [
          'Essential certifications: Gas Safety Certificate (annual), EICR — Electrical Installation Condition Report (every 5 years), smoke alarms on every floor, carbon monoxide alarms in rooms with gas appliances.',
          'You also need a valid EPC (Energy Performance Certificate) and to conduct a basic fire risk assessment.',
          'Keep all certificates organised and accessible. Councils and insurance companies will ask for them.',
        ],
        steps: ['Arrange a Gas Safety Certificate inspection', 'Get an EICR from a qualified electrician', 'Install smoke alarms on every floor', 'Install CO alarms in rooms with gas appliances', 'Obtain or verify the EPC'],
        commonMistakes: ['Operating without a valid Gas Safety Certificate', 'Forgetting CO alarms in bedrooms with gas boilers', 'Not keeping certificates accessible for inspection', 'Assuming the landlord handles all safety compliance'],
        ukSpecificNotes: ['Gas Safety Certificates must be renewed annually. EICR is every 5 years. Both are legal requirements for rental properties in the UK.'],
        quickAction: { title: 'Get compliant today', tasks: ['Book a Gas Safe engineer', 'Schedule an EICR', 'Buy smoke and CO alarms'] },
        suggestedPrompts: ['What safety certificates do I need?', 'How much do gas and electrical checks cost?', 'What happens if I operate without a Gas Safety Certificate?'],
      },
      {
        id: 'hmo-licensing',
        emoji: '🏘️',
        title: 'HMO and licensing risk',
        duration: 8,
        whyItMatters: 'Operating an unlicensed HMO carries unlimited fines and rent repayment orders.',
        content: [
          'Mandatory HMO licensing applies to properties with 5 or more people forming 2 or more households. But many councils have additional and selective licensing schemes.',
          'Article 4 directions in some areas mean you need planning permission to convert a property to an HMO, even if it would normally be permitted development.',
          'Always check your specific council\'s position. Licensing requirements vary significantly between local authorities.',
        ],
        steps: ['Check if your target council has additional licensing schemes', 'Look for Article 4 directions in your target area', 'Determine if your property meets HMO definitions', 'Apply for a licence if required', 'Budget for licence fees and compliance work'],
        commonMistakes: ['Assuming licensing only applies to large HMOs', 'Not checking council-specific schemes', 'Operating without a licence and hoping for the best', 'Underestimating the cost and time of licence applications'],
        ukSpecificNotes: ['Many UK councils now have additional or selective licensing schemes. Check your local council website before committing to any property.'],
        quickAction: { title: 'Research your council', tasks: ['Visit your council website and search for licensing schemes', 'Check for Article 4 directions', 'Note licence fees and processing times'] },
        suggestedPrompts: ['Does my area require HMO licensing?', 'What is an Article 4 direction?', 'How much does an HMO licence cost?'],
      },
      {
        id: 'planning-local',
        emoji: '🏙️',
        title: 'Planning and local variation',
        duration: 6,
        whyItMatters: 'Planning rules vary dramatically across the UK. What works in one city may be illegal in another.',
        content: [
          'Short-term lets in some areas require a change of use from C3 (dwelling) to sui generis. The 90-night rule in London is a well-known example.',
          'Outside London, councils vary significantly. Some are relaxed about short-term lets; others actively enforce restrictions.',
          'Always verify the planning position before signing a lease, not after. Retrospective planning applications are expensive and uncertain.',
        ],
        steps: ['Check the planning use class for your target property', 'Research the 90-night rule if operating in London', 'Contact the local planning department for clarity', 'Get written confirmation of planning position', 'Factor planning risk into your deal assessment'],
        commonMistakes: ['Ignoring planning until after signing the lease', 'Assuming planning rules are the same everywhere', 'Not contacting the council for written confirmation', 'Operating beyond permitted limits'],
        ukSpecificNotes: ['The 90-night rule in London limits short-term lets to 90 nights per year without planning permission. Other cities may have their own limits.'],
        quickAction: { title: 'Verify planning position', tasks: ['Identify the use class of your target property', 'Call or email the local planning department', 'Document their response in writing'] },
        suggestedPrompts: ['What is the 90-night rule?', 'How do I check planning requirements outside London?', 'What if my council is strict about short-term lets?'],
      },
    ],
  },
  {
    id: 'pricing-strategy',
    emoji: '💷',
    title: 'Pricing Strategy',
    summary: 'Maximise nightly rates and occupancy with smart, data-driven pricing approaches.',
    status: 'not-started',
    image: 'https://picsum.photos/seed/uni-ps/640/360',
    xpReward: 320,
    learningOutcomes: ['Set realistic nightly rates from comps', 'Split weekday and weekend pricing', 'Use demand spikes as bonus income', 'Leverage minimum stays and discounts'],
    lessons: [
      {
        id: 'set-nightly-rate',
        emoji: '📌',
        title: 'Set a realistic nightly rate',
        duration: 6,
        whyItMatters: 'Overpricing to sit empty costs more than underpricing to fill. Start realistic and adjust.',
        content: [
          'Start with comps. Find 3-5 similar listings in your area and note their nightly rate, reviews, and availability.',
          'Match quality honestly. If your property has fewer reviews and a simpler setup, price below established competitors initially.',
          'Underpricing to fill is better than overpricing to sit empty. Bookings generate reviews, and reviews generate future bookings.',
        ],
        steps: ['Find 5 comparable listings', 'Note their nightly rates and review counts', 'Set your initial rate 10-15% below established competitors', 'Plan to increase rates after 10+ positive reviews'],
        commonMistakes: ['Pricing above your actual quality position', 'Copying prices from premium listings', 'Not adjusting rates based on booking patterns', 'Setting and forgetting your pricing'],
        ukSpecificNotes: ['UK Airbnb rates vary dramatically by city. London averages £120-180/night for a 2-bed. Manchester averages £80-120/night.'],
        quickAction: { title: 'Set your launch price', tasks: ['Find 5 comps', 'Calculate the average nightly rate', 'Set your rate 10% below average'] },
        suggestedPrompts: ['What nightly rate should I start with?', 'How do I find the right comps?', 'When should I increase my prices?'],
      },
      {
        id: 'weekday-weekend',
        emoji: '📆',
        title: 'Split weekdays and weekends',
        duration: 5,
        whyItMatters: 'Weekday and weekend demand are often completely different. One price for both leaves money on the table.',
        content: [
          'Weekday rates should target regular demand: contractors, business travellers, relocations.',
          'Weekend rates can reflect leisure uplift: couples, tourists, event attendees.',
          'Contractor-heavy areas may have flat or even inverted demand patterns where weekdays are busier than weekends.',
        ],
        steps: ['Check weekday vs weekend availability for comps', 'Set separate weekday and weekend rates', 'Monitor booking patterns weekly', 'Adjust based on actual demand data'],
        commonMistakes: ['Using one flat rate for all days', 'Assuming weekends are always busier', 'Not tracking weekday vs weekend occupancy separately'],
        ukSpecificNotes: ['Cities with strong contractor demand (e.g., Manchester, Birmingham) often have better weekday than weekend performance.'],
        quickAction: { title: 'Split your pricing', tasks: ['Set a weekday rate', 'Set a weekend rate (10-20% higher unless data says otherwise)', 'Review after 2 weeks'] },
        suggestedPrompts: ['Should my weekday rate be lower?', 'How much more should weekends cost?', 'What if weekdays are busier in my area?'],
      },
      {
        id: 'demand-spikes',
        emoji: '📈',
        title: 'Use demand spikes properly',
        duration: 5,
        whyItMatters: 'Event spikes are bonus income, not your baseline. Price them well but don\'t underwrite to them.',
        content: [
          'Events, graduations, concerts, football matches, and conferences create temporary demand spikes.',
          'These are opportunities for premium pricing. Increase rates 30-100% during known high-demand periods.',
          'But never build your financial model around event income. Your baseline should work without spikes.',
        ],
        steps: ['Research local events for the next 6 months', 'Mark high-demand dates in your calendar', 'Set premium pricing for those dates', 'Keep your baseline model conservative'],
        commonMistakes: ['Building your financial model on event income', 'Missing events because you didn\'t research', 'Underpricing during events', 'Overpricing so much that you don\'t book'],
        ukSpecificNotes: ['Key UK events: Premier League matches, graduations (June-July), music festivals, university freshers weeks (September).'],
        quickAction: { title: 'Find your local events', tasks: ['Search for events in your city for the next 3 months', 'Mark 5 high-demand dates', 'Set premium prices for each'] },
        suggestedPrompts: ['What events drive demand in Manchester?', 'How much should I increase prices for events?', 'How do I find local event calendars?'],
      },
      {
        id: 'minimum-stays',
        emoji: '🎛️',
        title: 'Use minimum stays and discounts wisely',
        duration: 5,
        whyItMatters: 'Minimum stays reduce cleaning frequency and admin. Discounts attract longer stays. Both improve profitability.',
        content: [
          'A 2-night minimum stay reduces turnover, cleaning costs, and check-in/out admin.',
          'Weekly discounts (10-15% off) attract midweek workers and short-term relocations.',
          'Monthly discounts (20-30% off) attract long-term guests and improve occupancy predictability.',
        ],
        steps: ['Set a 2-night minimum stay as default', 'Add a 10% weekly discount', 'Add a 20% monthly discount', 'Monitor how these affect your booking patterns'],
        commonMistakes: ['1-night stays that cost more in cleaning than they earn', 'Discounts so deep they eliminate your profit margin', 'Not testing different minimum stays', 'Ignoring the operational cost of high turnover'],
        ukSpecificNotes: ['Many successful UK operators use 2-3 night minimums. Contractor lets often work best with 5-7 night minimums.'],
        quickAction: { title: 'Set your stay parameters', tasks: ['Set minimum stay to 2 nights', 'Add weekly and monthly discounts', 'Review impact after 30 days'] },
        suggestedPrompts: ['What minimum stay should I set?', 'How much discount should I offer for weekly stays?', 'Do minimum stays reduce bookings?'],
      },
    ],
  },
  {
    id: 'outreach-scripts',
    emoji: '📞',
    title: 'Outreach Scripts',
    summary: 'Cold calling and email templates that work — ready to copy, personalise, and send.',
    status: 'not-started',
    image: 'https://picsum.photos/seed/uni-os/640/360',
    xpReward: 320,
    learningOutcomes: ['Write effective first messages to agents', 'Approach landlords directly with confidence', 'Follow up without being pushy', 'Handle cold calls professionally'],
    lessons: [
      {
        id: 'agent-message',
        emoji: '✉️',
        title: 'First message to agents',
        duration: 5,
        whyItMatters: 'Your first message determines whether an agent responds or ignores you.',
        content: [
          'Keep it short, professional, and specific. Agents receive dozens of messages daily — yours needs to stand out by being clear and easy to respond to.',
          'Mention the area, property type, and your arrangement model in the first two sentences. Make it easy for them to say "yes, I have something."',
        ],
        steps: ['Write your agent message using the template below', 'Personalise it with your target area and property type', 'Send to 5 agents today', 'Track who responds and refine'],
        commonMistakes: ['Messages that are too long', 'Not mentioning the specific area', 'Sounding desperate or overly eager', 'Not following up'],
        ukSpecificNotes: ['UK letting agents respond best to concise, professional emails sent during business hours (9am-5pm, Tuesday-Thursday).'],
        script: 'Hi [Name],\n\nI\'m reaching out because I\'m actively looking for 2 and 3-bed properties in [Area] to take on a company let basis.\n\nWe offer a fixed monthly rent, handle the management, and are focused on low-maintenance, long-term arrangements.\n\nWould you have anything suitable on or coming to market? Happy to send over a quick overview if helpful.\n\nBest regards,\n[Your Name]',
        quickAction: { title: 'Send your first agent message', tasks: ['Copy the script below', 'Replace [Name], [Area], and [Your Name]', 'Send to 3 agents right now'] },
        suggestedPrompts: ['Rewrite this script for my city', 'How do I sound confident but not pushy?', 'What if they don\'t reply?'],
      },
      {
        id: 'landlord-message',
        emoji: '🏡',
        title: 'First message to landlords',
        duration: 5,
        whyItMatters: 'Landlords are more cautious than agents. Your first message needs to feel trustworthy and low-pressure.',
        content: [
          'Lead with the property they own. Show you have done your research. Make the arrangement sound simple and beneficial.',
          'Avoid R2R jargon. Landlords don\'t care about your business model — they care about reliable rent and low hassle.',
        ],
        steps: ['Write your landlord message using the template', 'Personalise with the property address', 'Send to 3 landlords this week', 'Follow up in 3 days if no response'],
        commonMistakes: ['Generic messages that don\'t reference the property', 'Too much detail in the first message', 'Using R2R jargon the landlord won\'t understand', 'Not offering a simple next step'],
        ukSpecificNotes: ['Many UK landlords prefer email over phone for first contact. WhatsApp is increasingly accepted for follow-ups.'],
        script: 'Hi [Name],\n\nI came across your property at [Address] and wanted to introduce myself. I\'m a local operator looking to take properties on a fixed monthly rent under a management arrangement.\n\nThe owner receives guaranteed rent and I handle the day-to-day.\n\nHappy to share more detail if you\'re open to a quick call or email chat.\n\nBest regards,\n[Your Name]',
        quickAction: { title: 'Send your first landlord message', tasks: ['Find a property listing with landlord contact details', 'Personalise the script', 'Send it today'] },
        suggestedPrompts: ['How do I find landlord contact details?', 'Should I mention Airbnb in my message?', 'What if they say they already have a tenant?'],
      },
      {
        id: 'follow-up',
        emoji: '🔁',
        title: 'Follow-up script',
        duration: 5,
        whyItMatters: 'Most deals are won on the follow-up, not the first message. Persistence without pressure is the key.',
        content: [
          'Follow up 3-5 days after your initial message. Reference your previous contact and keep it brief.',
          'The goal is to stay on their radar without being annoying. One sentence of value or context is enough.',
        ],
        steps: ['Wait 3-5 days after your first message', 'Send a brief, friendly follow-up', 'If no response after 2 follow-ups, move on', 'Track follow-ups in your CRM'],
        commonMistakes: ['Following up too aggressively', 'Sending the same message again', 'Not tracking who you\'ve followed up with', 'Giving up after one unanswered message'],
        ukSpecificNotes: ['In the UK, 2-3 follow-ups is standard practice. More than that risks being seen as spam.'],
        script: 'Hi [Name],\n\nJust following up on my message from [X days] ago. I\'m still actively looking in [Area] and wanted to check if anything has changed or if you had a chance to look at what I sent.\n\nNo pressure either way — just keen to keep the conversation open.\n\nBest regards,\n[Your Name]',
        quickAction: { title: 'Follow up on your outreach', tasks: ['Check your sent messages from 3+ days ago', 'Send a follow-up to anyone who hasn\'t replied', 'Track responses in your CRM'] },
        suggestedPrompts: ['How many follow-ups is too many?', 'What should I say differently in the follow-up?', 'How do I know when to stop following up?'],
      },
      {
        id: 'cold-call',
        emoji: '☎️',
        title: 'Cold call opener',
        duration: 5,
        whyItMatters: 'Cold calls are the fastest way to get a response. A good opener buys you 30 seconds of attention.',
        content: [
          'Be brief, professional, and direct. State your name, what you do, and what you\'re looking for in the first 10 seconds.',
          'Ask permission to continue: "Is that something you\'d be open to hearing a bit more about?" This gives them an easy out, which paradoxically makes them more likely to listen.',
        ],
        steps: ['Write out your cold call opener', 'Practice it aloud 5 times', 'Make 3 cold calls today', 'Note what works and what doesn\'t'],
        commonMistakes: ['Rambling for too long before getting to the point', 'Not introducing yourself clearly', 'Sounding scripted and robotic', 'Not asking for permission to continue'],
        ukSpecificNotes: ['Best times to cold call UK agents: 10am-12pm and 2pm-4pm, Tuesday to Thursday.'],
        script: 'Hi, is that [Name]? Great. My name is [Your Name], I\'m a local property operator.\n\nI\'ll be quick — I\'m looking for 2 and 3-bed properties in [Area] to manage on a fixed-rent arrangement.\n\nIs that something you\'d be open to hearing a bit more about?',
        quickAction: { title: 'Make your first cold call', tasks: ['Write your opener on a card', 'Find 3 agent phone numbers', 'Call them between 10am-12pm'] },
        suggestedPrompts: ['How do I sound confident on the phone?', 'What if they say they\'re not interested?', 'Should I call or email first?'],
      },
    ],
  },
  {
    id: 'operations-basics',
    emoji: '🧹',
    title: 'Operations Basics',
    summary: 'Cleaning, check-ins, guest communication, and protecting your review reputation.',
    status: 'not-started',
    image: 'https://picsum.photos/seed/uni-ob/640/360',
    xpReward: 320,
    learningOutcomes: ['Build a reliable cleaning system', 'Standardise guest communication', 'Handle issues before they become complaints', 'Protect and grow your review reputation'],
    lessons: [
      {
        id: 'cleaning-system',
        emoji: '🧽',
        title: 'Build a cleaning system',
        duration: 6,
        whyItMatters: 'Cleaning is your review reputation. One bad clean can undo 10 five-star reviews.',
        content: [
          'Build a consistent cleaning standard with a detailed checklist per property. Every clean should follow the same process.',
          'Find a reliable cleaner and always have a backup. Your main cleaner being unavailable should not mean a dirty check-in.',
          'Set up a linen system: 3 sets per bed, rotated and washed professionally. White, hotel-style bedding is easiest to maintain.',
        ],
        steps: ['Create a detailed cleaning checklist', 'Find and interview 2 cleaners', 'Set up a backup cleaner arrangement', 'Order 3 sets of linen per bed', 'Do a test clean with your checklist'],
        commonMistakes: ['No written checklist', 'Only one cleaner with no backup', 'Inconsistent standards between cleans', 'Not inspecting after the cleaner finishes'],
        ukSpecificNotes: ['UK cleaning rates vary: £12-18/hour outside London, £15-22/hour in London. Per-clean pricing is more common and efficient.'],
        quickAction: { title: 'Set up your cleaning system', tasks: ['Write a room-by-room cleaning checklist', 'Post a cleaner ad on Facebook or Indeed', 'Order your first set of linen'] },
        suggestedPrompts: ['How do I find a reliable cleaner?', 'What should be on my cleaning checklist?', 'How much should I pay per clean?'],
      },
      {
        id: 'guest-comms',
        emoji: '📲',
        title: 'Standardise guest communication',
        duration: 5,
        whyItMatters: 'Consistent communication reduces complaints, improves reviews, and saves you time.',
        content: [
          'Template everything: pre-arrival message, check-in instructions, mid-stay check, and checkout reminder.',
          'Send the pre-arrival message 24 hours before check-in with all essential details: address, access instructions, WiFi password, and house rules.',
          'A mid-stay check (day 2 for short stays) shows you care and catches issues before they become complaints.',
        ],
        steps: ['Write your pre-arrival message template', 'Write check-in instructions with photos', 'Create a mid-stay check-in message', 'Write a checkout reminder with review request'],
        commonMistakes: ['No pre-arrival message', 'Check-in instructions that are confusing', 'Not checking in during the stay', 'Not asking for a review at checkout'],
        ukSpecificNotes: ['UK guests expect clear parking instructions and bin collection schedules. Include both in your check-in message.'],
        quickAction: { title: 'Write your message templates', tasks: ['Draft your pre-arrival message', 'Write clear check-in instructions', 'Create a checkout message with review request'] },
        suggestedPrompts: ['What should my pre-arrival message say?', 'How do I ask for a review without being pushy?', 'What information do guests need at check-in?'],
      },
      {
        id: 'handle-issues',
        emoji: '🔧',
        title: 'Handle issues fast',
        duration: 5,
        whyItMatters: 'Response speed equals reviews. A problem handled quickly is often a 5-star review. A slow response is a 2-star review.',
        content: [
          'Have a plumber, electrician, and locksmith contact saved and ready before you need them. Don\'t search for one during an emergency.',
          'Respond to every guest issue within 15 minutes, even if your response is "I\'m on it, someone will be there within the hour."',
          'A quick, calm response often turns a negative experience into a positive review. Guests remember how you handled the problem, not the problem itself.',
        ],
        steps: ['Save contact details for a plumber, electrician, and locksmith', 'Create a standard response template for common issues', 'Set up notifications so you never miss a guest message', 'Follow up after every issue to confirm it\'s resolved'],
        commonMistakes: ['No emergency contacts saved', 'Slow response to guest issues', 'Getting defensive when guests complain', 'Not following up after fixing the problem'],
        ukSpecificNotes: ['Many UK areas have 24/7 locksmith and emergency plumber services. Save at least 2 numbers for each.'],
        quickAction: { title: 'Build your emergency contact list', tasks: ['Find and save a local plumber number', 'Find and save a local electrician number', 'Find and save a 24/7 locksmith number'] },
        suggestedPrompts: ['How do I respond to a complaint about noise?', 'What if something breaks and I can\'t fix it quickly?', 'How do I turn a complaint into a positive review?'],
      },
      {
        id: 'protect-reviews',
        emoji: '⭐',
        title: 'Protect reviews and repeatability',
        duration: 5,
        whyItMatters: 'Reviews are your most valuable asset. A strong review base compounds over time and reduces your cost of acquiring each booking.',
        content: [
          'Chase reviews actively. Most guests won\'t leave a review unless you ask. Send a warm, personal checkout message requesting feedback.',
          'Handle disputes calmly and professionally. Never argue publicly. Take the conversation private, resolve it, and then respond publicly with grace.',
          'Respond to all reviews, positive and negative. Public responses show future guests that you are engaged and professional.',
        ],
        steps: ['Add a review request to your checkout message', 'Set up a follow-up reminder 24 hours after checkout', 'Respond to every review within 48 hours', 'Handle any negative reviews privately first, then publicly'],
        commonMistakes: ['Not asking for reviews', 'Arguing publicly with guests', 'Ignoring negative reviews', 'Only responding to positive reviews'],
        ukSpecificNotes: ['UK Airbnb hosts with 50+ reviews and 4.8+ rating see significantly higher booking rates and can command premium pricing.'],
        quickAction: { title: 'Set up your review system', tasks: ['Write a warm review request message', 'Set up a 24-hour post-checkout reminder', 'Draft a template response for positive reviews'] },
        suggestedPrompts: ['How do I get more reviews?', 'How should I respond to a bad review?', 'What review rating do I need to be competitive?'],
      },
    ],
  },
];

export function getModuleById(id: string): Module | undefined {
  return modules.find(m => m.id === id);
}

export function getLessonById(moduleId: string, lessonId: string): { module: Module; lesson: Lesson } | undefined {
  const mod = getModuleById(moduleId);
  if (!mod) return undefined;
  const lesson = mod.lessons.find(l => l.id === lessonId);
  if (!lesson) return undefined;
  return { module: mod, lesson };
}
