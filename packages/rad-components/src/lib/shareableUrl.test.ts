import pako from 'pako';
import { encodeGraphUrl, decodeGraphUrl, copyShareUrl } from './shareableUrl';
import type { ApplicationGraphResponse } from './graphImport';

// --- Test Data ---

const validResponse: ApplicationGraphResponse = {
  resources: [
    {
      id: '/planes/radius/local/resourceGroups/test/providers/Applications.Core/containers/webapp',
      type: 'Applications.Core/containers',
      name: 'webapp',
      provisioningState: 'Succeeded',
      outputResources: [],
      connections: [
        {
          id: '/planes/radius/local/resourceGroups/test/providers/Applications.Datastores/redisCaches/cache',
          direction: 'Outbound',
        },
      ],
    },
    {
      id: '/planes/radius/local/resourceGroups/test/providers/Applications.Datastores/redisCaches/cache',
      type: 'Applications.Datastores/redisCaches',
      name: 'cache',
      provisioningState: 'Succeeded',
      outputResources: [],
      connections: [],
    },
  ],
};

// --- encodeGraphUrl ---

describe('encodeGraphUrl', () => {
  it('encodes a valid response into a URL with #graph= prefix', () => {
    const result = encodeGraphUrl(validResponse, 'http://localhost:3000/preview');

    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();
    expect(result.url).toContain('http://localhost:3000/preview#graph=');
    expect(result.error).toBeUndefined();
  });

  it('returns error when URL exceeds 64,000 characters', () => {
    // Create a response with enough unique data to exceed the 64KB limit
    // even after compression. Use pseudo-random IDs to defeat compression.
    const makeUniqueId = (i: number) => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let id = '';
      let n = i * 17 + 31; // simple pseudo-random seed
      for (let j = 0; j < 120; j++) {
        id += chars[n % chars.length];
        n = (n * 37 + 11) % 1000003;
      }
      return id;
    };
    const hugeResponse: ApplicationGraphResponse = {
      resources: Array.from({ length: 3000 }, (_, i) => ({
        id: `/planes/radius/local/resourceGroups/test/providers/Applications.Core/containers/${makeUniqueId(i)}`,
        type: `Applications.${makeUniqueId(i + 10000).slice(0, 30)}/type${i}`,
        name: `resource-${makeUniqueId(i + 20000)}`,
        provisioningState: 'Succeeded',
        outputResources: [],
        connections: [],
      })),
    };

    const result = encodeGraphUrl(hugeResponse, 'http://localhost:3000/preview');

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      'Graph data is too large to share via URL. Export the JSON file instead.',
    );
    expect(result.url).toBeUndefined();
  });

  it('produces Base64 URL-safe encoding (no +, /, or = padding)', () => {
    const result = encodeGraphUrl(validResponse, 'http://localhost:3000/preview');

    expect(result.success).toBe(true);
    const hash = result.url!.split('#graph=')[1];
    expect(hash).not.toMatch(/[+/=]/);
  });
});

// --- decodeGraphUrl ---

