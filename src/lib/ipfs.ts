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
