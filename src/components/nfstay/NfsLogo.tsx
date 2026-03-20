import { Link } from "react-router-dom";

export function NfsLogo({ className = '' }: { className?: string }) {
  return (
    <Link to="/nfstay" className={`flex items-center gap-0 text-xl font-bold ${className}`}>
      <span className="text-primary">NFS</span>
      <span className="text-foreground">tay</span>
    </Link>
  );
}