describe('decodeGraphUrl', () => {
  it('decodes a valid encoded URL hash and returns validated data', () => {
    const encodeResult = encodeGraphUrl(
      validResponse,
      'http://localhost:3000/preview',
    );
    expect(encodeResult.success).toBe(true);

    const hash = encodeResult.url!.split('#')[1];
    const decodeResult = decodeGraphUrl(`#${hash}`);

    expect(decodeResult.success).toBe(true);
    expect(decodeResult.data).toEqual(validResponse);
    expect(decodeResult.errors).toBeUndefined();
  });

  it('handles hash without leading #', () => {
    const encodeResult = encodeGraphUrl(
      validResponse,
      'http://localhost:3000/preview',
    );
    const hash = encodeResult.url!.split('#')[1];
    const decodeResult = decodeGraphUrl(hash);

    expect(decodeResult.success).toBe(true);
    expect(decodeResult.data).toEqual(validResponse);
  });

  it('returns error when no graph= parameter is present', () => {
    const result = decodeGraphUrl('#other=something');

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['No graph data found in URL']);
  });

  it('returns error for empty hash', () => {
    const result = decodeGraphUrl('');

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['No graph data found in URL']);
  });

  it('returns error for just #', () => {
    const result = decodeGraphUrl('#');

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['No graph data found in URL']);
  });

  it('returns invalid encoding error for bad Base64', () => {
    const result = decodeGraphUrl('#graph=!!!not-valid-base64!!!');

    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      'Unable to decode shared link: invalid encoding',
    ]);
  });

  it('returns corrupted data error for valid Base64 but invalid compressed data', () => {
    // Encode random non-compressed bytes as Base64 URL-safe
    const randomBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    let binary = '';
    for (let i = 0; i < randomBytes.length; i++) {
      binary += String.fromCharCode(randomBytes[i]);
    }
    const encoded = btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = decodeGraphUrl(`#graph=${encoded}`);

    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      'Unable to decode shared link: data appears corrupted',
    ]);
  });

  it('returns invalid data format error for valid compressed non-JSON data', () => {
    // Compress non-JSON text
    const compressed = pako.deflate('not a json object');
    let binary = '';
    for (let i = 0; i < compressed.length; i++) {
      binary += String.fromCharCode(compressed[i]);
    }
    const encoded = btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = decodeGraphUrl(`#graph=${encoded}`);

    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      'Unable to decode shared link: invalid data format',
    ]);
  });

  it('delegates to validateApplicationGraphResponse for schema errors', () => {
    // Compress valid JSON that fails schema validation (missing resources array)
    const badData = JSON.stringify({ notResources: [] });
    const compressed = pako.deflate(badData);
    let binary = '';
    for (let i = 0; i < compressed.length; i++) {
      binary += String.fromCharCode(compressed[i]);
    }
    const encoded = btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = decodeGraphUrl(`#graph=${encoded}`);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.errors![0]).toContain('resources');
  });
});

// --- Encode/Decode roundtrip ---

describe('encode/decode roundtrip', () => {
  it('roundtrips a valid response perfectly', () => {
    const encodeResult = encodeGraphUrl(
      validResponse,
      'http://localhost:3000/preview',
    );
    expect(encodeResult.success).toBe(true);

    const hash = '#' + encodeResult.url!.split('#')[1];
    const decodeResult = decodeGraphUrl(hash);

    expect(decodeResult.success).toBe(true);
    expect(decodeResult.data).toEqual(validResponse);
  });

  it('roundtrips an empty resources array', () => {
    const emptyResponse: ApplicationGraphResponse = { resources: [] };
    const encodeResult = encodeGraphUrl(
      emptyResponse,
      'http://localhost:3000/preview',
    );
    expect(encodeResult.success).toBe(true);

    const hash = '#' + encodeResult.url!.split('#')[1];
    const decodeResult = decodeGraphUrl(hash);

    expect(decodeResult.success).toBe(true);
    expect(decodeResult.data).toEqual(emptyResponse);
  });
});

// --- copyShareUrl ---

describe('copyShareUrl', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...originalLocation,
        origin: 'http://localhost:3000',
        hash: '',
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('copies URL to clipboard and updates hash', async () => {
    const result = await copyShareUrl(validResponse);

    expect(result.success).toBe(true);
    expect(result.url).toContain('http://localhost:3000/preview#graph=');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(result.url);
    expect(window.location.hash).toContain('graph=');
  });

  it('returns error without copying when graph is too large', async () => {
    const makeUniqueId = (i: number) => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let id = '';
      let n = i * 17 + 31;
      for (let j = 0; j < 120; j++) {
        id += chars[n % chars.length];
        n = (n * 37 + 11) % 1000003;
      }
      return id;
    };
    const hugeResponse: ApplicationGraphResponse = {
      resources: Array.from({ length: 3000 }, (_, i) => ({
        id: `/planes/radius/local/resourceGroups/test/providers/Applications.Core/containers/${makeUniqueId(i)}`,
        type: `Applications.${makeUniqueId(i + 10000).slice(0, 30)}/type${i}`,
        name: `resource-${makeUniqueId(i + 20000)}`,
        provisioningState: 'Succeeded',
        outputResources: [],
        connections: [],
      })),
    };

    const result = await copyShareUrl(hugeResponse);

    expect(result.success).toBe(false);
    expect(result.error).toContain('too large');
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});
