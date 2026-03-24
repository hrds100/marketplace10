import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <div data-feature="NICKEL" className="w-full px-6 lg:px-8 pt-4">
      <nav className="max-w-7xl mx-auto bg-nav rounded-xl shadow-sm px-8 py-5 flex items-center justify-between">
        {/* Logo */}
        <Link data-feature="NICKEL__NAV_LOGO" to="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <span className="w-7 h-7 bg-foreground rounded-full flex items-center justify-center">
            <span className="w-3 h-3 bg-white rounded-sm block" />
          </span>
          nickel
        </Link>

        {/* Center links */}
        <div data-feature="NICKEL__NAV_LINK" className="hidden md:flex items-center gap-6">
          <button className="flex items-center gap-1 text-base font-medium text-foreground/80 hover:text-foreground transition-colors">
            Products
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button className="flex items-center gap-1 text-base font-medium text-foreground/80 hover:text-foreground transition-colors">
            Company
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <Link to="#" className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link to="#" className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors">
            For Accountants
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <Link
            to="#"
            className="hidden sm:inline-flex text-base font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            Log in
          </Link>
          <Button data-feature="NICKEL__NAV_CTA" variant="hero" size="default">
            Get started
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
