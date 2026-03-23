import { Link } from "react-router-dom";

interface NfsLogoProps {
  className?: string;
  size?: 'default' | 'sm';
}

export function NfsLogo({ className = '', size = 'default' }: NfsLogoProps) {
  const isSmall = size === 'sm';

  return (
    <Link
      to="/"
      className={`font-bold tracking-tight ${isSmall ? 'text-sm' : 'text-xl'} ${className}`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      nfstay
    </Link>
  );
}
