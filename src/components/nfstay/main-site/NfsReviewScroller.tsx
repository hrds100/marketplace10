// Exact port of VPS Reviews + Review + Testimonial components
// Auto-scrolling horizontal reviews strip
import { useRef, useEffect } from 'react';
import { Star } from 'lucide-react';

const REVIEWS = [
  {
    name: 'Gemille H.',
    msg: 'Home and great host. Responded to my messages. Will stay again.',
    rating: 5,
    initials: 'G',
    color: '#8B5CF6',
  },
  {
    name: 'Jane Cooper',
    msg: 'The house had everything we needed and then some. Enjoyed our short stay very much!',
    rating: 5,
    initials: 'J',
    color: '#06B6D4',
  },
  {
    name: 'Soromnah Nguyen',
    msg: 'Home and great host. Responded to my messages. Will stay again.',
    rating: 5,
    initials: 'S',
    color: '#10B981',
  },
  {
    name: 'Ouy Hawkins',
    msg: 'Excellent. Awesome place and very well maintained, congratulations!',
    rating: 5,
    initials: 'O',
    color: '#F59E0B',
  },
  {
    name: 'Maria Santos',
    msg: 'Absolutely stunning property. Clean, modern and perfectly located.',
    rating: 5,
    initials: 'M',
    color: '#EF4444',
  },
  {
    name: 'David Chen',
    msg: 'Booked directly and saved a fortune. The host was super responsive.',
    rating: 5,
    initials: 'D',
    color: '#3B82F6',
  },
];

function Testimonial({ name, msg, initials, color }: (typeof REVIEWS)[0]) {
  return (
    <div className="flex flex-col gap-6 md:w-[390px] min-w-[340px] md:min-w-[390px] rounded-2xl border bg-white md:p-6 p-4 flex-shrink-0">
      <div className="flex md:gap-4 gap-2">
        {/* Avatar circle */}
        <div
          className="size-[54px] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {initials}
        </div>
        <div className="flex-1 flex justify-between md:gap-4 gap-2">
          <div className="space-y-1">
            <h3 className="md:text-sm text-xs font-bold text-nowrap">{name}</h3>
            <p className="md:text-sm text-[10px] text-nowrap text-gray-500">August 2024</p>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="size-4 text-[#ffcc00] fill-[#ffcc00]" />
            ))}
          </div>
        </div>
      </div>
      <div className="md:mt-4 mt-2">
        <p className="text-[#6e6e6e] md:text-base text-xs">"{msg}"</p>
      </div>
      <div className="mt-auto inline-flex items-center md:text-sm text-xs font-semibold gap-1">
        Posted on NFsTay
        <span className="text-purple-600 font-bold">✦</span>
      </div>
    </div>
  );
}

export default function NfsReviewScroller({ scrollSpeed = 2 }: { scrollSpeed?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const duplicated = [...REVIEWS, ...REVIEWS, ...REVIEWS, ...REVIEWS];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let rafId: number;
    const scroll = () => {
      if (el.scrollLeft >= el.scrollWidth / 2) {
        el.scrollLeft = 0;
      } else {
        el.scrollBy({ left: scrollSpeed, behavior: 'auto' });
      }
      rafId = requestAnimationFrame(scroll);
    };
    rafId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(rafId);
  }, [scrollSpeed]);

  return (
    <section id="Reviews" className="w-auto mx-auto mt-36">
      <div className="flex justify-center items-center flex-col">
        <h1 className="text-2xl md:text-4xl font-bold">Reviews</h1>
        <p className="text-[#9d9da1] mt-4 md:mt-6 text-center">
          Don't just take it from us. See what our guests have to say.
        </p>
      </div>
      <div className="relative overflow-hidden mt-14">
        <div
          ref={ref}
          className="flex md:gap-10 gap-6 overflow-x-hidden"
        >
          {duplicated.map((item, i) => (
            <Testimonial key={i} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
