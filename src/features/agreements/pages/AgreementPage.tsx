import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, FileText, Building2, TrendingUp, AlertTriangle, Scale, Shield, Handshake, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAgreement } from '../hooks/useAgreement';
import { buildSamcartPrefillParams } from '@/lib/invest/buildSamcartPrefillParams';
import AgreementNav from '../components/AgreementNav';
import SignaturePad from '../components/SignaturePad';

const SAMCART_URL = 'https://pay.nfstay.com/products/nfstay-jv-partner/';
const SIGNATURE_KEY = 'nfstay_agreement_pending';
const GBP_RATE = 0.79;

function usdToGbp(usd: number) { return Math.round(usd * GBP_RATE); }
function dualAmount(usd: number) { return `$${usd.toLocaleString()} USD = ~£${usdToGbp(usd).toLocaleString()} GBP`; }

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
  const amountUsd = Number(agreement.amount);

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
            <span className="text-sm font-medium text-[#6B7280]">Partnership Agreement</span>
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
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-1">Property Service Accommodation Partnership Agreement</h1>
                    <p className="text-sm text-[#6B7280]">
                      {property?.title ?? 'Property'} &middot; {dualAmount(amountUsd)}
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

                {/* Preamble */}
                <div className="bg-[#F3F3EE] rounded-xl p-5 text-xs text-[#9CA3AF] leading-relaxed">
                  <p className="uppercase tracking-wide mb-2 font-semibold">Preamble</p>
                  <p>
                    This document is not a solicitation for investment and does not constitute an offer of digital currency, commodity, security, financial instrument, or any other form of investment, securities to the public or a collective investment scheme, nor does it require registration or approval from a regulatory authority in any jurisdiction. This Agreement is part of a reward-based partnership arrangement, and no financial instruments are issued to the Partner.
                  </p>
                </div>

                {/* 1. Overview */}
                <section id="overview" className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-[#1E9A80]" />
                    <h2 className="text-lg font-bold text-[#1A1A1A]">1. Overview</h2>
                  </div>
                  <p className="mb-3">
                    This Property Service Accommodation Partnership Agreement (the "<strong className="text-[#1A1A1A]">Agreement</strong>") is made as of the date of acceptance by the Partner:
                  </p>
                  <div className="bg-[#F3F3EE] rounded-xl p-5 space-y-3 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">The Company</p>
                      <p className="text-sm font-medium text-[#1A1A1A]">Airbrick Finance Ltd</p>
                      <p className="text-xs text-[#6B7280]">Company No. 13806307 &middot; Registered in England &amp; Wales</p>
                      <p className="text-xs text-[#6B7280]">Property management and operations company, trading as nfstay</p>
                      <p className="text-xs text-[#6B7280] mt-2 font-medium text-[#1A1A1A]">Nfstay Holdings FZE LLC</p>
                      <p className="text-xs text-[#6B7280]">Ajman NuVentures Centre Free Zone, UAE</p>
                      <p className="text-xs text-[#6B7280]">Financial administration, partner allocations and treasury management</p>
                    </div>
                    <div className="border-t border-[#E5E7EB] pt-3">
                      <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">The Partner</p>
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        {agreement.recipient_name || 'As identified at signing'}
                      </p>
                      <p className="text-xs text-[#6B7280]">(Hereinafter referred to as the "Partner")</p>
                    </div>
                  </div>
                  <p className="mb-3">
                    Airbrick Finance Ltd is the UK-registered property management company responsible for sourcing deals, managing landlord relationships, and overseeing the day-to-day operations of each serviced accommodation property. Nfstay Holdings FZE LLC, based in the UAE, handles the financial administration of the partnership — including partner allocations, revenue distributions, treasury management, and international payment processing. Together, these two entities operate under the nfstay brand to deliver a fully managed rent-to-rent service accommodation model.
                  </p>
                  <p className="mb-3">
                    This Agreement sets out the terms under which the Partner allocates funds towards a specific property deal, entitling the Partner to a proportional share of net rental income generated during the deal term.
                  </p>
                  <p className="mb-3">
                    By entering into this Agreement, the Partner acknowledges that this is an active partnership. The Partner does not acquire any form of property ownership. The Partner receives a contractual right to a share of net rental income as described herein for the duration of the deal term.
                  </p>
                  <p>
                    The Company retains all intellectual property rights associated with the platform, including trademarks, copyrights, and proprietary technology. No intellectual property rights are transferred to the Partner through this Agreement.
                  </p>
                </section>

                {/* 2. Deal Details */}
                {property && (
                  <section id="property" className="scroll-mt-24">
                    <div className="flex items-center gap-2 mb-4">
                      <Building2 className="h-5 w-5 text-[#1E9A80]" />
                      <h2 className="text-lg font-bold text-[#1A1A1A]">2. Deal Details</h2>
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
                      <InfoCard label="Deal Value" value={`$${property.property_value.toLocaleString()} = ~£${usdToGbp(property.property_value).toLocaleString()}`} />
                      <InfoCard label="Deal Term" value="5 years" />
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

                {/* 3. Allocation Terms */}
                <section id="allocation" className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <Handshake className="h-5 w-5 text-[#1E9A80]" />
                    <h2 className="text-lg font-bold text-[#1A1A1A]">3. Allocation Terms</h2>
                  </div>
                  <div className="bg-[#F3F3EE] rounded-xl p-5 mb-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Allocation Amount</p>
                        <p className="text-2xl font-bold text-[#1A1A1A]">${amountUsd.toLocaleString()}</p>
                        <p className="text-sm text-[#6B7280]">= ~£{usdToGbp(amountUsd).toLocaleString()} GBP</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Deal Term</p>
                        <p className="text-2xl font-bold text-[#1A1A1A]">5 years</p>
                        <p className="text-sm text-[#6B7280]">From date of execution</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Allocation Share</p>
                        <p className="text-2xl font-bold text-[#1E9A80]">{amountUsd.toLocaleString()} units</p>
                        <p className="text-sm text-[#6B7280]">$1 = ~£{GBP_RATE} per unit</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Projected Annual Yield</p>
                        <p className="text-2xl font-bold text-[#1E9A80]">{property?.annual_yield ?? 0}%</p>
                        <p className="text-sm text-[#6B7280]">Not guaranteed</p>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">3.1 Definitions</h3>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Rent-to-Rent Deal:</strong> A property management arrangement where the Company leases a property from a landlord for a fixed term and manages it as serviced accommodation. The Company facilitates the distribution of rental income to Partners through its automated platform.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Allocation:</strong> A contribution of funds by the Partner towards a specific property deal, representing a fractional interest in the net rental income generated during the deal term.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Deal Term:</strong> The fixed period of 5 (five) years from the date of this Agreement, unless the underlying rent-to-rent agreement is terminated earlier by the landlord or extended by mutual consent.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Hard Cap:</strong> The total number of allocation units issued will be determined by the funding required for the deal. The Hard Cap represents the maximum allocations available.</span>
                    </li>
                  </ul>

                  <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">3.2 Terms of Allocation</h3>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Each allocation unit represents a fractional share of the net rental income generated by the property deal.</li>
                    <li>The Partner's income share is calculated as: (Partner's Allocation ÷ Total Allocations) × Net Rental Income.</li>
                    <li>Revenue distributions are paid directly into the Partner's bank account in their local currency, or in USDC (a stable digital currency pegged to the US dollar) at the Partner's election.</li>
                    <li>The Company charges a 10% operational fee from gross revenue before distributions. This fee covers property management, tenant relations, maintenance, and administrative expenses.</li>
                    <li>The minimum contribution is $1,000 USD = ~£{usdToGbp(1000).toLocaleString()} GBP. Contributions below this amount may not be accepted at the Company's sole discretion.</li>
                    <li>The Company may accept contributions in USD, GBP, or EUR. The exchange rate at the time of purchase determines the allocation amount.</li>
                    <li>Allocations are tied to the 5-year deal term. Upon expiry of the deal term, no further rental income distributions will be made unless the underlying agreement is renewed.</li>
                    <li>Allocations are non-transferable. The Partner may not sell, assign, or transfer their allocation to any third party.</li>
                    <li>The Company shall not be obliged to accept contributions from Partners who do not provide the necessary identification documents.</li>
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
                      The figures below are projections based on current market conditions and do not constitute guaranteed returns. Actual results may vary significantly. The Company does not guarantee the performance, appreciation, or returns of any property deal.
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

                {/* 5. Property Management */}
                <section id="management" className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-5 w-5 text-[#1E9A80]" />
                    <h2 className="text-lg font-bold text-[#1A1A1A]">5. Property Management &amp; Governance</h2>
                  </div>

                  <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">5.1 Day-to-Day Management</h3>
                  <p className="mb-3">
                    By default, the Company will handle the day-to-day management of the property, including tenant relations, maintenance, and rental collection. The Company will charge a 10% operational fee from the gross revenue generated by the property.
                  </p>
                  <p className="mb-4">
                    Partners may vote to replace the Company as the property management firm. Any such decision will require a majority vote of the Partners. A separate property management agreement will be drafted to outline the terms of the new management arrangement.
                  </p>

                  <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">5.2 Governance &amp; Voting Rights</h3>
                  <p className="mb-3">
                    Voting is a core obligation of every Partner. Active participation in governance decisions directly affects the performance of the deal and, by extension, the income distributed to all Partners. Partners who do not participate in votes may have their income distributions suspended until they re-engage with the governance process.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 mb-4">
                    <li>Each Partner's voting power is proportional to the number of allocation units held.</li>
                    <li>Regular proposals requiring Partner votes include decisions related to rental pricing strategy, property improvements, maintenance priorities, tenant selection criteria, and operational management changes.</li>
                    <li>Most proposals are decided by a simple majority (50% + 1 vote). Significant decisions — such as changing the property management company — may require a supermajority.</li>
                    <li>Partners may submit proposals related to the management of the property via the platform. The Company reserves the right, at its sole discretion, to accept or reject proposals before they are put to a vote, ensuring only meaningful and relevant proposals are presented.</li>
                    <li>Partners are expressly prohibited from proposing the sale of the property. The property is not owned by the Company or the Partners — only the rental income is shared during the deal term.</li>
                    <li><strong className="text-[#1A1A1A]">Voting is mandatory to receive distributions.</strong> Partners must actively participate in governance votes to be eligible to collect their monthly rental income payments. Partners who do not vote on proposals during a given period will have their income distributions suspended until they re-engage with the governance process. At least one proposal is generated each month for Partners to vote on.</li>
                    <li>The Company will notify Partners of upcoming votes via the platform and email. Partners are expected to cast their votes within the designated voting period. All votes are recorded transparently, and approved decisions are executed promptly.</li>
                  </ol>

                  <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">5.3 Income Distribution</h3>
                  <p className="mb-3">
                    The Company's platform ensures that rental income is collected, rent and associated fees are paid, and the remaining funds are distributed to Partners in a transparent and automated manner. Partners receive their share of rental income directly into their bank account in their local currency, or in USDC at their election.
                  </p>
                  <p>
                    If Partners vote to use a third-party property management company, the Company is not liable if the chosen third party fails to pass funds from bookings or defaults on payments. Partners bear full responsibility for the selection of any third-party management company.
                  </p>
                </section>

                {/* 6. Risk Factors */}
                <section id="risks" className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-[#1E9A80]" />
                    <h2 className="text-lg font-bold text-[#1A1A1A]">6. Risk Factors</h2>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
                    <p className="text-sm font-medium text-amber-800 mb-2">Important Notice</p>
                    <p className="text-sm text-amber-700">
                      Past performance is not indicative of future results. You are at risk of earning less returns than predicted, or significantly more. You should only allocate funds you can afford to hold for the full 5-year deal term.
                    </p>
                  </div>
                  <p className="mb-3">The Partner acknowledges and accepts that participating in this arrangement involves substantial risks, including but not limited to:</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Market Risk:</strong> Rental income may fluctuate due to economic conditions, local market dynamics, occupancy rates, seasonal demand, and regulatory changes that affect the short-term rental market.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Liquidity Risk:</strong> Allocations are non-transferable and locked for the 5-year deal term. There is no secondary market for resale. The Partner must be able to sustain holding allocations for the full term and bear the risk of a total loss of their contribution.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Occupancy Risk:</strong> Rental income projections assume an occupancy rate that may not be achieved in practice. Seasonal and economic variations may significantly impact actual income.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Regulatory Risk:</strong> Changes in property, tax, planning, or service accommodation regulations may affect income distributions or the viability of the arrangement.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Deal Termination Risk:</strong> The deal term is 5 years. If the landlord terminates the underlying rent-to-rent agreement before the end of the term, the deal ends early and no further income is distributed after termination. Upon expiry of the 5-year term, no further income is distributed unless the agreement is renewed.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Third-Party Risk:</strong> If Partners vote to use a third-party property management company, the Company is not liable for defaults, missed payments, or poor performance by that third party.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span><strong className="text-[#1A1A1A]">Operational History Risk:</strong> The Company and its associated entities may have limited operational history. The Partner understands that their participation is in a development-stage arrangement and that there are inherent uncertainties.</span>
                    </li>
                  </ul>
                </section>

                {/* 7. Partner Obligations */}
                <section id="obligations" className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-[#1E9A80]" />
                    <h2 className="text-lg font-bold text-[#1A1A1A]">7. Partner Obligations, Representations &amp; Warranties</h2>
                  </div>
                  <p className="mb-3">By signing this Agreement, the Partner represents and warrants that:</p>
                  <ol className="list-decimal list-inside space-y-2 mb-6">
                    <li>They are at least 18 years of age and have full legal capacity to enter into this Agreement.</li>
                    <li>They have read, understood, and accept all the risk factors outlined in Section 6.</li>
                    <li>The funds used for this allocation are lawfully obtained and are not derived from criminal activity.</li>
                    <li>They understand that allocations are non-refundable once payment is confirmed.</li>
                    <li>They acknowledge that projected returns are estimates only and actual returns may vary significantly, including the possibility of receiving no returns.</li>
                    <li>They are entering this partnership on their own behalf and not as a nominee or agent for any third party, unless explicitly authorised by the Company.</li>
                    <li>They have had the opportunity to obtain independent legal, financial, and tax advice and have done so to the extent they deem necessary.</li>
                    <li>They understand this is an active partnership, not a passive arrangement, and they have a role in key decisions through the platform's voting system.</li>
                    <li>They will actively participate in governance decisions, including votes on property management and operational matters. Failure to participate may result in the forfeiture of certain benefits.</li>
                    <li>They will provide accurate and up-to-date information when requested by the Company, including KYC (Know Your Customer) and AML (Anti-Money Laundering) documentation.</li>
                    <li>They acknowledge that the Company may, at its sole discretion, refuse to accept their contribution or revoke previously issued allocations if the Partner is found to have violated this Agreement or applicable laws.</li>
                    <li>They understand that the deal term is 5 years and that no further income distributions will be made after the expiry or termination of the deal.</li>
                  </ol>

                  <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">7.1 Partner Responsibilities</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span>Ensuring the accuracy of all information provided during the KYC/AML process.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span>Complying with the terms of this Agreement and any applicable laws in their jurisdiction.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span>Maintaining an active role in governance by participating in votes and staying informed of developments via the platform.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span>Notifying the Company promptly of any changes to their personal or banking information.</span>
                    </li>
                  </ul>
                </section>

                {/* 8. Tax Responsibility */}
                <section id="tax" className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-[#1E9A80]" />
                    <h2 className="text-lg font-bold text-[#1A1A1A]">8. Tax Responsibility</h2>
                  </div>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>The Partner is solely responsible for determining, understanding, and fulfilling any and all tax obligations arising from their participation in this Agreement, including but not limited to income tax, capital gains tax, value-added tax (VAT), or any other taxes or duties applicable under the laws of the Partner's jurisdiction.</li>
                    <li>The Company is not responsible for withholding, collecting, reporting, or remitting any taxes on behalf of the Partner. It is the Partner's obligation to report and remit any applicable taxes to the relevant tax authorities.</li>
                    <li>The Partner acknowledges that the tax treatment of allocations and rental income may vary significantly across different jurisdictions. The Company makes no representations or guarantees regarding the applicability of any specific tax regime.</li>
                    <li>The Partner is strongly advised to consult with a qualified accountant or tax professional before entering into this Agreement and on an ongoing basis to understand and manage their tax obligations.</li>
                    <li>The Company does not provide tax, legal, or financial advice of any kind. Nothing in this Agreement or on the platform should be construed as tax advice.</li>
                    <li>The Partner agrees to indemnify and hold harmless the Company from and against any claims, damages, losses, penalties, or fines arising from the Partner's failure to comply with applicable tax laws and regulations.</li>
                    <li>Any penalties, fines, or liabilities imposed by tax authorities due to non-compliance or errors in the Partner's tax filings shall be borne exclusively by the Partner.</li>
                  </ol>
                </section>

                {/* 9. Disclaimer & Limitation of Liability */}
                <section id="disclaimer" className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-[#1E9A80]" />
                    <h2 className="text-lg font-bold text-[#1A1A1A]">9. Disclaimer &amp; Limitation of Liability</h2>
                  </div>

                  <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">9.1 General Disclaimer</h3>
                  <p className="mb-3">
                    nfstay operates as a general partnership. Every Partner has a direct and ongoing role in managing the property through the platform's democratic voting system. This is not a passive arrangement.
                  </p>
                  <p className="mb-3">
                    nfstay is not a registered investment adviser, broker-dealer, or financial planner. The content on this platform should not be interpreted as offers to sell, solicitations to buy, or recommendations regarding any security or financial product. Partners are solely responsible for determining whether an allocation aligns with their financial goals and risk tolerance.
                  </p>
                  <p className="mb-4">
                    nfstay does not guarantee the performance, appreciation, or returns of any property deal. By participating, Partners acknowledge the inherent risks, including fluctuations in rental income, tenant risks, regulatory changes, and broader economic factors.
                  </p>

                  <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">9.2 Limitation of Liability</h3>
                  <p className="mb-3">
                    The platform and all services are provided "as is" and "as available" without warranties of any kind, whether express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
                  </p>
                  <p className="mb-3">
                    To the fullest extent permissible under applicable law, the Company and its directors, officers, employees, agents, and affiliates shall not be held liable for any direct, indirect, incidental, special, punitive, or consequential damages, including loss of business, revenue, profits, or data arising from the use of the platform or participation in this arrangement.
                  </p>
                  <p>
                    The Company shall not be liable for any delay or failure to perform any obligation under this Agreement if such delay or failure results from causes beyond its reasonable control, including but not limited to natural disasters, government actions, acts of war, pandemics, or technical failures (force majeure).
                  </p>
                </section>

                {/* 10. Termination */}
                <section id="termination" className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-[#1E9A80]" />
                    <h2 className="text-lg font-bold text-[#1A1A1A]">10. Termination &amp; Dissolution</h2>
                  </div>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>This Agreement is for a fixed term of 5 (five) years from the date of execution. Upon expiry of the deal term, no further rental income distributions will be made unless the underlying rent-to-rent agreement is renewed by mutual consent.</li>
                    <li>The Company reserves the right to terminate this Agreement if the Partner has failed to comply with any terms or conditions, failed to provide necessary documentation, or engaged in activities that may compromise the integrity of the arrangement or violate applicable laws.</li>
                    <li>In the case of a dissolution event before the end of the deal term, the Company will refund an amount equal to the Partner's contribution, subject to the rights and privileges of creditors under applicable law. If the Company's remaining assets are insufficient to repay all Partners, available assets will be distributed pro-rata among Partners in proportion to their contributions.</li>
                    <li>All provisions of this Agreement that by their nature should survive termination — including disclaimers, limitations of liability, and indemnity provisions — shall survive termination.</li>
                    <li>Upon termination, the Partner agrees to immediately cease any use of the platform in a manner inconsistent with this Agreement.</li>
                  </ol>
                </section>

                {/* 11. Governing Law */}
                <section id="governing-law" className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <Scale className="h-5 w-5 text-[#1E9A80]" />
                    <h2 className="text-lg font-bold text-[#1A1A1A]">11. Governing Law &amp; Dispute Resolution</h2>
                  </div>
                  <p className="mb-3">
                    Airbrick Finance Ltd (UK) manages property operations, while Nfstay Holdings FZE LLC (UAE) administers the financial and contractual aspects of the partnership. As the financial and contractual administration of this Agreement is managed by Nfstay Holdings FZE LLC, this Agreement is governed by the laws of the United Arab Emirates.
                  </p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>This Agreement shall be governed by and construed in accordance with the laws of the United Arab Emirates, as applied in the Emirate of Ajman.</li>
                    <li>In the event of any dispute arising out of or in connection with this Agreement, the parties shall first attempt to resolve the matter amicably through good-faith negotiation within 30 days of written notice.</li>
                    <li>If the dispute is not resolved through negotiation, it shall be referred to and finally resolved by arbitration administered by the International Chamber of Commerce (ICC) under its Rules of Arbitration. The arbitration shall be conducted by a single arbitrator appointed in accordance with those rules.</li>
                    <li>The seat of arbitration shall be the United Arab Emirates. The language of the arbitration shall be English.</li>
                    <li>The arbitrator's award shall be final and binding on both parties and may be enforced in any court of competent jurisdiction.</li>
                    <li>If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</li>
                    <li>This Agreement constitutes the entire agreement between the parties in relation to its subject matter and supersedes all prior agreements, representations, and understandings.</li>
                    <li>No amendment to this Agreement shall be effective unless made in writing and signed by both parties.</li>
                    <li>The Partner may not assign or transfer any rights or obligations under this Agreement without the prior written consent of the Company.</li>
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

                {/* 12. Signature */}
                <section id="signature" className="scroll-mt-24">
                  <div className="border-t-2 border-[#1E9A80] pt-8">
                    <div className="flex items-center gap-2 mb-6">
                      <FileText className="h-5 w-5 text-[#1E9A80]" />
                      <h2 className="text-lg font-bold text-[#1A1A1A]">12. Signature</h2>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-8 mb-8">
                      {/* Company (pre-filled) */}
                      <div className="bg-[#F3F3EE] rounded-xl p-5">
                        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">The Company</p>
                        <p className="text-sm font-medium text-[#1A1A1A]">Airbrick Finance Ltd</p>
                        <p className="text-xs text-[#6B7280]">Company No. 13806307 &middot; Trading as nfstay</p>
                        <p className="text-xs text-[#6B7280]">Nfstay Holdings FZE LLC &middot; Ajman NuVentures Centre Free Zone, UAE</p>
                        <div className="mt-4 pt-4 border-t border-[#E5E7EB] space-y-3">
                          <div>
                            <p className="text-xs text-[#9CA3AF] mb-1">Authorised Signatory</p>
                            <p className="text-sm font-medium text-[#1A1A1A] italic font-serif">Hugo De Souza</p>
                            <p className="text-xs text-[#6B7280]">Director</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#9CA3AF] mb-1">Authorised Signatory</p>
                            <p className="text-sm font-medium text-[#1A1A1A] italic font-serif">Chris Germano</p>
                            <p className="text-xs text-[#6B7280]">Director</p>
                          </div>
                        </div>
                      </div>

                      {/* Partner */}
                      <div className="bg-white border-2 border-dashed border-[#1E9A80] rounded-xl p-5">
                        <p className="text-xs font-semibold text-[#1E9A80] uppercase tracking-wider mb-3">The Partner</p>
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
                  <p>Nfstay Holdings FZE LLC &middot; Ajman NuVentures Centre Free Zone, UAE &middot; legal@nfstay.com</p>
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
    <div className="min-h-screen bg-[#F3F3EE] flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl border border-[#E8E5DF] shadow-sm max-w-4xl w-full overflow-hidden flex flex-col md:flex-row">
        {/* Left — Sign in / Sign up */}
        <div className="flex-1 p-8 sm:p-10">
          <div className="flex items-center gap-1 mb-8">
            <span className="inline-flex items-center justify-center w-8 h-8 border-2 border-[#0A0A0A] rounded-lg text-sm font-bold font-[Sora]">nf</span>
            <span className="text-base font-normal tracking-[2px] font-[Sora] text-[#0A0A0A]">stay</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] text-[#1E9A80] text-xs font-semibold mb-4">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Agreement signed
          </div>

          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">You're almost a partner</h2>
          <p className="text-sm text-[#6B7280] mb-8">
            Your signature has been captured. One last step — sign in or create your account to finalise the agreement and proceed to payment.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate(`/signin?redirect=/agreement/${encodeURIComponent(token)}`)}
              className="w-full bg-[#1E9A80] text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-[0_4px_16px_rgba(30,154,128,0.35)]"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate(`/signup?redirect=/agreement/${encodeURIComponent(token)}`)}
              className="w-full bg-white text-[#1A1A1A] py-3.5 rounded-xl font-semibold text-sm border border-[#E5E7EB] hover:bg-[#F3F3EE] transition-colors"
            >
              Create Account
            </button>
          </div>

          <p className="text-xs text-[#9CA3AF] mt-6 text-center">
            Your signed agreement is saved. After signing in, you'll go straight to payment.
          </p>
        </div>

        {/* Right — Feature panel */}
        <div className="hidden md:flex flex-col justify-center flex-1 bg-gradient-to-br from-[#0f4f42] to-[#1E9A80] p-10 text-white">
          <h3 className="text-xl font-bold mb-6">What happens next</h3>
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-xs font-bold">1</div>
              <div>
                <p className="font-semibold text-sm">Sign in or create account</p>
                <p className="text-xs text-white/70 mt-0.5">Quick and secure — takes 30 seconds</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-xs font-bold">2</div>
              <div>
                <p className="font-semibold text-sm">Complete payment</p>
                <p className="text-xs text-white/70 mt-0.5">Secure checkout to confirm your allocation</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-xs font-bold">3</div>
              <div>
                <p className="font-semibold text-sm">Access your dashboard</p>
                <p className="text-xs text-white/70 mt-0.5">Track your deal, revenue and distributions</p>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-xs text-white/60">Airbrick Finance Ltd &middot; Company No. 13806307</p>
            <p className="text-xs text-white/60">Nfstay Holdings FZE LLC &middot; UAE</p>
          </div>
        </div>
      </div>
    </div>
  );
}
