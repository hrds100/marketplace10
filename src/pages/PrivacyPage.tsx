import { useEffect } from 'react';

export default function PrivacyPage() {
  useEffect(() => { document.title = 'nfstay - Privacy Policy'; }, []);

  return (
    <div data-feature="SHARED" className="min-h-screen bg-background">
      <div className="max-w-[720px] mx-auto px-6 py-16">
        <a href="/" className="text-lg font-extrabold text-foreground tracking-tight">nfstay</a>
        <h1 className="text-[32px] font-bold text-foreground mt-8 mb-6">Privacy Policy</h1>
        <div data-feature="SHARED__PRIVACY_CONTENT" className="prose prose-sm text-muted-foreground space-y-4">
          <p className="text-sm leading-relaxed"><strong className="text-foreground">Last updated:</strong> 13 March 2026</p>
          <h2 className="text-lg font-bold text-foreground mt-6">1. Information We Collect</h2>
          <p className="text-sm leading-relaxed">We collect information you provide directly: name, email address, WhatsApp number, and payment details processed via GoHighLevel. We also collect usage data including pages viewed, features used, and device information.</p>
          <h2 className="text-lg font-bold text-foreground mt-6">2. How We Use Your Information</h2>
          <p className="text-sm leading-relaxed">Your information is used to provide and improve our services, process transactions, send deal alerts and service updates, and facilitate communication between operators and landlords.</p>
          <h2 className="text-lg font-bold text-foreground mt-6">3. Data Sharing</h2>
          <p className="text-sm leading-relaxed">We do not sell your personal data. We share information only with: payment processors (GoHighLevel), landlords when you initiate contact, and service providers who assist our operations.</p>
          <h2 className="text-lg font-bold text-foreground mt-6">4. Data Security</h2>
          <p className="text-sm leading-relaxed">We implement industry-standard security measures including encryption, secure authentication, and regular security audits to protect your data.</p>
          <h2 className="text-lg font-bold text-foreground mt-6">5. Your Rights</h2>
          <p className="text-sm leading-relaxed">Under GDPR, you have the right to access, rectify, erase, and port your data. Contact us at privacy@nfstay.com to exercise these rights.</p>
          <h2 className="text-lg font-bold text-foreground mt-6">6. Contact</h2>
          <p className="text-sm leading-relaxed">For privacy inquiries, contact: <a href="mailto:privacy@nfstay.com" className="text-primary font-semibold">privacy@nfstay.com</a></p>
        </div>
        <div className="mt-12 pt-6 border-t border-border">
        </div>
      </div>
    </div>
  );
}
