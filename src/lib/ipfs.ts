/**
 * Fix broken IPFS gateway URLs.
 * Replaces `cloudflare-ipfs.com` with `ipfs.io`, with `gateway.pinata.cloud` as fallback pattern.
 */
export function fixIpfsUrl(url: string): string {
  if (!url) return url;
  // Replace cloudflare gateway with ipfs.io
  let fixed = url.replace('cloudflare-ipfs.com', 'ipfs.io');
  // Also handle gateway.pinata.cloud (replace with ipfs.io for consistency)
  fixed = fixed.replace('gateway.pinata.cloud', 'ipfs.io');
  // Handle raw ipfs:// protocol URIs
  if (fixed.startsWith('ipfs://')) {
    fixed = `https://ipfs.io/ipfs/${fixed.replace('ipfs://', '')}`;
  }
  return fixed;
}

export interface IPFSPropertyMetadata {
  name: string;
  description: string;
  category: string;
  image: string;
  images: string[];
  attributes: { trait_type: string; value: string | number }[];
  transaction_breakdown: { description: string; amount: string; calculation_basis: string }[];
  rental_breakdown: { description: string; value: string; calculation_basis: string }[];
}

/**
 * Fetch property metadata from an IPFS URI.
 * Converts ipfs:// URIs to HTTP gateway URLs automatically.
 * Used by admin "Import from IPFS" — Supabase is the source of truth for user-facing pages.
 */
export async function fetchPropertyMetadata(ipfsUri: string): Promise<IPFSPropertyMetadata | null> {
  try {
    const url = ipfsUri.startsWith('ipfs://')
      ? `https://ipfs.io/ipfs/${ipfsUri.replace('ipfs://', '')}`
      : ipfsUri;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
