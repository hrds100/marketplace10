interface NfsLogoProps {
  className?: string;
  size?: 'default' | 'sm';
}

export function NfsLogo({ className = '', size = 'default' }: NfsLogoProps) {
  const isSmall = size === 'sm';

  return (
    <a href="https://nfstay.com" className={`flex items-center ${className}`} style={{ gap: isSmall ? 3 : 3 }}>
      <div
        style={{
          width: isSmall ? 28 : 36,
          height: isSmall ? 28 : 36,
          border: isSmall ? '1.5px solid #0a0a0a' : '2px solid #0a0a0a',
          borderRadius: isSmall ? 6 : 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Sora', sans-serif",
          fontWeight: 700,
          fontSize: isSmall ? 12 : 16,
          color: '#0a0a0a',
          lineHeight: 1,
        }}
      >
        nf
      </div>
      <span
        style={{
          fontFamily: "'Sora', sans-serif",
          fontWeight: 400,
          fontSize: isSmall ? 18 : 24,
          color: '#0a0a0a',
          letterSpacing: 2,
          lineHeight: 1,
        }}
      >
        stay
      </span>
    </a>
  );
}
