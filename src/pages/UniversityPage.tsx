import { universityModules } from '@/data/mockData';

export default function UniversityPage() {
  const completed = universityModules.filter(m => m.status === 'completed').length;

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground">Airbnb University</h1>
      <p className="text-sm text-muted-foreground mt-1">Master rent-to-rent operations from zero to operator.</p>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-foreground">{completed} of {universityModules.length} modules completed</span>
      </div>
      <div className="w-full max-w-[360px] h-1.5 bg-border rounded-full mt-2 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(completed / universityModules.length) * 100}%` }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
        {universityModules.map(mod => (
          <div key={mod.id} className="bg-card border border-border rounded-2xl p-5 card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{mod.emoji}</span>
                <h3 className="text-base font-bold text-foreground">{mod.title}</h3>
              </div>
              <img src={mod.image} className="w-[72px] h-12 rounded-lg object-cover" alt="" loading="lazy" />
            </div>
            <p className="text-sm text-muted-foreground">{mod.description}</p>
            <p className="text-xs text-muted-foreground mt-2">{mod.lessons} lessons · ~{mod.minutes} mins</p>
            <div className="mt-3">
              {mod.status === 'completed' && <span className="badge-green">Completed ✓</span>}
              {mod.status === 'in-progress' && <span className="badge-amber">In progress</span>}
              {mod.status === 'not-started' && <span className="badge-gray">Not started</span>}
            </div>
            <button className="w-full h-10 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm mt-4 hover:opacity-90 transition-opacity">
              Open Module
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
