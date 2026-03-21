import { Link } from "react-router-dom";

export function NfsLogo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-4 ${className}`}>
      <div
        style={{
          width: 36,
          height: 36,
          border: '2px solid #111',
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Sora', sans-serif",
          fontWeight: 700,
          fontSize: 15,
          color: '#111',
        }}
      >
        nf
      </div>
      <span
        style={{
          fontFamily: "'Sora', sans-serif",
          fontWeight: 400,
          fontSize: 22,
          letterSpacing: 3,
          fontStyle: 'italic',
          color: '#111',
        }}
      >
        stay
      </span>
    </Link>
  );
}
