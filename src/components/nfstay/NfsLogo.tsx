import { Link } from "react-router-dom";

export function NfsLogo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center ${className}`} style={{ gap: 6 }}>
      <div
        style={{
          width: 34,
          height: 34,
          border: '1.5px solid #111',
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 500,
          fontSize: 14,
          color: '#111',
          letterSpacing: -0.5,
        }}
      >
        nf
      </div>
      <span
        style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: 400,
          fontSize: 28,
          fontStyle: 'italic',
          color: '#111',
          letterSpacing: 0,
        }}
      >
        stay
      </span>
    </Link>
  );
}
