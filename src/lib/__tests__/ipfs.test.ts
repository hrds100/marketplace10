import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPropertyMetadata } from '@/lib/ipfs';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('fetchPropertyMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converts ipfs:// URI to https://ipfs.io/ipfs/ gateway URL', async () => {
    const mockMetadata = {
      name: 'Pembroke Place',
      description: 'A property in Liverpool',
      category: 'Apartment',
      image: 'ipfs://QmImage123',
      images: [],
      attributes: [],
      transaction_breakdown: [],
      rental_breakdown: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockMetadata),
    });

    const result = await fetchPropertyMetadata('ipfs://QmABCDEF123456789');

    expect(mockFetch).toHaveBeenCalledWith('https://ipfs.io/ipfs/QmABCDEF123456789');
    expect(result).toEqual(mockMetadata);
  });

  it('passes through HTTP URLs unchanged', async () => {
    const mockMetadata = {
      name: 'Test Property',
      description: '',
      category: '',
      image: '',
      images: [],
      attributes: [],
      transaction_breakdown: [],
      rental_breakdown: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockMetadata),
    });

    const httpUrl = 'https://example.com/metadata.json';
    await fetchPropertyMetadata(httpUrl);

    expect(mockFetch).toHaveBeenCalledWith(httpUrl);
  });

  it('returns null when fetch fails (non-ok response)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await fetchPropertyMetadata('ipfs://QmNotFound');
    expect(result).toBeNull();
  });

  it('returns null when fetch throws a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchPropertyMetadata('ipfs://QmNetworkFail');
    expect(result).toBeNull();
  });

  it('correctly strips ipfs:// prefix for gateway URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ name: 'test' }),
    });

    await fetchPropertyMetadata('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
    );
  });
});
