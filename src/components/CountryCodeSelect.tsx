import { useState } from 'react';

export interface Country {
  code: string;
  dial: string;
  flag: string;
  name: string;
}

export const countries: Country[] = [
  { code: 'GB', dial: '+44', flag: '\u{1F1EC}\u{1F1E7}', name: 'United Kingdom' },
  { code: 'US', dial: '+1', flag: '\u{1F1FA}\u{1F1F8}', name: 'United States' },
  { code: 'AE', dial: '+971', flag: '\u{1F1E6}\u{1F1EA}', name: 'UAE' },
  { code: 'SA', dial: '+966', flag: '\u{1F1F8}\u{1F1E6}', name: 'Saudi Arabia' },
  { code: 'QA', dial: '+974', flag: '\u{1F1F6}\u{1F1E6}', name: 'Qatar' },
  { code: 'BH', dial: '+973', flag: '\u{1F1E7}\u{1F1ED}', name: 'Bahrain' },
  { code: 'CA', dial: '+1', flag: '\u{1F1E8}\u{1F1E6}', name: 'Canada' },
  { code: 'AU', dial: '+61', flag: '\u{1F1E6}\u{1F1FA}', name: 'Australia' },
  { code: 'IE', dial: '+353', flag: '\u{1F1EE}\u{1F1EA}', name: 'Ireland' },
  { code: 'DE', dial: '+49', flag: '\u{1F1E9}\u{1F1EA}', name: 'Germany' },
  { code: 'FR', dial: '+33', flag: '\u{1F1EB}\u{1F1F7}', name: 'France' },
  { code: 'ES', dial: '+34', flag: '\u{1F1EA}\u{1F1F8}', name: 'Spain' },
  { code: 'IT', dial: '+39', flag: '\u{1F1EE}\u{1F1F9}', name: 'Italy' },
  { code: 'PT', dial: '+351', flag: '\u{1F1F5}\u{1F1F9}', name: 'Portugal' },
  { code: 'NL', dial: '+31', flag: '\u{1F1F3}\u{1F1F1}', name: 'Netherlands' },
  { code: 'BR', dial: '+55', flag: '\u{1F1E7}\u{1F1F7}', name: 'Brazil' },
  { code: 'IN', dial: '+91', flag: '\u{1F1EE}\u{1F1F3}', name: 'India' },
  { code: 'PK', dial: '+92', flag: '\u{1F1F5}\u{1F1F0}', name: 'Pakistan' },
  { code: 'NG', dial: '+234', flag: '\u{1F1F3}\u{1F1EC}', name: 'Nigeria' },
  { code: 'ZA', dial: '+27', flag: '\u{1F1FF}\u{1F1E6}', name: 'South Africa' },
  { code: 'KE', dial: '+254', flag: '\u{1F1F0}\u{1F1EA}', name: 'Kenya' },
  { code: 'EG', dial: '+20', flag: '\u{1F1EA}\u{1F1EC}', name: 'Egypt' },
  { code: 'TR', dial: '+90', flag: '\u{1F1F9}\u{1F1F7}', name: 'Turkey' },
  { code: 'MY', dial: '+60', flag: '\u{1F1F2}\u{1F1FE}', name: 'Malaysia' },
  { code: 'SG', dial: '+65', flag: '\u{1F1F8}\u{1F1EC}', name: 'Singapore' },
  { code: 'PH', dial: '+63', flag: '\u{1F1F5}\u{1F1ED}', name: 'Philippines' },
  { code: 'TH', dial: '+66', flag: '\u{1F1F9}\u{1F1ED}', name: 'Thailand' },
  { code: 'ID', dial: '+62', flag: '\u{1F1EE}\u{1F1E9}', name: 'Indonesia' },
  { code: 'JP', dial: '+81', flag: '\u{1F1EF}\u{1F1F5}', name: 'Japan' },
  { code: 'KR', dial: '+82', flag: '\u{1F1F0}\u{1F1F7}', name: 'South Korea' },
  { code: 'CN', dial: '+86', flag: '\u{1F1E8}\u{1F1F3}', name: 'China' },
  { code: 'RU', dial: '+7', flag: '\u{1F1F7}\u{1F1FA}', name: 'Russia' },
  { code: 'MX', dial: '+52', flag: '\u{1F1F2}\u{1F1FD}', name: 'Mexico' },
  { code: 'CO', dial: '+57', flag: '\u{1F1E8}\u{1F1F4}', name: 'Colombia' },
  { code: 'AR', dial: '+54', flag: '\u{1F1E6}\u{1F1F7}', name: 'Argentina' },
  { code: 'CL', dial: '+56', flag: '\u{1F1E8}\u{1F1F1}', name: 'Chile' },
  { code: 'SE', dial: '+46', flag: '\u{1F1F8}\u{1F1EA}', name: 'Sweden' },
  { code: 'NO', dial: '+47', flag: '\u{1F1F3}\u{1F1F4}', name: 'Norway' },
  { code: 'DK', dial: '+45', flag: '\u{1F1E9}\u{1F1F0}', name: 'Denmark' },
  { code: 'PL', dial: '+48', flag: '\u{1F1F5}\u{1F1F1}', name: 'Poland' },
  { code: 'AT', dial: '+43', flag: '\u{1F1E6}\u{1F1F9}', name: 'Austria' },
  { code: 'CH', dial: '+41', flag: '\u{1F1E8}\u{1F1ED}', name: 'Switzerland' },
  { code: 'BE', dial: '+32', flag: '\u{1F1E7}\u{1F1EA}', name: 'Belgium' },
  { code: 'NZ', dial: '+64', flag: '\u{1F1F3}\u{1F1FF}', name: 'New Zealand' },
  { code: 'KW', dial: '+965', flag: '\u{1F1F0}\u{1F1FC}', name: 'Kuwait' },
  { code: 'OM', dial: '+968', flag: '\u{1F1F4}\u{1F1F2}', name: 'Oman' },
  { code: 'JO', dial: '+962', flag: '\u{1F1EF}\u{1F1F4}', name: 'Jordan' },
  { code: 'LB', dial: '+961', flag: '\u{1F1F1}\u{1F1E7}', name: 'Lebanon' },
  { code: 'GH', dial: '+233', flag: '\u{1F1EC}\u{1F1ED}', name: 'Ghana' },
  { code: 'TZ', dial: '+255', flag: '\u{1F1F9}\u{1F1FF}', name: 'Tanzania' },
  { code: 'BD', dial: '+880', flag: '\u{1F1E7}\u{1F1E9}', name: 'Bangladesh' },
  { code: 'LK', dial: '+94', flag: '\u{1F1F1}\u{1F1F0}', name: 'Sri Lanka' },
  { code: 'NP', dial: '+977', flag: '\u{1F1F3}\u{1F1F5}', name: 'Nepal' },
  { code: 'FI', dial: '+358', flag: '\u{1F1EB}\u{1F1EE}', name: 'Finland' },
  { code: 'CZ', dial: '+420', flag: '\u{1F1E8}\u{1F1FF}', name: 'Czech Republic' },
  { code: 'RO', dial: '+40', flag: '\u{1F1F7}\u{1F1F4}', name: 'Romania' },
  { code: 'HU', dial: '+36', flag: '\u{1F1ED}\u{1F1FA}', name: 'Hungary' },
  { code: 'GR', dial: '+30', flag: '\u{1F1EC}\u{1F1F7}', name: 'Greece' },
  { code: 'UA', dial: '+380', flag: '\u{1F1FA}\u{1F1E6}', name: 'Ukraine' },
  { code: 'IL', dial: '+972', flag: '\u{1F1EE}\u{1F1F1}', name: 'Israel' },
  { code: 'IQ', dial: '+964', flag: '\u{1F1EE}\u{1F1F6}', name: 'Iraq' },
  { code: 'MA', dial: '+212', flag: '\u{1F1F2}\u{1F1E6}', name: 'Morocco' },
  { code: 'TN', dial: '+216', flag: '\u{1F1F9}\u{1F1F3}', name: 'Tunisia' },
  { code: 'ET', dial: '+251', flag: '\u{1F1EA}\u{1F1F9}', name: 'Ethiopia' },
  { code: 'UG', dial: '+256', flag: '\u{1F1FA}\u{1F1EC}', name: 'Uganda' },
  { code: 'RW', dial: '+250', flag: '\u{1F1F7}\u{1F1FC}', name: 'Rwanda' },
  { code: 'CM', dial: '+237', flag: '\u{1F1E8}\u{1F1F2}', name: 'Cameroon' },
  { code: 'SN', dial: '+221', flag: '\u{1F1F8}\u{1F1F3}', name: 'Senegal' },
  { code: 'VN', dial: '+84', flag: '\u{1F1FB}\u{1F1F3}', name: 'Vietnam' },
  { code: 'MM', dial: '+95', flag: '\u{1F1F2}\u{1F1F2}', name: 'Myanmar' },
  { code: 'KH', dial: '+855', flag: '\u{1F1F0}\u{1F1ED}', name: 'Cambodia' },
  { code: 'TW', dial: '+886', flag: '\u{1F1F9}\u{1F1FC}', name: 'Taiwan' },
  { code: 'HK', dial: '+852', flag: '\u{1F1ED}\u{1F1F0}', name: 'Hong Kong' },
  { code: 'PE', dial: '+51', flag: '\u{1F1F5}\u{1F1EA}', name: 'Peru' },
  { code: 'EC', dial: '+593', flag: '\u{1F1EA}\u{1F1E8}', name: 'Ecuador' },
  { code: 'VE', dial: '+58', flag: '\u{1F1FB}\u{1F1EA}', name: 'Venezuela' },
  { code: 'HR', dial: '+385', flag: '\u{1F1ED}\u{1F1F7}', name: 'Croatia' },
  { code: 'RS', dial: '+381', flag: '\u{1F1F7}\u{1F1F8}', name: 'Serbia' },
  { code: 'BG', dial: '+359', flag: '\u{1F1E7}\u{1F1EC}', name: 'Bulgaria' },
  { code: 'SK', dial: '+421', flag: '\u{1F1F8}\u{1F1F0}', name: 'Slovakia' },
  { code: 'SI', dial: '+386', flag: '\u{1F1F8}\u{1F1EE}', name: 'Slovenia' },
  { code: 'LT', dial: '+370', flag: '\u{1F1F1}\u{1F1F9}', name: 'Lithuania' },
  { code: 'LV', dial: '+371', flag: '\u{1F1F1}\u{1F1FB}', name: 'Latvia' },
  { code: 'EE', dial: '+372', flag: '\u{1F1EA}\u{1F1EA}', name: 'Estonia' },
  { code: 'MT', dial: '+356', flag: '\u{1F1F2}\u{1F1F9}', name: 'Malta' },
  { code: 'CY', dial: '+357', flag: '\u{1F1E8}\u{1F1FE}', name: 'Cyprus' },
  { code: 'IS', dial: '+354', flag: '\u{1F1EE}\u{1F1F8}', name: 'Iceland' },
  { code: 'LU', dial: '+352', flag: '\u{1F1F1}\u{1F1FA}', name: 'Luxembourg' },
  { code: 'JM', dial: '+1876', flag: '\u{1F1EF}\u{1F1F2}', name: 'Jamaica' },
  { code: 'TT', dial: '+1868', flag: '\u{1F1F9}\u{1F1F9}', name: 'Trinidad & Tobago' },
  { code: 'DZ', dial: '+213', flag: '\u{1F1E9}\u{1F1FF}', name: 'Algeria' },
  { code: 'LY', dial: '+218', flag: '\u{1F1F1}\u{1F1FE}', name: 'Libya' },
  { code: 'SD', dial: '+249', flag: '\u{1F1F8}\u{1F1E9}', name: 'Sudan' },
  { code: 'AF', dial: '+93', flag: '\u{1F1E6}\u{1F1EB}', name: 'Afghanistan' },
  { code: 'IR', dial: '+98', flag: '\u{1F1EE}\u{1F1F7}', name: 'Iran' },
  { code: 'UY', dial: '+598', flag: '\u{1F1FA}\u{1F1FE}', name: 'Uruguay' },
  { code: 'PY', dial: '+595', flag: '\u{1F1F5}\u{1F1FE}', name: 'Paraguay' },
  { code: 'BO', dial: '+591', flag: '\u{1F1E7}\u{1F1F4}', name: 'Bolivia' },
];

interface CountryCodeSelectProps {
  value: string;
  onChange: (val: string) => void;
}

export default function CountryCodeSelect({ value, onChange }: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = countries.find((c) => c.dial === value) || countries[0];
  const filtered = search
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dial.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase()),
      )
    : countries;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 h-10 px-3 rounded-l-md border border-r-0 border-input bg-background text-sm hover:bg-accent transition-colors shrink-0"
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="font-medium text-foreground">{selected.dial}</span>
        <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-[260px] bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="p-2 border-b border-border">
              <input
                type="text"
                placeholder="Search country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm px-2 py-1.5 rounded bg-background border border-input outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>
            <div className="max-h-[240px] overflow-y-auto">
              {filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onChange(c.dial);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors ${
                    c.dial === value ? 'bg-accent' : ''
                  }`}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="font-medium">{c.dial}</span>
                  <span className="text-muted-foreground text-xs ml-auto">{c.name}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No results</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
