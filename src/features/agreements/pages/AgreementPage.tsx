import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, FileText, Building2, TrendingUp, AlertTriangle, Scale, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAgreement } from '../hooks/useAgreement';
import { buildSamcartPrefillParams } from '@/lib/invest/buildSamcartPrefillParams';
import AgreementNav from '../components/AgreementNav';
import SignaturePad from '../components/SignaturePad';

const SAMCART_URL = 'https://pay.nfstay.com/products/nfstay-jv-partner/';
const SIGNATURE_KEY = 'nfstay_agreement_pending';

export default function AgreementPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { agreement, property, loading, error, submitSignature } = useAgreement(token);

  const [signerName, setSignerName] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user || !agreement) return;
    const pending = sessionStorage.getItem(SIGNATURE_KEY);
    if (!pending) return;
    try {
      const { name, signature, agreementId } = JSON.parse(pending);
      if (agreementId !== agreement.id) return;
      sessionStorage.removeItem(SIGNATURE_KEY);
      (async () => {
        setSubmitting(true);
        try {
          await submitSignature(name, signature, user.id);
          redirectToSamcart(name);
        } catch {
          setSubmitting(false);
        }
      })();
    } catch { /* ignore parse errors */ }
  }, [user, agreement]);

  const redirectToSamcart = (name: string) => {
    if (!agreement || !user) return;
    const [firstName, ...rest] = name.trim().split(' ');
    const lastName = rest.join(' ') || firstName;
    const params = buildSamcartPrefillParams({
      firstName,
      lastName,
      email: user.email ?? '',
      wallet: '',
      propertyId: 1,
      investAmount: agreement.amount,
    });
    const qs = new URLSearchParams(params).toString();
    window.location.href = `${SAMCART_URL}?${qs}`;
  };

  const handleConfirm = async () => {
    if (!signerName.trim() || !signatureData || !agreement) return;

    if (!user) {
      sessionStorage.setItem(SIGNATURE_KEY, JSON.stringify({
        name: signerName.trim(),
        signature: signatureData,
        agreementId: agreement.id,
      }));
      setShowAuth(true);
      return;
    }

    setSubmitting(true);
    try {
      await submitSignature(signerName.trim(), signatureData, user.id);
      redirectToSamcart(signerName.trim());
    } catch {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F3EE] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E9A80]" />
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="min-h-screen bg-[#F3F3EE] flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-[#9CA3AF] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">Agreement Not Found</h1>
          <p className="text-sm text-[#6B7280]">This link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  if (agreement.status === 'signed' || agreement.status === 'paid') {
    return (
      <div className="min-h-screen bg-[#F3F3EE] flex items-center justify-center">
        <div className="text-center max-w-md">
          <CheckCircle2 className="h-16 w-16 text-[#1E9A80] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Agreement Signed</h1>
          <p className="text-sm text-[#6B7280] mb-6">
            {agreement.status === 'paid'
              ? 'This agreement has been signed and payment has been received.'
              : 'This agreement has been signed. Complete your payment to finalise.'}
          </p>
          {agreement.status === 'signed' && user && (
            <button
              onClick={() => redirectToSamcart(agreement.signer_name ?? '')}
              className="bg-[#1E9A80] text-white px-8 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Complete Payment
            </button>
          )}
        </div>
      </div>
    );
  }

  if (showAuth) {
    return <AuthPrompt token={token!} />;
  }

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#F3F3EE]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center justify-center w-7 h-7 border-2 border-[#0A0A0A] rounded-lg text-xs font-bold font-[Sora]">nf</span>
              <span className="text-sm font-normal tracking-[2px] font-[Sora] text-[#0A0A0A]">stay</span>
            </div>
            <span className="text-[#E5E7EB] mx-2">|</span>
            <span className="text-sm font-medium text-[#6B7280]">Agreement</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#1E9A80]">
              {agreement.status === 'opened' ? 'Ready to Sign' : agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-8">
          {/* Left Nav */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24">
              <AgreementNav />
            </div>
          </aside>

          {/* Document */}
          <main className="flex-1 min-w-0 max-w-4xl">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              {/* Document Header */}
              <div className="border-b border-[#E5E7EB] px-8 sm:px-12 py-8">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1 mb-6">
                      <span className="inline-flex items-center justify-center w-8 h-8 border-2 border-[#0A0A0A] rounded-lg text-sm font-bold font-[Sora]">nf</span>
                      <span className="text-base font-normal tracking-[2px] font-[Sora] text-[#0A0A0A]">stay</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-1">{agreement.title}</h1>
                    <p className="text-sm text-[#6B7280]">
                      {property?.title ?? 'Property'} &middot; {agreement.currency} {Number(agreement.amount).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right text-xs text-[#9CA3AF] hidden sm:block">
                    <p>Ref: {agreement.token.toUpperCase()}</p>
                    <p>{today}</p>
                  </div>
                </div>
              </div>

              {/* Document Body */}
              <div className="px-8 sm:px-12 py-10 space-y-12 text-sm leading-relaxed text-[#6B7280]">

                {/* 1. Overview */}
                <section id="overview" className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-[#1E9A80]" />
                    <h2 className="text-lg font-bold text-[#1A1A1A]">1. Overview</h2>
                  </div>
                  <p className="mb-3">
                    This Token Sale Agreement (the "<strong className="text-[#1A1A1A]">Agreement</strong>") is entered into between:
                  </p>
                  <div className="bg-[#F3F3EE] rounded-xl p-5 space-y-3 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Issuer</p>
                      <p className="text-sm font-medium text-[#1A1A1A]">Airbrick Finance Ltd</p>
                      <p className="text-xs text-[#6B7280]">Trading as nfstay &middot; Company No. 13806307</p>
                      <p className="text-xs text-[#6B7280]">Registered in England &amp; Wales</p>
                    </div>
                    <div className="border-t border-[#E5E7EB] pt-3">
                      <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Investor</p>
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        {agreement.recipient_name || 'As identified at signing'}
                      </p>
                    </div>
                  </div>
                  <p>
                    The Issuer offers tokenised fractional ownership of UK property assets. This Agreement
                    sets out the terms under which the Investor acquires tokens representing a fractional
                    interest in the Property described below.
                  </p>
                </section>

                {/* 2. Property Details */}
                {property && (
                  <section id="property" className="scroll-mt-24">
                    <div className="flex items-center gap-2 mb-4">
                      <Building2 className="h-5 w-5 text-[#1E9A80]" />
                      <h2 className="text-lg font-bold text-[#1A1A1A]">2. Property Details</h2>
                    </div>
                    {property.image && (
                      <div className="rounded-xl overflow-hidden mb-5 border border-[#E5E7EB]">
                        <img
                          src={property.image}
                          alt={property.title}
                          className="w-full h-48 sm:h-64 object-cover"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
                      <InfoCard label="Property" value={property.title} />
                      <InfoCard label="Location" value={property.location} />
                      <InfoCard label="Type" value={property.type} />
                      <InfoCard label="Bedrooms" value={String(property.bedrooms)} />
                      <InfoCard label="Property Value" value={`$${property.property_value.toLocaleString()}`} />
                      <InfoCard label="Total Shares" value={property.total_shares.toLocaleString()} />
                    </div>
                    <p>{property.description}</p>
                    {property.highlights?.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {property.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-[#1E9A80] mt-0.5 shrink-0" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}

                {/* 3. Investment Terms */}
                <section id="investment" className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-[#1E9A80]" />
                    <h2 className="text-lg font-bold text-[#1A1A1A]">3. Investment Terms</h2>
                  </div>
                  <div className="bg-[#F3F3EE] rounded-xl p-5 mb-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Investment Amount</p>
                        <p className="text-2xl font-bold text-[#1A1A1A]">{agreement.currency} {Number(agreement.amount).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Price Per Token</p>
                        <p className="text-2xl font-bold text-[#1A1A1A]">${property?.price_per_share ?? 1}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Tokens to Receive</p>
                        <p className="text-2xl font-bold text-[#1E9A80]">{Number(agreement.amount).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Expected Annual Yield</p>
                        <p className="text-2xl font-bold text-[#1E9A80]">{property?.annual_yield ?? 0}%</p>
                      </div>
                    </div>
                  </div>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Each token represents one fractional share of the Property.</li>
                    <li>Tokens are issued on the BNB Smart Chain as ERC-20 compliant assets.</li>
                    <li>The Investor's ownership percentage equals: (Tokens Purchased / Total Shares) x 100.</li>
                    <li>Revenue distributions are calculated pro-rata based on token holdings.</li>
                    <li>The Issuer reserves the right to issue additional tokens for unsold shares at the stated price.</li>
                  </ol>
                </section>

                {/* 4. Financial Projections */}
                {property?.financials && (
                  <section id="financials" className="scroll-mt-24">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-[#1E9A80]" />
                      <h2 className="text-lg font-bold text-[#1A1A1A]">4. Financial Projections</h2>
                    </div>
                    <p className="mb-4 text-xs italic text-[#9CA3AF]">
                      The figures below are projections and do not constitute guaranteed returns.
                    </p>
                    {property.financials.transaction && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Deal Cost Breakdown</h3>
                        <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-[#F3F3EE]">
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#6B7280]">Item</th>
                                <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#6B7280]">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {property.financials.transaction.map((t, i) => (
                                <tr key={i} className="border-t border-[#E5E7EB]">
                                  <td className="px-4 py-2.5">
                                    <p className="font-medium text-[#1A1A1A]">{t.description}</p>
                                    <p className="text-xs text-[#9CA3AF]">{t.calculation_basis}</p>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-medium text-[#1A1A1A] whitespace-nowrap">{t.amount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {property.financials.rental && (
                      <div>
                        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Rental Income Projections</h3>
                        <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-[#F3F3EE]">
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#6B7280]">Metric</th>
                                <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#6B7280]">Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {property.financials.rental.map((r, i) => (
                                <tr key={i} className="border-t border-[#E5E7EB]">
                                  <td className="px-4 py-2.5">
                                    <p className="font-medium text-[#1A1A1A]">{r.description}</p>
                                    <p className="text-xs text-[#9CA3AF]">{r.calculation_basis}</p>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-medium text-[#1E9A80] whitespace-nowrap">{r.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* 5. Risk Factors */}
                <section id="risks" className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-[#1E9A80]" />
                    <h2 className="text-lg font-bold text-[#1A1A1A]">5. Risk Factors</h2>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
                    <p className="text-sm font-medium text-amber-800 mb-2">Important Notice</p>
                    <p className="text-sm text-amber-700">
                      Investing in property tokens involves risk. The value of your investment may go down
                      as well as up. Past performance is not indicative of future results.
                    </p>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Market Risk:</strong> Property values and rental income may fluctuate due to economic conditions, local market dynamics, and regulatory changes.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Liquidity Risk:</strong> Tokens may not be easily convertible to cash. There is no guarantee of a secondary market for token resale.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Occupancy Risk:</strong> Rental income projections assume an occupancy rate that may not be achieved.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Regulatory Risk:</strong> Changes in property, tax, or blockchain regulations may affect token value or income distributions.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Technology Risk:</strong> Smart contract vulnerabilities or blockchain network issues could impact token operations.</span>
                    </li>
                  </ul>
                </section>

                {/* 6. Representations */}
                <section id="representations" className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-[#1E9A80]" />
                    <h2 className="text-lg font-bold text-[#1A1A1A]">6. Representations &amp; Warranties</h2>
                  </div>
                  <p className="mb-3">By signing this Agreement, the Investor represents and warrants that:</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>They are at least 18 years of age and have full legal capacity to enter into this Agreement.</li>
                    <li>They have read and understood the risk factors outlined in Section 5.</li>
                    <li>The funds used for this investment are lawfully obtained and are not derived from criminal activity.</li>
                    <li>They understand that token purchases are non-refundable once confirmed on the blockchain.</li>
                    <li>They acknowledge that projected returns are estimates only and actual returns may vary.</li>
                    <li>They are investing on their own behalf and not as a nominee or agent for any other person.</li>
                    <li>They have obtained independent legal, financial, and tax advice as they deem necessary.</li>
                  </ol>
                </section>

                {/* 7. Governing Law */}
                <section id="governing-law" className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <Scale className="h-5 w-5 text-[#1E9A80]" />
                    <h2 className="text-lg font-bold text-[#1A1A1A]">7. Governing Law</h2>
                  </div>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>This Agreement is governed by the laws of England and Wales.</li>
                    <li>Any disputes arising from this Agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.</li>
                    <li>If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</li>
                    <li>This Agreement constitutes the entire agreement between the parties in relation to its subject matter.</li>
                    <li>No amendment to this Agreement shall be effective unless made in writing and signed by both parties.</li>
                  </ol>
                </section>

                {/* Custom Terms */}
                {agreement.terms_html && (
                  <section className="scroll-mt-24">
                    <div className="border-t border-[#E5E7EB] pt-8">
                      <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Additional Terms</h2>
                      <div
                        className="prose prose-sm text-[#6B7280]"
                        dangerouslySetInnerHTML={{ __html: agreement.terms_html }}
                      />
                    </div>
                  </section>
                )}

                {/* 8. Signature */}
                <section id="signature" className="scroll-mt-24">
                  <div className="border-t-2 border-[#1E9A80] pt-8">
                    <div className="flex items-center gap-2 mb-6">
                      <FileText className="h-5 w-5 text-[#1E9A80]" />
                      <h2 className="text-lg font-bold text-[#1A1A1A]">8. Signature</h2>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-8 mb-8">
                      {/* Issuer (pre-filled) */}
                      <div className="bg-[#F3F3EE] rounded-xl p-5">
                        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Issuer</p>
                        <p className="text-sm font-medium text-[#1A1A1A]">Airbrick Finance Ltd</p>
                        <p className="text-xs text-[#6B7280]">Trading as nfstay</p>
                        <p className="text-xs text-[#6B7280]">Company No. 13806307</p>
                        <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                          <p className="text-xs text-[#9CA3AF] mb-1">Authorised Signatory</p>
                          <p className="text-sm font-medium text-[#1A1A1A] italic font-serif">Hugo De Souza</p>
                          <p className="text-xs text-[#6B7280]">Director</p>
                        </div>
                      </div>

                      {/* Investor */}
                      <div className="bg-white border-2 border-dashed border-[#1E9A80] rounded-xl p-5">
                        <p className="text-xs font-semibold text-[#1E9A80] uppercase tracking-wider mb-3">Investor</p>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-[#525252] mb-1">Full Legal Name</label>
                            <input
                              type="text"
                              value={signerName}
                              onChange={(e) => setSignerName(e.target.value)}
                              placeholder="Enter your full name"
                              className="w-full px-3 py-2.5 border border-[#E5E5E5] rounded-lg text-sm text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#1E9A80] focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#525252] mb-1">Signature</label>
                            <SignaturePad onSignature={setSignatureData} />
                          </div>
                          <p className="text-xs text-[#9CA3AF]">
                            Date: {today}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-center">
                      <button
                        onClick={handleConfirm}
                        disabled={!signerName.trim() || !signatureData || submitting}
                        className="bg-[#1E9A80] text-white px-12 py-4 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(30,154,128,0.35)]"
                      >
                        {submitting ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                          </span>
                        ) : (
                          'Confirm & Proceed to Payment'
                        )}
                      </button>
                      <p className="text-xs text-[#9CA3AF] mt-3">
                        By clicking confirm, you agree to the terms above and will be redirected to complete payment.
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="border-t border-[#E5E7EB] px-8 sm:px-12 py-6 bg-[#F3F3EE]">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#9CA3AF]">
                  <p>Airbrick Finance Ltd &middot; Company No. 13806307 &middot; Trading as nfstay</p>
                  <p>Registered in England &amp; Wales &middot; legal@nfstay.com</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F3F3EE] rounded-lg p-3">
      <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-[#1A1A1A] mt-0.5">{value}</p>
    </div>
  );
}

function AuthPrompt({ token }: { token: string }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#F3F3EE] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm max-w-md w-full p-8 text-center">
        <div className="flex items-center justify-center gap-1 mb-6">
          <span className="inline-flex items-center justify-center w-8 h-8 border-2 border-[#0A0A0A] rounded-lg text-sm font-bold font-[Sora]">nf</span>
          <span className="text-base font-normal tracking-[2px] font-[Sora] text-[#0A0A0A]">stay</span>
        </div>
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Sign in to place your order</h2>
        <p className="text-sm text-[#6B7280] mb-8">
          Your signature has been captured. Sign in or create an account to complete your investment.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate(`/signin?redirect=/agreement/${encodeURIComponent(token)}`)}
            className="w-full bg-[#1E9A80] text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate(`/signup?redirect=/agreement/${encodeURIComponent(token)}`)}
            className="w-full bg-white text-[#1A1A1A] py-3 rounded-xl font-semibold text-sm border border-[#E5E7EB] hover:bg-[#F3F3EE] transition-colors"
          >
            Create Account
          </button>
        </div>
        <p className="text-xs text-[#9CA3AF] mt-6">
          Your agreement will be waiting for you after sign-in.
        </p>
      </div>
    </div>
  );
}
