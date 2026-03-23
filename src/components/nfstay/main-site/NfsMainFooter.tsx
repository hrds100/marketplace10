import { Link } from "react-router-dom";
import { NfsLogo } from "@/components/nfstay/NfsLogo";

export function NfsMainFooter() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <NfsLogo className="mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Book unique vacation rentals directly from verified hosts. No middlemen, no hidden fees.</p>
            <div className="flex gap-3">
              {['Instagram', 'Twitter', 'Facebook', 'TikTok'].map((s) => (
                <a key={s} href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{s}</a>
              ))}
            </div>
          </div>

          {/* For Operators */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">For Operators</h4>
            <ul className="space-y-2">
              <li><Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">List your property</Link></li>
              <li><Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign up</Link></li>
              <li><a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* For Travelers */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">For Travelers</h4>
            <ul className="space-y-2">
              <li><Link to="/search" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Search properties</Link></li>
              <li><a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How to book</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Guest protection</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy policy</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of service</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cookie policy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">&copy; 2026 nfstay. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
