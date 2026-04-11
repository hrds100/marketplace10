import { useEffect } from 'react';

export default function TermsPage() {
  useEffect(() => { document.title = 'nfstay - Terms of Service'; }, []);

  return (
    <div data-feature="SHARED" className="min-h-screen bg-background">
      <div className="max-w-[720px] mx-auto px-6 py-16">
        <a href="https://nfstay.com" className="text-lg font-extrabold text-foreground tracking-tight">nfstay</a>
        <h1 className="text-[32px] font-bold text-foreground mt-8 mb-6">Terms of Service</h1>
        <div data-feature="SHARED__TERMS_CONTENT" className="prose prose-sm text-muted-foreground space-y-4">
          <p className="text-sm leading-relaxed"><strong className="text-foreground">Last updated:</strong> 13 March 2026</p>
          <h2 className="text-lg font-bold text-foreground mt-6">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed">By accessing nfstay, you agree to these Terms of Service. If you do not agree, do not use the platform.</p>
          <h2 className="text-lg font-bold text-foreground mt-6">2. Service Description</h2>
          <p className="text-sm leading-relaxed">nfstay is a marketplace connecting short-term rental operators with landlord-approved rent-to-rent opportunities in the UK. We provide deal listings, a CRM pipeline, educational content, and communication tools.</p>
          <h2 className="text-lg font-bold text-foreground mt-6">3. Agent Referral Fee</h2>
          <p className="text-sm leading-relaxed">By contacting a landlord through nfstay, you agree to pay a £250 referral fee if the deal closes within 12 months of the introduction. This fee is payable within 14 days of deal completion.</p>
          <h2 className="text-lg font-bold text-foreground mt-6">4. Subscriptions & Payments</h2>
          <p className="text-sm leading-relaxed">Subscriptions are processed via GoHighLevel. Plans include Monthly (£67/mo), Annual (£397/yr), and Lifetime (£997 one-time). Cancellations take effect at the end of the billing period. No refunds for partial periods.</p>
          <h2 className="text-lg font-bold text-foreground mt-6">5. User Conduct</h2>
          <p className="text-sm leading-relaxed">You agree not to misuse the platform, submit false deal information, harass landlords, or circumvent the referral fee system.</p>
          <h2 className="text-lg font-bold text-foreground mt-6">6. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed">nfstay provides information and tools but does not guarantee deal outcomes. We are not liable for losses arising from deals, landlord disputes, or property issues.</p>
          <h2 className="text-lg font-bold text-foreground mt-6">7. Governing Law</h2>
          <p className="text-sm leading-relaxed">These terms are governed by the laws of England and Wales.</p>
          <h2 className="text-lg font-bold text-foreground mt-6">8. Contact</h2>
          <p className="text-sm leading-relaxed">For questions: <a href="mailto:legal@nfstay.com" className="text-primary font-semibold">legal@nfstay.com</a></p>
        </div>
        <div className="mt-12 pt-6 border-t border-border">
        </div>
      </div>
    </div>
  );
}
