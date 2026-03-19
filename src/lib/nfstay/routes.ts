// NFStay — context-aware route paths for traveler pages
// On nfstay.app (main site): /search, /property/:id
// On hub.nfstay.com: /nfstay/search, /nfstay/property/:id
// On white-label: /search, /property/:id

import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';

export function useNfsTravelerPath() {
  const { isMainSite, isWhiteLabel } = useNfsWhiteLabel();
  const prefix = (isMainSite || isWhiteLabel) ? '' : '/nfstay';

  return {
    search: `${prefix}/search`,
    property: (id: string) => `${prefix}/property/${id}`,
    paymentSuccess: `${prefix}/payment/success`,
    paymentCancel: `${prefix}/payment/cancel`,
    reservations: `${prefix}/reservations`,
  };
}
