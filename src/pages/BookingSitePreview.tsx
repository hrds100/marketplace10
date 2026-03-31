/**
 * Booking site preview — cloned from nfstay.app components.
 * Self-contained, zero bookingsite code changes.
 * Uses exact same Tailwind classes and layout structure.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, MapPin, Star, Users, Bed, Bath, Heart, ChevronDown, ChevronLeft, ChevronRight,
  Clock, Mail, Phone, MessageCircle, User, Menu, X, Calendar, CircleUserRound,
} from 'lucide-react';

// ── Mock Properties (London) ──
const PROPS = [
  { id: '1', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80', title: 'Modern Shoreditch Loft', loc: 'London', country: 'UK', price: 145, beds: 2, baths: 1, guests: 4, type: 'Apartment', rating: 4.8, reviews: 24, lat: 51.525, lng: -0.077, desc: 'Stunning loft apartment in the heart of Shoreditch with exposed brick, modern amenities, and fantastic local restaurants within walking distance. The space is filled with natural light and features a fully equipped kitchen.' },
  { id: '2', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80', title: 'Chelsea Garden Flat', loc: 'London', country: 'UK', price: 195, beds: 3, baths: 2, guests: 6, type: 'Apartment', rating: 4.9, reviews: 31, lat: 51.487, lng: -0.168, desc: 'Elegant garden flat in Chelsea with private terrace, period features, and easy access to Kings Road shops and cafes. This beautifully appointed home has been recently renovated to the highest standard.' },
  { id: '3', img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80', title: 'Covent Garden Studio', loc: 'London', country: 'UK', price: 89, beds: 1, baths: 1, guests: 2, type: 'Studio', rating: 4.7, reviews: 18, lat: 51.511, lng: -0.124, desc: 'Compact and stylish studio steps from Covent Garden and theatreland. Perfect for couples exploring central London. Enjoy West End shows just minutes from your door.' },
  { id: '4', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80', title: 'Camden Townhouse', loc: 'London', country: 'UK', price: 250, beds: 4, baths: 3, guests: 8, type: 'House', rating: 4.6, reviews: 12, lat: 51.539, lng: -0.142, desc: 'Spacious Victorian townhouse in Camden with rooftop terrace and canal views. Great for families and groups. The property has been lovingly restored with original features throughout.' },
  { id: '5', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80', title: 'Notting Hill Mews', loc: 'London', country: 'UK', price: 175, beds: 2, baths: 1, guests: 4, type: 'Apartment', rating: 4.8, reviews: 42, lat: 51.511, lng: -0.205, desc: 'Charming mews apartment on a quiet cobbled street in Notting Hill. Walking distance to Portobello Road Market and all the famous pastel-coloured houses.' },
  { id: '6', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80', title: 'Canary Wharf Penthouse', loc: 'London', country: 'UK', price: 320, beds: 3, baths: 2, guests: 6, type: 'Penthouse', rating: 5.0, reviews: 8, lat: 51.505, lng: -0.023, desc: 'Luxury penthouse with panoramic Thames views, 24hr concierge, and state-of-the-art amenities. Floor-to-ceiling windows offer breathtaking views across the city.' },
  { id: '7', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80', title: 'Brixton Artist Flat', loc: 'London', country: 'UK', price: 95, beds: 1, baths: 1, guests: 3, type: 'Apartment', rating: 4.5, reviews: 15, lat: 51.461, lng: -0.115, desc: 'Creative space in vibrant Brixton with local art and colourful interiors. Near markets and live music venues. A truly unique stay in one of London\'s most exciting neighbourhoods.' },
  { id: '8', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80', title: 'Greenwich Riverside Home', loc: 'London', country: 'UK', price: 165, beds: 3, baths: 2, guests: 5, type: 'House', rating: 4.9, reviews: 22, lat: 51.476, lng: -0.000, desc: 'Beautiful riverside home near Greenwich Park with garden and river walks. Ideal for families who want to explore the Royal Observatory and Cutty Sark.' },
];

interface BrandingData { [key: string]: string }
interface PreviewProps { branding: BrandingData; isMobile: boolean; onPayment: () => void }
type Prop = typeof PROPS[0];

export default function BookingSitePreview({ branding, isMobile, onPayment }: PreviewProps) {
  const [page, setPage] = useState<'home' | 'search' | 'property'>('home');
  const [contactOpen, setContactOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedProp, setSelectedProp] = useState(PROPS[0]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const ac = branding.accentColor || '#1E9A80';
  const grad = `linear-gradient(270deg, ${ac}cc 0%, ${ac} 100%)`;

  const toggleFav = (id: string, e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setFavs(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  };
  const openProp = (p: Prop) => { setSelectedProp(p); setPage('property'); };
  const close = () => setContactOpen(false);

  // ── NAVBAR (cloned from NfsMainNavbar) ──
  const Navbar = ({ showSearch }: { showSearch?: boolean }) => (
    <nav className="sticky top-0 left-0 right-0 w-full h-14 sm:h-16 bg-white z-10 border-b border-gray-200/50">
      <div className="max-w-full mx-auto px-3 sm:px-4 h-full">
        <div className={`${showSearch ? 'flex justify-between items-center' : 'grid grid-cols-3'} h-full gap-2`}>
          {/* LEFT: Logo — click to go home */}
          <div className={`flex items-center gap-2 ${showSearch && isMobile ? 'hidden' : 'flex'}`}>
            <button onClick={() => setPage('home')} className="text-base sm:text-lg font-bold hover:opacity-80 transition-opacity" style={{ color: ac }}>{branding.brandName || 'Your Brand'}</button>
          </div>

          {/* CENTER: Toggle pill or Search bar */}
          {showSearch ? (
            <div className="flex-1 max-w-[500px] mx-4">
              <div className="flex items-center border border-gray-200 rounded-full bg-white px-2 py-1.5 shadow-sm">
                <Search className="w-3.5 h-3.5 text-gray-400 ml-1" />
                <span className="flex-1 text-[11px] text-gray-400 ml-2">London, UK</span>
                {!isMobile && <><span className="text-gray-200 px-1">|</span><span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />Any dates</span></>}
                {!isMobile && <><span className="text-gray-200 px-1">|</span><span className="text-[11px] text-gray-400 flex items-center gap-1"><Users className="w-3 h-3" />1 guest</span></>}
                <button className="px-3 py-1 text-white text-[10px] font-semibold rounded-full ml-2" style={{ background: grad }}>Search</button>
              </div>
            </div>
          ) : !isMobile ? (
            <div className="flex items-center justify-center">
              <div className="relative bg-white border border-gray-200/50 rounded-full p-1.5 shadow-lg shadow-emerald-500/5 flex">
                <button onClick={() => setPage('home')} className="relative z-10 px-5 py-2 rounded-full text-[11px] font-medium text-white min-w-[100px]" style={{ background: page !== 'property' ? grad : 'transparent', color: page !== 'property' ? 'white' : '#6B7280' }}>Find Stays</button>
                <button onClick={onPayment} className="relative z-10 px-5 py-2 rounded-full text-[11px] font-medium min-w-[120px]" style={{ color: '#6B7280' }}>My Reservations</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center"><span className="text-[10px] text-muted-foreground">GBP £</span></div>
          )}

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-1.5 justify-end">
            {!isMobile && (
              <div className="relative">
                <button onClick={() => setContactOpen(!contactOpen)} className="px-2.5 py-1 text-[10px] font-medium border border-gray-200 rounded-full hover:bg-gray-50 flex items-center gap-1">
                  Contact <ChevronDown className={`w-2.5 h-2.5 transition-transform ${contactOpen ? 'rotate-180' : ''}`} />
                </button>
                {contactOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={close} />
                    <div className="absolute right-0 top-8 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                      <button className="w-full px-3 py-2.5 text-[11px] text-foreground flex items-center gap-3 hover:bg-gray-50 transition-colors">
                        <MessageCircle className="w-4 h-4 text-[#25D366]" />{branding.contactWhatsapp || '+44 7xxx xxx xxx'}
                      </button>
                      <button className="w-full px-3 py-2.5 text-[11px] text-foreground flex items-center gap-3 hover:bg-gray-50 transition-colors">
                        <Mail className="w-4 h-4" />{branding.contactEmail || 'hello@yourbrand.com'}
                      </button>
                      <button className="w-full px-3 py-2.5 text-[11px] text-foreground flex items-center gap-3 hover:bg-gray-50 transition-colors">
                        <Phone className="w-4 h-4" />{branding.contactPhone || '+44 xxx xxx xxxx'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            <button onClick={onPayment} className="px-2.5 py-1 text-[10px] font-medium text-white rounded-full" style={{ background: grad }}>Sign In</button>
            {isMobile && <button onClick={() => setMenuOpen(true)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Menu className="w-4 h-4" /></button>}
          </div>
        </div>
      </div>
    </nav>
  );

  // ── MOBILE MENU (cloned from NfsMainNavbar right drawer) ──
  const MobileMenu = () => !menuOpen ? null : (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20" onClick={() => setMenuOpen(false)} />
      <div className="fixed inset-y-0 right-0 w-[260px] bg-white shadow-2xl z-30 border-l border-gray-200/50">
        <div className="p-4 flex justify-end"><button onClick={() => setMenuOpen(false)} className="p-1 bg-gray-100 rounded-md"><X className="w-4 h-4" /></button></div>
        <div className="flex-1 py-2">
          {['Find a stay', 'My Reservations', 'Contact'].map(item => (
            <button key={item} onClick={() => { if (item === 'Find a stay') setPage('home'); else if (item === 'My Reservations') onPayment(); setMenuOpen(false); }}
              className="flex items-center w-full py-3 px-6 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 border-l-2 border-transparent hover:border-emerald-600 transition-colors"
            >{item}</button>
          ))}
        </div>
        <div className="border-t border-gray-100 bg-gradient-to-r from-emerald-50/50 to-emerald-50/30 py-6 px-6 space-y-3">
          <button onClick={() => { onPayment(); setMenuOpen(false); }} className="block w-full px-4 py-3 font-medium text-white rounded-xl text-center text-sm" style={{ background: grad }}>Sign In</button>
          {branding.contactWhatsapp && <p className="text-xs text-gray-500 flex items-center gap-2"><MessageCircle className="w-3 h-3 text-[#25D366]" />{branding.contactWhatsapp}</p>}
          {branding.contactEmail && <p className="text-xs text-gray-500 flex items-center gap-2"><Mail className="w-3 h-3" />{branding.contactEmail}</p>}
        </div>
      </div>
    </>
  );

  // ── PROPERTY CARD (cloned from NfsPropertyCard) ──
  const Card = ({ p, small }: { p: Prop; small?: boolean }) => (
    <div className="group block cursor-pointer" onClick={() => openProp(p)} onMouseEnter={() => setHoveredId(p.id)} onMouseLeave={() => setHoveredId(null)}>
      <div className={`relative ${small ? 'aspect-square' : 'aspect-[320/300]'} rounded-2xl overflow-hidden mb-2.5`}>
        <img src={p.img} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
        <button onClick={e => toggleFav(p.id, e)} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition">
          <Heart className={`w-4 h-4 ${favs.has(p.id) ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
        </button>
        <span className="absolute top-3 left-3 z-10 text-white text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: ac }}>New</span>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground truncate leading-tight">{p.title}</h3>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground capitalize">{p.type}</span>
          <span className="text-muted-foreground">·</span>
          <span className="flex items-center gap-0.5 font-medium text-foreground"><Star className="w-3 h-3" style={{ fill: ac, color: ac }} />{p.rating}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{p.loc}, {p.country}</span>
        </div>
        {!small && (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{p.guests}</span>
              <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" />{p.beds}</span>
              <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{p.baths}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-foreground">£{p.price}</span>
              <span className="text-[11px] text-muted-foreground block leading-tight">avg per night</span>
            </div>
          </div>
        )}
        {small && <p className="text-xs font-bold text-foreground">£{p.price}<span className="text-[10px] font-normal text-muted-foreground"> / night</span></p>}
      </div>
    </div>
  );

  // ── GOOGLE MAP (cloned from NfsSearchMap) ──
  const SearchMap = () => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

    useEffect(() => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey || !mapRef.current) return;
      if (mapInstanceRef.current) return; // already loaded

      const existing = document.querySelector('script[src*="maps.googleapis.com"]');
      const init = () => {
        if (!mapRef.current || !window.google?.maps) return;
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 51.51, lng: -0.1 },
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }, { featureType: 'transit', stylers: [{ visibility: 'off' }] }],
        });
        mapInstanceRef.current = map;

        // Add markers for all properties
        PROPS.forEach(p => {
          const marker = new window.google.maps.Marker({
            map, position: { lat: p.lat, lng: p.lng },
            label: { text: `£${p.price}`, color: '#fff', fontSize: '10px', fontWeight: '700' },
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0, fillOpacity: 0 },
          });

          // Custom label overlay
          const div = document.createElement('div');
          div.style.cssText = `background:${ac};color:#fff;padding:3px 6px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.2);border:2px solid #fff;`;
          div.textContent = `£${p.price}`;
          div.onclick = () => openProp(p);

          const overlay = new google.maps.OverlayView();
          overlay.onAdd = function () { this.getPanes()!.floatPane.appendChild(div); };
          overlay.draw = function () {
            const pos = this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(p.lat, p.lng));
            if (pos) { div.style.left = `${pos.x - 20}px`; div.style.top = `${pos.y - 12}px`; div.style.position = 'absolute'; }
          };
          overlay.onRemove = function () { div.remove(); };
          overlay.setMap(map);

          markersRef.current.set(p.id, marker);
        });
      };

      if (existing && window.google?.maps) { init(); return; }
      if (existing) { existing.addEventListener('load', init); return; }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = init;
      document.head.appendChild(script);
    }, []);

    // Pan to hovered property
    useEffect(() => {
      if (!mapInstanceRef.current || !hoveredId) return;
      const p = PROPS.find(x => x.id === hoveredId);
      if (p) mapInstanceRef.current.panTo({ lat: p.lat, lng: p.lng });
    }, [hoveredId]);

    return <div ref={mapRef} className="w-full h-full" />;
  };

  // ── FOOTER (cloned from NfsMainFooter — white-label version) ──
  const Footer = () => (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className={`grid gap-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-4'}`}>
          <div>
            <span className="text-base font-bold mb-3 block" style={{ color: ac }}>{branding.brandName || 'Your Brand'}</span>
            <p className="text-sm text-gray-500 mb-3">{branding.footerTagline || 'Book your stay directly. No middlemen, no hidden fees.'}</p>
            {(branding.socialInstagram || branding.socialFacebook || branding.socialTwitter || branding.socialTiktok) && (
              <div className="flex gap-3 text-xs text-gray-500">
                {branding.socialInstagram && <span className="hover:text-white cursor-pointer transition-colors">Instagram</span>}
                {branding.socialFacebook && <span className="hover:text-white cursor-pointer transition-colors">Facebook</span>}
                {branding.socialTwitter && <span className="hover:text-white cursor-pointer transition-colors">Twitter</span>}
                {branding.socialTiktok && <span className="hover:text-white cursor-pointer transition-colors">TikTok</span>}
              </div>
            )}
          </div>
          {(branding.contactEmail || branding.contactPhone || branding.contactWhatsapp) && (
            <div>
              <h4 className="text-sm font-semibold text-gray-200 mb-3">Contact</h4>
              <ul className="space-y-2">
                {branding.contactEmail && <li className="text-sm text-gray-500 flex items-center gap-2 hover:text-white transition-colors cursor-pointer"><Mail className="w-3.5 h-3.5" />{branding.contactEmail}</li>}
                {branding.contactPhone && <li className="text-sm text-gray-500 flex items-center gap-2 hover:text-white transition-colors cursor-pointer"><Phone className="w-3.5 h-3.5" />{branding.contactPhone}</li>}
                {branding.contactWhatsapp && <li className="text-sm text-gray-500 flex items-center gap-2 hover:text-white transition-colors cursor-pointer"><MessageCircle className="w-3.5 h-3.5" />WhatsApp</li>}
              </ul>
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-gray-200 mb-3">Quick Links</h4>
            <ul className="space-y-2">
              <li><button onClick={() => setPage('search')} className="text-sm text-gray-500 hover:text-white transition-colors">Search properties</button></li>
              <li><span className="text-sm text-gray-500 hover:text-white transition-colors cursor-pointer">How to book</span></li>
              <li><span className="text-sm text-gray-500 hover:text-white transition-colors cursor-pointer">Contact</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-200 mb-3">Legal</h4>
            <ul className="space-y-2">
              <li><span className="text-sm text-gray-500 hover:text-white transition-colors cursor-pointer">Privacy policy</span></li>
              <li><span className="text-sm text-gray-500 hover:text-white transition-colors cursor-pointer">Terms of service</span></li>
              <li><span className="text-sm text-gray-500 hover:text-white transition-colors cursor-pointer">Cookie policy</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-600">© 2026 {branding.brandName || 'Your Brand'}. Powered by nfstay.</p>
        </div>
      </div>
    </footer>
  );

  // ═══════════════════════════════════════════
  // SEARCH PAGE (cloned from NfsSearchPage)
  // ═══════════════════════════════════════════
  if (page === 'search') return (
    <div onClick={close}>
      <Navbar showSearch />
      <MobileMenu />
      <div className={`flex ${isMobile ? 'flex-col' : ''}`} style={{ height: isMobile ? 'auto' : '500px' }}>
        {/* Left: Listings */}
        <div className={`${isMobile ? '' : 'w-[50%] border-r border-gray-200'} overflow-y-auto`}>
          <div className="px-5 pt-4 pb-2">
            <p className="text-sm font-semibold text-foreground">{PROPS.length}+ results</p>
          </div>
          <div className={`px-5 pb-6 grid gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {PROPS.map(p => <Card key={p.id} p={p} />)}
          </div>
        </div>
        {/* Right: Map */}
        {!isMobile && (
          <div className="flex-1">
            <SearchMap />
          </div>
        )}
      </div>
      {/* Mobile: show map below */}
      {isMobile && (
        <div className="h-[250px] mx-4 mb-4 rounded-xl overflow-hidden">
          <SearchMap />
        </div>
      )}
      {/* No footer on search page — matches real nfstay.app */}
      {/* Mobile bottom nav */}
      {isMobile && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-2 flex justify-center z-10">
          <div className="flex bg-white border border-gray-200 rounded-full p-1 shadow-sm">
            <button onClick={() => setPage('home')} className="px-4 py-1.5 rounded-full text-[11px] font-medium text-white" style={{ background: grad }}>Search</button>
            <button onClick={onPayment} className="px-4 py-1.5 rounded-full text-[11px] font-medium text-gray-600">Bookings</button>
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════
  // PROPERTY DETAIL (cloned from NfsPropertyDetail + NfsBookingWidget)
  // ═══════════════════════════════════════════
  if (page === 'property') return (
    <div onClick={close}>
      <Navbar showSearch />
      <MobileMenu />
      {/* Sticky sub-nav */}
      <div className="sticky top-14 sm:top-16 z-[5] bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setPage('search')} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium truncate max-w-[200px]">{selectedProp.title}</span>
          </div>
          <button onClick={e => toggleFav(selectedProp.id, e)} className="p-2 rounded-lg hover:bg-gray-100">
            <Heart className={`w-4 h-4 ${favs.has(selectedProp.id) ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Photo gallery */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className={`rounded-2xl overflow-hidden ${isMobile ? '' : 'grid grid-cols-4 grid-rows-2 gap-2 h-[400px]'}`}>
          <img src={selectedProp.img} alt="" className={`w-full object-cover cursor-pointer ${isMobile ? 'h-[250px] rounded-2xl' : 'col-span-2 row-span-2 h-full'}`} />
          {!isMobile && PROPS.filter(x => x.id !== selectedProp.id).slice(0, 4).map((p, i) => (
            <div key={i} className="relative cursor-pointer overflow-hidden">
              <img src={p.img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
              {i === 3 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-white font-semibold">+4 more</span></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Content + Sidebar */}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col ${isMobile ? '' : 'xl:flex-row'} gap-8`}>
        {/* Left content */}
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold leading-tight mb-3">{selectedProp.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />{selectedProp.loc}, {selectedProp.country}
              <span>·</span>{selectedProp.type}
              <span>·</span>{selectedProp.guests} guests
              <span>·</span>{selectedProp.beds} bedrooms
              <span>·</span>{selectedProp.baths} bathrooms
              <span>·</span><span className="flex items-center gap-1 font-medium" style={{ color: ac }}><Star className="w-3.5 h-3.5" style={{ fill: ac }} />{selectedProp.rating} ({selectedProp.reviews} reviews)</span>
            </div>
          </div>

          <hr className="border-gray-200" />
          <div>
            <h3 className="text-lg font-semibold mb-3">About this place</h3>
            <p className="text-sm text-foreground leading-relaxed">{selectedProp.desc}</p>
          </div>

          <hr className="border-gray-200" />
          <div>
            <h3 className="text-lg font-semibold mb-3">What this place offers</h3>
            <div className="grid grid-cols-2 gap-3">
              {['WiFi', 'Kitchen', 'Washer', 'TV', 'Air conditioning', 'Free parking', 'Workspace', 'Heating', 'Garden', 'Balcony'].map(a => (
                <span key={a} className="flex items-center gap-2 text-sm"><span className="w-4 h-4 flex items-center justify-center" style={{ color: ac }}>✓</span>{a}</span>
              ))}
            </div>
          </div>

          <hr className="border-gray-200" />
          <div>
            <h3 className="text-lg font-semibold mb-3">House rules</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" />Check-in after 3:00 PM</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" />Check-out before 11:00 AM</span>
              <span className="flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" />Max {selectedProp.guests} guests</span>
              <span className="flex items-center gap-2 text-muted-foreground">No pets</span>
            </div>
          </div>

          <hr className="border-gray-200" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Where you'll be</h3>
            <p className="text-sm text-muted-foreground mb-3">{selectedProp.loc}, {selectedProp.country}</p>
            <div className="rounded-2xl overflow-hidden h-[250px]">
              <SearchMap />
            </div>
          </div>
        </div>

        {/* Right: Booking widget (cloned from NfsBookingWidget) */}
        <div className={`${isMobile ? '' : 'xl:w-96 xl:sticky xl:top-28 xl:self-start'}`}>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-md">
            <div className="mb-4">
              <span className="text-xl sm:text-2xl font-bold" style={{ color: ac }}>£{selectedProp.price}</span>
              <span className="text-base font-normal text-gray-900 ml-1">/ night</span>
            </div>

            <div className="w-full border border-gray-200 rounded-xl overflow-hidden mb-3">
              <div className="grid grid-cols-2 divide-x divide-gray-200">
                <div className="p-3 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Check in</p>
                  <p className="text-sm">Add date</p>
                </div>
                <div className="p-3 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Check out</p>
                  <p className="text-sm">Add date</p>
                </div>
              </div>
              <div className="p-3 border-t border-gray-200 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Guests</p>
                <p className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" />1 guest</p>
              </div>
            </div>

            <button onClick={onPayment} className="w-full text-white font-semibold py-3.5 px-6 rounded-full hover:opacity-90 transition-all text-base" style={{ background: grad }}>
              Reserve
            </button>
            <p className="text-center text-xs text-muted-foreground mt-3">You won't be charged yet</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );

  // ═══════════════════════════════════════════
  // HOME PAGE (cloned from NfsHeroSearch + landing)
  // ═══════════════════════════════════════════
  return (
    <div onClick={close}>
      <Navbar />
      <MobileMenu />

      {/* Hero + Search (cloned from NfsHeroSearch) */}
      <div className="border-b border-gray-200 pb-8 md:pb-12">
        <section className="flex items-center justify-center px-2">
          <div className="w-full max-w-[500px] md:max-w-[900px] mt-4 md:mt-12">
            <div className="text-center px-4 py-2 mb-4 md:mb-6">
              <h1 className={`font-semibold text-foreground ${isMobile ? 'text-2xl' : 'text-4xl md:text-5xl'}`}>{branding.heroHeadline || 'Find Your Perfect Stay'}</h1>
              {branding.heroSubheadline && <p className="text-[#9d9da1] mt-3 md:mt-6">{branding.heroSubheadline}</p>}
            </div>
            {/* Search bar (cloned from NfsHeroSearch) */}
            <div className={`border border-gray-200 ${isMobile ? 'rounded-3xl p-5' : 'rounded-full p-1.5'} flex ${isMobile ? 'flex-col' : 'items-center'} shadow-sm hover:shadow-md transition-shadow bg-white`}>
              <div className={`flex items-center flex-1 p-2 ${isMobile ? 'border-b border-gray-200' : ''}`}>
                <MapPin className="w-5 h-5 text-black shrink-0" />
                <span className="ml-2 text-sm text-black">London</span>
                <ChevronDown className="w-4 h-4 text-black ml-auto shrink-0" />
                {!isMobile && <div className="h-7 w-px bg-gray-200 ml-2" />}
              </div>
              <div className={`flex items-center flex-1 p-2 ${isMobile ? 'border-b border-gray-200 mt-3' : ''}`}>
                <Calendar className="w-5 h-5 text-black shrink-0" />
                <span className="ml-2 text-sm text-black">Any dates</span>
                <ChevronDown className="w-4 h-4 text-black ml-auto shrink-0" />
                {!isMobile && <div className="h-7 w-px bg-gray-200 ml-2" />}
              </div>
              <div className={`flex items-center flex-1 p-2 ${isMobile ? 'mt-3' : ''}`}>
                <CircleUserRound className="w-5 h-5 text-black shrink-0" />
                <span className="ml-2 text-sm text-black">Any guests</span>
                <ChevronDown className="w-4 h-4 text-black ml-auto shrink-0" />
              </div>
              <button onClick={() => setPage('search')} className={`${isMobile ? 'w-full mt-4' : 'w-[140px]'} h-[50px] text-white font-semibold rounded-full text-sm flex items-center justify-center`} style={{ background: grad }}>Search</button>
            </div>
          </div>
        </section>
      </div>

      {/* Featured Properties */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Featured Properties</h3>
        <div className={`grid gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 xl:grid-cols-3'}`}>
          {PROPS.slice(0, isMobile ? 4 : 6).map(p => <Card key={p.id} p={p} />)}
        </div>
      </div>

      {/* Recently Viewed */}
      <div className="max-w-7xl mx-auto px-4 mt-10">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-muted-foreground" />Recently Viewed</h3>
        <div className={`grid gap-5 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          {PROPS.slice(4, 8).map(p => <Card key={`rv-${p.id}`} p={p} small />)}
        </div>
      </div>

      {/* About */}
      {branding.aboutBio && (
        <div className="max-w-2xl mx-auto px-4 mt-12 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-3">About {branding.brandName || 'Us'}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{branding.aboutBio}</p>
        </div>
      )}

      {/* FAQ */}
      {(branding.faq1Q || branding.faq2Q || branding.faq3Q) && (
        <div className="max-w-2xl mx-auto px-4 mt-10 mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Frequently Asked Questions</h3>
          {[1, 2, 3].map(i => {
            const q = branding[`faq${i}Q`]; const a = branding[`faq${i}A`];
            if (!q) return null;
            return (
              <div key={i} className="border-b border-gray-100 py-3">
                <p className="text-sm font-semibold text-foreground">{q}</p>
                <p className="text-sm text-muted-foreground mt-1">{a}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile bottom nav */}
      {isMobile && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-2 flex justify-center z-10">
          <div className="flex bg-white border border-gray-200 rounded-full p-1 shadow-sm">
            <button className="px-4 py-1.5 rounded-full text-[11px] font-medium text-white" style={{ background: grad }}>Search</button>
            <button onClick={onPayment} className="px-4 py-1.5 rounded-full text-[11px] font-medium text-gray-600">Bookings</button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
