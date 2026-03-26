/**
 * Self-contained booking site preview — matches nfstay.app design pixel-perfect.
 * No iframe, no bookingsite code changes. All in this one file.
 */
import { useState } from 'react';
import {
  Search, MapPin, Star, Users, Bed, Bath, Heart, ChevronDown, ChevronLeft,
  Clock, Mail, Phone, MessageCircle, User, Menu, X, Calendar,
} from 'lucide-react';

// ── Mock Data ──
const PROPS = [
  { id: 1, img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80', title: 'Modern Shoreditch Loft', loc: 'London, UK', price: 145, beds: 2, baths: 1, guests: 4, type: 'Apartment', rating: 4.8, reviews: 24, lat: 51.525, lng: -0.077, desc: 'Stunning loft apartment in the heart of Shoreditch with exposed brick, modern amenities, and fantastic local restaurants within walking distance.' },
  { id: 2, img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80', title: 'Chelsea Garden Flat', loc: 'London, UK', price: 195, beds: 3, baths: 2, guests: 6, type: 'Apartment', rating: 4.9, reviews: 31, lat: 51.487, lng: -0.168, desc: 'Elegant garden flat in Chelsea with private terrace, period features, and easy access to Kings Road shops and cafes.' },
  { id: 3, img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80', title: 'Covent Garden Studio', loc: 'London, UK', price: 89, beds: 1, baths: 1, guests: 2, type: 'Studio', rating: 4.7, reviews: 18, lat: 51.511, lng: -0.124, desc: 'Compact and stylish studio steps from Covent Garden and theatreland. Perfect for couples exploring central London.' },
  { id: 4, img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80', title: 'Camden Townhouse', loc: 'London, UK', price: 250, beds: 4, baths: 3, guests: 8, type: 'House', rating: 4.6, reviews: 12, lat: 51.539, lng: -0.142, desc: 'Spacious Victorian townhouse in Camden with rooftop terrace and canal views. Great for families and groups.' },
  { id: 5, img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80', title: 'Notting Hill Mews', loc: 'London, UK', price: 175, beds: 2, baths: 1, guests: 4, type: 'Apartment', rating: 4.8, reviews: 42, lat: 51.511, lng: -0.205, desc: 'Charming mews apartment on a quiet cobbled street in Notting Hill. Walking distance to Portobello Road Market.' },
  { id: 6, img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80', title: 'Canary Wharf Penthouse', loc: 'London, UK', price: 320, beds: 3, baths: 2, guests: 6, type: 'Penthouse', rating: 5.0, reviews: 8, lat: 51.505, lng: -0.023, desc: 'Luxury penthouse with panoramic Thames views, 24hr concierge, and state-of-the-art amenities.' },
  { id: 7, img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80', title: 'Brixton Artist Flat', loc: 'London, UK', price: 95, beds: 1, baths: 1, guests: 3, type: 'Apartment', rating: 4.5, reviews: 15, lat: 51.461, lng: -0.115, desc: 'Creative space in vibrant Brixton with local art and colourful interiors. Near markets and live music venues.' },
  { id: 8, img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80', title: 'Greenwich Riverside Home', loc: 'London, UK', price: 165, beds: 3, baths: 2, guests: 5, type: 'House', rating: 4.9, reviews: 22, lat: 51.476, lng: -0.000, desc: 'Beautiful riverside home near Greenwich Park with garden and river walks. Ideal for families.' },
];

interface BrandingData {
  brandName: string;
  accentColor: string;
  heroHeadline: string;
  heroSubheadline: string;
  aboutBio: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  socialInstagram: string;
  socialFacebook: string;
  socialTwitter: string;
  socialTiktok: string;
  [key: string]: string;
}

interface PreviewProps {
  branding: BrandingData;
  isMobile: boolean;
  onPayment: () => void;
}

export default function BookingSitePreview({ branding, isMobile, onPayment }: PreviewProps) {
  const [page, setPage] = useState<'home' | 'search' | 'property'>('home');
  const [contactOpen, setContactOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedProp, setSelectedProp] = useState(PROPS[0]);
  const [favs, setFavs] = useState<Set<number>>(new Set());
  const ac = branding.accentColor;
  const grad = `linear-gradient(270deg, ${ac}cc 0%, ${ac} 100%)`;

  const toggleFav = (id: number) => setFavs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openProperty = (p: typeof PROPS[0]) => { setSelectedProp(p); setPage('property'); };

  // ── Navbar ──
  const Navbar = () => (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="h-14 px-4 flex items-center justify-between">
        {/* Left: Logo */}
        <span className="text-[14px] font-bold truncate" style={{ color: ac }}>{branding.brandName}</span>

        {/* Center: Toggle pill (desktop only) */}
        {!isMobile && (
          <div className="relative bg-white border border-gray-200 rounded-full p-1 shadow-sm flex">
            <div className="absolute top-1 h-[calc(100%-8px)] rounded-full transition-all duration-500" style={{ background: grad, width: 'calc(50% - 4px)', left: page === 'search' || page === 'home' ? '4px' : 'calc(50% + 2px)' }} />
            <button onClick={() => setPage('home')} className={`relative z-10 px-4 py-1.5 rounded-full text-[11px] font-medium transition-all ${page !== 'property' ? 'text-white' : 'text-gray-600'}`}>
              Find Stays
            </button>
            <button onClick={onPayment} className={`relative z-10 px-4 py-1.5 rounded-full text-[11px] font-medium transition-all ${page === 'property' ? 'text-white' : 'text-gray-600'}`}>
              My Reservations
            </button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {!isMobile && (
            <div className="relative">
              <button onClick={() => setContactOpen(!contactOpen)} className="px-2.5 py-1 text-[10px] font-medium border border-gray-200 rounded-full hover:bg-gray-50 flex items-center gap-1">
                Contact <ChevronDown className={`w-2.5 h-2.5 transition-transform ${contactOpen ? 'rotate-180' : ''}`} />
              </button>
              {contactOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setContactOpen(false)} />
                  <div className="absolute right-0 top-8 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                    <div className="px-3 py-2 text-[10px] text-muted-foreground flex items-center gap-2 hover:bg-gray-50 cursor-pointer">
                      <MessageCircle className="w-3 h-3 text-[#25D366]" />{branding.contactWhatsapp || 'WhatsApp'}
                    </div>
                    <div className="px-3 py-2 text-[10px] text-muted-foreground flex items-center gap-2 hover:bg-gray-50 cursor-pointer">
                      <Mail className="w-3 h-3" />{branding.contactEmail || 'Email'}
                    </div>
                    <div className="px-3 py-2 text-[10px] text-muted-foreground flex items-center gap-2 hover:bg-gray-50 cursor-pointer">
                      <Phone className="w-3 h-3" />{branding.contactPhone || 'Phone'}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <button onClick={onPayment} className="px-2.5 py-1 text-[10px] font-medium text-white rounded-full" style={{ background: grad }}>Sign In</button>
          {isMobile && (
            <button onClick={() => setMenuOpen(true)} className="p-1 hover:bg-gray-100 rounded-lg"><Menu className="w-4 h-4" /></button>
          )}
        </div>
      </div>

      {/* Search bar (on search page) */}
      {page === 'search' && (
        <div className="px-4 pb-3">
          <div className="flex items-center border border-gray-200 rounded-full bg-white px-2 py-1.5 shadow-sm">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
            <span className="flex-1 text-[11px] text-gray-400 ml-2">London, UK</span>
            <span className="text-[11px] text-gray-400 px-2 border-l border-gray-200 hidden sm:block"><Clock className="w-3 h-3 inline mr-1" />Any dates</span>
            <span className="text-[11px] text-gray-400 px-2 border-l border-gray-200 hidden sm:block"><Users className="w-3 h-3 inline mr-1" />1 guest</span>
            <button className="px-3 py-1 text-white text-[10px] font-semibold rounded-full ml-1" style={{ background: grad }}>Search</button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Mobile menu ──
  const MobileMenu = () => menuOpen ? (
    <>
      <div className="fixed inset-0 bg-black/30 z-20" onClick={() => setMenuOpen(false)} />
      <div className="fixed top-0 right-0 h-full w-[240px] bg-white shadow-lg z-30 p-4">
        <button onClick={() => setMenuOpen(false)} className="p-1 hover:bg-gray-100 rounded-md mb-4"><X className="w-4 h-4" /></button>
        <div className="space-y-3">
          <button onClick={() => { setPage('home'); setMenuOpen(false); }} className="block text-[12px] font-medium text-gray-700 py-2 border-b border-gray-100 w-full text-left">Find a stay</button>
          <button onClick={() => { onPayment(); setMenuOpen(false); }} className="block text-[12px] font-medium text-gray-700 py-2 border-b border-gray-100 w-full text-left">My Reservations</button>
          <button onClick={() => { setContactOpen(true); setMenuOpen(false); }} className="block text-[12px] font-medium text-gray-700 py-2 border-b border-gray-100 w-full text-left">Contact</button>
        </div>
        <button onClick={onPayment} className="mt-6 w-full py-2.5 text-white text-[12px] font-semibold rounded-xl" style={{ background: grad }}>Sign In</button>
        {(branding.contactWhatsapp || branding.contactEmail || branding.contactPhone) && (
          <div className="mt-4 space-y-2">
            {branding.contactWhatsapp && <p className="text-[10px] text-gray-500 flex items-center gap-1.5"><MessageCircle className="w-3 h-3 text-[#25D366]" />{branding.contactWhatsapp}</p>}
            {branding.contactEmail && <p className="text-[10px] text-gray-500 flex items-center gap-1.5"><Mail className="w-3 h-3" />{branding.contactEmail}</p>}
            {branding.contactPhone && <p className="text-[10px] text-gray-500 flex items-center gap-1.5"><Phone className="w-3 h-3" />{branding.contactPhone}</p>}
          </div>
        )}
      </div>
    </>
  ) : null;

  // ── Property Card ──
  const Card = ({ p, small }: { p: typeof PROPS[0]; small?: boolean }) => (
    <div className="group cursor-pointer" onClick={() => openProperty(p)}>
      <div className={`relative rounded-2xl overflow-hidden ${small ? 'aspect-square' : 'aspect-[320/300]'} mb-2`}>
        <img src={p.img} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
        <button onClick={e => { e.stopPropagation(); toggleFav(p.id); }} className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white">
          <Heart className={`w-3.5 h-3.5 ${favs.has(p.id) ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
        </button>
        <div className="absolute top-2 left-2 text-white text-[9px] font-semibold px-2 py-0.5 rounded-md" style={{ background: ac }}>New</div>
      </div>
      <h4 className="text-[12px] font-semibold text-foreground truncate">{p.title}</h4>
      <div className="flex items-center gap-1 text-[10px]">
        <span className="text-muted-foreground capitalize">{p.type}</span>
        <span className="text-muted-foreground">·</span>
        <Star className="w-3 h-3 fill-current" style={{ color: ac }} />
        <span className="font-medium">{p.rating}</span>
      </div>
      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5"><MapPin className="w-3 h-3" />{p.loc}</p>
      {!small && (
        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{p.guests}</span>
          <span className="flex items-center gap-0.5"><Bed className="w-3 h-3" />{p.beds}</span>
          <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" />{p.baths}</span>
        </div>
      )}
      <div className="flex items-center justify-between mt-1">
        <p className="text-[12px] font-bold" style={{ color: ac }}>£{p.price}<span className="text-[10px] font-normal text-muted-foreground"> / night</span></p>
      </div>
    </div>
  );

  // ── Footer ──
  const Footer = () => (
    <div className="bg-gray-900 text-gray-300 px-4 py-6 mt-4">
      <div className={isMobile ? '' : 'flex justify-between max-w-4xl mx-auto'}>
        <div>
          <span className="text-[13px] font-bold" style={{ color: ac }}>{branding.brandName}</span>
          <p className="text-[10px] text-gray-500 mt-1">Book directly. No middleman fees.</p>
          {(branding.socialInstagram || branding.socialFacebook || branding.socialTwitter || branding.socialTiktok) && (
            <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
              {branding.socialInstagram && <span>Instagram</span>}
              {branding.socialFacebook && <span>Facebook</span>}
              {branding.socialTwitter && <span>Twitter</span>}
              {branding.socialTiktok && <span>TikTok</span>}
            </div>
          )}
        </div>
        <div className={isMobile ? 'mt-3' : ''}>
          <p className="text-[11px] font-semibold text-gray-400 mb-1.5">Contact</p>
          {branding.contactEmail && <p className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-1"><Mail className="w-3 h-3" />{branding.contactEmail}</p>}
          {branding.contactPhone && <p className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-1"><Phone className="w-3 h-3" />{branding.contactPhone}</p>}
          {branding.contactWhatsapp && <p className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-1"><MessageCircle className="w-3 h-3" />{branding.contactWhatsapp}</p>}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-800 text-[9px] text-gray-600 text-center">
        © 2026 {branding.brandName}. Powered by nfstay.
      </div>
    </div>
  );

  // ── SEARCH PAGE ──
  if (page === 'search') return (
    <div onClick={() => setContactOpen(false)}>
      <Navbar />
      <MobileMenu />
      <div className={isMobile ? '' : 'flex h-[500px]'}>
        {/* Left: Property grid */}
        <div className={`${isMobile ? '' : 'w-[55%] border-r border-gray-200'} overflow-y-auto p-4`}>
          <p className="text-[11px] font-semibold text-foreground mb-3">{PROPS.length}+ results in London</p>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {PROPS.map(p => <Card key={p.id} p={p} />)}
          </div>
        </div>
        {/* Right: Map placeholder */}
        {!isMobile && (
          <div className="flex-1 bg-gray-100 flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-30" style={{ background: `url('https://api.mapbox.com/styles/v1/mapbox/light-v11/static/-0.1,51.51,11,0/600x500@2x?access_token=pk.placeholder')`, backgroundSize: 'cover' }} />
            <div className="relative text-center">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" style={{ color: ac }} />
              <p className="text-[12px] text-muted-foreground font-medium">London, UK</p>
              <p className="text-[10px] text-muted-foreground">{PROPS.length} properties</p>
              {/* Map pins */}
              {PROPS.map(p => (
                <div key={p.id} className="absolute w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white text-[8px] font-bold cursor-pointer hover:scale-125 transition-transform"
                  style={{ background: ac, left: `${((p.lng + 0.25) / 0.5) * 80 + 10}%`, top: `${((51.55 - p.lat) / 0.1) * 80 + 10}%` }}
                  onClick={() => openProperty(p)}
                >
                  £{p.price}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );

  // ── PROPERTY DETAIL PAGE ──
  if (page === 'property') return (
    <div onClick={() => setContactOpen(false)}>
      <Navbar />
      <MobileMenu />
      {/* Back bar */}
      <div className="sticky top-14 z-[5] bg-white/80 backdrop-blur border-b border-gray-100 px-4 h-10 flex items-center">
        <button onClick={() => setPage('search')} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"><ChevronLeft className="w-3.5 h-3.5" />Back</button>
        <span className="flex-1 text-center text-[11px] font-medium text-foreground truncate px-4">{selectedProp.title}</span>
        <button onClick={e => { e.stopPropagation(); toggleFav(selectedProp.id); }} className="p-1">
          <Heart className={`w-4 h-4 ${favs.has(selectedProp.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
        </button>
      </div>
      {/* Photo */}
      <img src={selectedProp.img} alt="" className="w-full h-[220px] object-cover" />
      {/* Content + Sidebar */}
      <div className={`p-4 ${isMobile ? '' : 'flex gap-5'}`}>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-foreground">{selectedProp.title}</h1>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
            <MapPin className="w-3 h-3" />{selectedProp.loc} · {selectedProp.type} · {selectedProp.guests} guests · {selectedProp.beds} beds · {selectedProp.baths} baths
            · <Star className="w-3 h-3 fill-current" style={{ color: ac }} />{selectedProp.rating} ({selectedProp.reviews})
          </div>
          <hr className="my-3 border-gray-100" />
          <h3 className="text-[13px] font-semibold mb-1">About this place</h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{selectedProp.desc}</p>
          <hr className="my-3 border-gray-100" />
          <h3 className="text-[13px] font-semibold mb-1">What this place offers</h3>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {['WiFi', 'Kitchen', 'Washer', 'TV', 'Air conditioning', 'Free parking', 'Workspace', 'Heating'].map(a => (
              <span key={a} className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: `${ac}15`, color: ac }}>✓</span>
                {a}
              </span>
            ))}
          </div>
          <hr className="my-3 border-gray-100" />
          <h3 className="text-[13px] font-semibold mb-1">Where you'll be</h3>
          <div className="bg-gray-100 rounded-xl h-[150px] flex items-center justify-center">
            <MapPin className="w-6 h-6 opacity-40" style={{ color: ac }} />
            <span className="text-[11px] text-muted-foreground ml-1">{selectedProp.loc}</span>
          </div>
        </div>
        {/* Booking widget */}
        <div className={`${isMobile ? 'mt-4' : 'w-[220px]'} flex-shrink-0`}>
          <div className="border border-gray-200 rounded-2xl p-3 shadow-sm sticky top-28">
            <p className="text-lg font-bold" style={{ color: ac }}>£{selectedProp.price} <span className="text-[12px] font-normal text-gray-900">/ night</span></p>
            <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden text-[10px]">
              <div className="flex divide-x divide-gray-200">
                <div className="flex-1 p-2"><p className="font-semibold uppercase text-[9px] text-muted-foreground tracking-wider">Check in</p><p className="text-foreground">Add date</p></div>
                <div className="flex-1 p-2"><p className="font-semibold uppercase text-[9px] text-muted-foreground tracking-wider">Check out</p><p className="text-foreground">Add date</p></div>
              </div>
              <div className="p-2 border-t border-gray-200"><p className="font-semibold uppercase text-[9px] text-muted-foreground tracking-wider">Guests</p><p className="text-foreground flex items-center gap-1"><Users className="w-3 h-3" />1 guest</p></div>
            </div>
            <button onClick={onPayment} className="w-full mt-2 py-2.5 text-white text-[12px] font-semibold rounded-full hover:opacity-90 transition-opacity" style={{ background: grad }}>Reserve</button>
            <p className="text-center text-[9px] text-muted-foreground mt-1.5">You won't be charged yet</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );

  // ── HOME PAGE ──
  return (
    <div onClick={() => setContactOpen(false)}>
      <Navbar />
      <MobileMenu />
      {/* Hero */}
      <div className="px-4 pt-8 pb-6 text-center border-b border-gray-200">
        <h1 className={`font-semibold text-foreground ${isMobile ? 'text-xl' : 'text-3xl'}`}>{branding.heroHeadline}</h1>
        <p className="text-muted-foreground mt-2 text-[13px]">{branding.heroSubheadline}</p>
        {/* Search bar */}
        <div className="mt-5 max-w-[500px] mx-auto">
          <div className="border border-gray-200 rounded-full flex items-center p-1.5 shadow-sm hover:shadow-md transition-shadow bg-white">
            <div className="flex items-center gap-2 flex-1 px-2">
              <MapPin className="w-4 h-4 text-black shrink-0" />
              <span className="text-[12px] text-black">London</span>
            </div>
            <div className="h-6 w-px bg-gray-200 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1.5 px-3 text-[12px] text-gray-500">
              <Calendar className="w-4 h-4" />Any dates
            </div>
            <div className="h-6 w-px bg-gray-200 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1.5 px-3 text-[12px] text-gray-500">
              <Users className="w-4 h-4" />Guests
            </div>
            <button onClick={() => setPage('search')} className="px-4 py-2 text-white text-[12px] font-semibold rounded-full" style={{ background: grad }}>Search</button>
          </div>
        </div>
      </div>
      {/* Featured properties */}
      <div className="px-4 pt-6">
        <h3 className="text-[14px] font-semibold text-foreground mb-3">Featured Properties</h3>
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {PROPS.slice(0, isMobile ? 4 : 6).map(p => <Card key={p.id} p={p} />)}
        </div>
      </div>
      {/* Recently viewed */}
      <div className="px-4 mt-6">
        <h3 className="text-[14px] font-semibold text-foreground mb-3 flex items-center gap-1.5"><Clock className="w-4 h-4 text-muted-foreground" />Recently Viewed</h3>
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          {PROPS.slice(4, 8).map(p => <Card key={`rv-${p.id}`} p={p} small />)}
        </div>
      </div>
      {/* About section */}
      {branding.aboutBio && (
        <div className="px-4 mt-8 mb-4 max-w-[600px] mx-auto text-center">
          <h3 className="text-[14px] font-semibold text-foreground mb-2">About {branding.brandName}</h3>
          <p className="text-[12px] text-muted-foreground leading-relaxed">{branding.aboutBio}</p>
        </div>
      )}
      {/* FAQ section */}
      {(branding.faq1Q || branding.faq2Q || branding.faq3Q) && (
        <div className="px-4 mt-4 mb-6 max-w-[600px] mx-auto">
          <h3 className="text-[14px] font-semibold text-foreground mb-3 text-center">FAQ</h3>
          {[1, 2, 3].map(i => {
            const q = branding[`faq${i}Q`];
            const a = branding[`faq${i}A`];
            if (!q) return null;
            return (
              <div key={i} className="border-b border-gray-100 py-2.5">
                <p className="text-[12px] font-semibold text-foreground">{q}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{a}</p>
              </div>
            );
          })}
        </div>
      )}
      {/* Mobile bottom nav */}
      {isMobile && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-2 flex justify-center">
          <div className="flex bg-white border border-gray-200 rounded-full p-1 shadow-sm">
            <button onClick={() => setPage('home')} className="px-4 py-1.5 rounded-full text-[11px] font-medium text-white" style={{ background: page === 'home' ? grad : 'transparent', color: page === 'home' ? 'white' : '#6B7280' }}>Search</button>
            <button onClick={onPayment} className="px-4 py-1.5 rounded-full text-[11px] font-medium" style={{ color: '#6B7280' }}>Bookings</button>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
