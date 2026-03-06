import {
  validateApplicationGraphResponse,
  transformToAppGraph,
  parseGraphJson,
  ApplicationGraphResponse,
} from './graphImport';

// --- Sample Data ---

const validResponse: ApplicationGraphResponse = {
  resources: [
    {
      id: '/planes/radius/local/resourceGroups/test/providers/Applications.Core/containers/webapp',
      type: 'Applications.Core/containers',
      name: 'webapp',
      provisioningState: 'Succeeded',
      outputResources: [
        {
          id: '/planes/kubernetes/local/namespaces/default/providers/apps/Deployment/webapp',
          type: 'apps/Deployment',
          name: 'webapp',
        },
      ],
      connections: [
        {
          id: '/planes/radius/local/resourceGroups/test/providers/Applications.Datastores/redisCaches/db',
          direction: 'Outbound' as const,
        },
      ],
    },
    {
      id: '/planes/radius/local/resourceGroups/test/providers/Applications.Datastores/redisCaches/db',
      type: 'Applications.Datastores/redisCaches',
      name: 'db',
      provisioningState: 'Succeeded',
      outputResources: [],
      connections: [],
    },
  ],
};

// --- validateApplicationGraphResponse ---

describe('validateApplicationGraphResponse', () => {
  it('accepts a valid ApplicationGraphResponse', () => {
    const result = validateApplicationGraphResponse(validResponse);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validResponse);
    expect(result.errors).toBeUndefined();
  });

  it('accepts an empty resources array', () => {
    const result = validateApplicationGraphResponse({ resources: [] });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ resources: [] });
  });

  it('rejects null input (V-001)', () => {
    const result = validateApplicationGraphResponse(null);
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining('null')]);
  });

  it('rejects array input (V-001)', () => {
    const result = validateApplicationGraphResponse([]);
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining('array')]);
  });

  it('rejects string input (V-001)', () => {
    const result = validateApplicationGraphResponse('hello');
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining('string')]);
  });

  it('rejects missing resources field (V-002)', () => {
    const result = validateApplicationGraphResponse({});
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining("'resources'")]);
  });

  it('rejects non-array resources field (V-002)', () => {
    const result = validateApplicationGraphResponse({ resources: 'not-an-array' });
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining("'resources'")]);
  });

  it('rejects resource with missing id (V-003)', () => {
    const result = validateApplicationGraphResponse({
      resources: [
        {
          type: 'Applications.Core/containers',
          name: 'test',
          provisioningState: 'Succeeded',
          outputResources: [],
          connections: [],
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining("'id'"));
  });

  it('rejects resource with empty id (V-003)', () => {
    const result = validateApplicationGraphResponse({
      resources: [
        {
          id: '',
          type: 'Applications.Core/containers',
          name: 'test',
          provisioningState: 'Succeeded',
          outputResources: [],
          connections: [],
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining("'id'"));
  });

  it('rejects resource with missing type (V-004)', () => {
    const result = validateApplicationGraphResponse({
      resources: [
        {
          id: '/test',
          name: 'test',
          provisioningState: 'Succeeded',
          outputResources: [],
          connections: [],
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining("'type'"));
  });

  it('rejects resource with missing name (V-005)', () => {
    const result = validateApplicationGraphResponse({
      resources: [
        {
          id: '/test',
          type: 'Applications.Core/containers',
          provisioningState: 'Succeeded',
          outputResources: [],
          connections: [],
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining("'name'"));
  });

  it('rejects resource with missing provisioningState (V-006)', () => {
    const result = validateApplicationGraphResponse({
      resources: [
        {
          id: '/test',
          type: 'Applications.Core/containers',
          name: 'test',
          outputResources: [],
          connections: [],
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("'provisioningState'"),
    );
  });

  it('rejects resource with missing outputResources (V-007)', () => {
    const result = validateApplicationGraphResponse({
      resources: [
        {
          id: '/test',
          type: 'Applications.Core/containers',
          name: 'test',
          provisioningState: 'Succeeded',
          connections: [],
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("'outputResources'"),
    );
  });

  it('rejects resource with missing connections (V-008)', () => {
    const result = validateApplicationGraphResponse({
      resources: [
        {
          id: '/test',
          type: 'Applications.Core/containers',
          name: 'test',
          provisioningState: 'Succeeded',
          outputResources: [],
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("'connections'"),
    );
  });

  it('rejects connection with missing id (V-009)', () => {
    const result = validateApplicationGraphResponse({
      resources: [
        {
          id: '/test',
          type: 'Applications.Core/containers',
          name: 'test',
          provisioningState: 'Succeeded',
          outputResources: [],
          connections: [{ direction: 'Outbound' }],
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("connection at index 0"),
    );
  });

  it('rejects connection with invalid direction (V-010)', () => {
    const result = validateApplicationGraphResponse({
      resources: [
        {
          id: '/test',
          type: 'Applications.Core/containers',
          name: 'test',
          provisioningState: 'Succeeded',
          outputResources: [],
          connections: [{ id: '/other', direction: 'LeftRight' }],
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("'direction'"),
    );
  });

  it('reports ALL errors, not just the first', () => {
    const result = validateApplicationGraphResponse({
      resources: [
        {
          // Missing id, type, name, provisioningState, outputResources, connections
        },
      ],
    });
    expect(result.success).toBe(false);
    // Should have errors for id, type, name, provisioningState, outputResources, connections
    expect(result.errors!.length).toBeGreaterThanOrEqual(6);
  });

  it('rejects non-object resource entries', () => {
    const result = validateApplicationGraphResponse({
      resources: ['not-an-object'],
    });
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining('expected an object'),
    );
  });
});

// --- transformToAppGraph ---

describe('transformToAppGraph', () => {
  it('transforms a valid response with default name', () => {
    const result = transformToAppGraph(validResponse);
    expect(result.name).toBe('Preview');
    expect(result.resources).toHaveLength(2);
  });

  it('uses provided name parameter', () => {
    const result = transformToAppGraph(validResponse, 'my-app');
    expect(result.name).toBe('my-app');
  });

  it('derives provider from type', () => {
    const result = transformToAppGraph(validResponse);
    expect(result.resources[0].provider).toBe('Applications.Core');
    expect(result.resources[1].provider).toBe('Applications.Datastores');
  });

  it('maps outputResources to nested resources', () => {
    const result = transformToAppGraph(validResponse);
    const webapp = result.resources[0];
    expect(webapp.resources).toBeDefined();
    expect(webapp.resources).toHaveLength(1);
    expect(webapp.resources![0].name).toBe('webapp');
    expect(webapp.resources![0].type).toBe('apps/Deployment');
    expect(webapp.resources![0].provider).toBe('apps');
    expect(webapp.resources![0].provisioningState).toBe('');
  });

  it('enriches connections by looking up target resources', () => {
    const result = transformToAppGraph(validResponse);
    const webapp = result.resources[0];
    expect(webapp.connections).toBeDefined();
    expect(webapp.connections).toHaveLength(1);
    expect(webapp.connections![0].name).toBe('db');
    expect(webapp.connections![0].type).toBe(
      'Applications.Datastores/redisCaches',
    );
    expect(webapp.connections![0].provider).toBe('Applications.Datastores');
    expect(webapp.connections![0].direction).toBe('Outbound');
  });

  it('handles unknown connection targets gracefully', () => {
    const response: ApplicationGraphResponse = {
      resources: [
        {
          id: '/test/containers/webapp',
          type: 'Applications.Core/containers',
          name: 'webapp',
          provisioningState: 'Succeeded',
          outputResources: [],
          connections: [
            { id: '/nonexistent/resource/myresource', direction: 'Outbound' },
          ],
        },
      ],
    };

    const result = transformToAppGraph(response);
    const conn = result.resources[0].connections![0];
    expect(conn.name).toBe('myresource');
    expect(conn.type).toBe('Unknown');
    expect(conn.provider).toBe('Unknown');
  });

  it('transforms empty resources array', () => {
    const result = transformToAppGraph({ resources: [] });
    expect(result.name).toBe('Preview');
    expect(result.resources).toHaveLength(0);
  });

  it('handles resources with no outputResources', () => {
    const response: ApplicationGraphResponse = {
      resources: [
        {
          id: '/test/db',
          type: 'Applications.Datastores/redisCaches',
          name: 'db',
          provisioningState: 'Succeeded',
          outputResources: [],
          connections: [],
        },
      ],
    };

    const result = transformToAppGraph(response);
    expect(result.resources[0].resources).toBeUndefined();
  });

  it('handles resources with no connections', () => {
    const response: ApplicationGraphResponse = {
      resources: [
        {
          id: '/test/db',
          type: 'Applications.Datastores/redisCaches',
          name: 'db',
          provisioningState: 'Succeeded',
          outputResources: [],
          connections: [],
        },
      ],
    };

    const result = transformToAppGraph(response);
    expect(result.resources[0].connections).toBeUndefined();
  });
});

// --- parseGraphJson ---

describe('parseGraphJson', () => {
  it('parses and validates valid JSON', () => {
    const json = JSON.stringify(validResponse);
    const result = parseGraphJson(json);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validResponse);
  });

  it('returns error for malformed JSON', () => {
    const result = parseGraphJson('{invalid json');
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0]).toMatch(/^Invalid JSON:/);
  });

  it('returns error for empty string', () => {
    const result = parseGraphJson('');
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0]).toMatch(/^Invalid JSON:/);
  });

  it('returns validation errors for valid JSON but invalid schema', () => {
    const result = parseGraphJson('{"resources": "not-array"}');
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("'resources'"),
    );
  });

  it('returns validation errors for JSON array', () => {
    const result = parseGraphJson('[]');
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('array'));
  });
});
