import { AppGraph, Resource, Connection } from '../graph';

// --- Input Schema: ApplicationGraphResponse (from Radius CLI) ---

/**
 * The input format from the Radius CLI (`rad app graph --file --output json`).
 * Users paste or upload this JSON into the dashboard.
 */
export interface ApplicationGraphResponse {
  resources: ApplicationGraphResource[];
}

export interface ApplicationGraphResource {
  id: string;
  type: string;
  name: string;
  provisioningState: string;
  outputResources: ApplicationGraphOutputResource[];
  connections: ApplicationGraphConnection[];
}

export interface ApplicationGraphOutputResource {
  id: string;
  type: string;
  name: string;
}

export interface ApplicationGraphConnection {
  id: string;
  direction: 'Outbound' | 'Inbound';
}

// --- Validation ---

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validates raw parsed JSON against the ApplicationGraphResponse schema.
 * Reports ALL errors, not just the first.
 */
export function validateApplicationGraphResponse(data: unknown): ValidationResult<ApplicationGraphResponse> {
  const errors: string[] = [];

  // V-001: Must be a JSON object
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { success: false, errors: [`Expected a JSON object, got ${data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data}`] };
  }

  const obj = data as Record<string, unknown>;

  // V-002: resources must be an array
  if (!Array.isArray(obj.resources)) {
    return { success: false, errors: ["Missing or invalid 'resources' field: expected an array"] };
  }

  const resources = obj.resources as unknown[];

  for (let i = 0; i < resources.length; i++) {
    const resource = resources[i];
    if (resource === null || typeof resource !== 'object' || Array.isArray(resource)) {
      errors.push(`Resource at index ${i}: expected an object`);
      continue;
    }

    const res = resource as Record<string, unknown>;
    const name = typeof res.name === 'string' && res.name.length > 0 ? res.name : `index ${i}`;

    // V-003: id must be non-empty string
    if (typeof res.id !== 'string' || res.id.length === 0) {
      errors.push(`Resource at index ${i}: 'id' is required and must be a non-empty string`);
    }

    // V-004: type must be non-empty string
    if (typeof res.type !== 'string' || res.type.length === 0) {
      errors.push(`Resource at index ${i}: 'type' is required and must be a non-empty string`);
    }

    // V-005: name must be non-empty string
    if (typeof res.name !== 'string' || res.name.length === 0) {
      errors.push(`Resource at index ${i}: 'name' is required and must be a non-empty string`);
    }

    // V-006: provisioningState must be a string
    if (typeof res.provisioningState !== 'string') {
      errors.push(`Resource at index ${i}: 'provisioningState' must be a string`);
    }

    // V-007: outputResources must be an array
    if (!Array.isArray(res.outputResources)) {
      errors.push(`Resource at index ${i}: 'outputResources' must be an array`);
    }

    // V-008: connections must be an array
    if (!Array.isArray(res.connections)) {
      errors.push(`Resource at index ${i}: 'connections' must be an array`);
    }

    // V-009, V-010: validate connections
    if (Array.isArray(res.connections)) {
      const connections = res.connections as unknown[];
      for (let j = 0; j < connections.length; j++) {
        const conn = connections[j] as Record<string, unknown>;

        // V-009: connection id must be non-empty string
        if (typeof conn.id !== 'string' || conn.id.length === 0) {
          errors.push(`Resource '${name}', connection at index ${j}: 'id' is required`);
        }

        // V-010: direction must be 'Outbound' or 'Inbound'
        if (conn.direction !== 'Outbound' && conn.direction !== 'Inbound') {
          errors.push(`Resource '${name}', connection at index ${j}: 'direction' must be 'Outbound' or 'Inbound'`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: data as ApplicationGraphResponse };
}

// --- Transformation ---

/**
 * Transforms validated ApplicationGraphResponse into the dashboard's AppGraph type.
 *
 * @param response - Validated ApplicationGraphResponse
 * @param name - Optional application name (defaults to "Preview")
 * @returns AppGraph suitable for the <AppGraph> component
 */
export function transformToAppGraph(response: ApplicationGraphResponse, name?: string): AppGraph {
  // Build a lookup map for enriching connections
  const resourceMap = new Map<string, ApplicationGraphResource>();
  for (const resource of response.resources) {
    resourceMap.set(resource.id, resource);
  }

  const resources: Resource[] = response.resources.map((res) => {
    const provider = res.type.split('/')[0];

    // Map output resources to nested Resource[]
    const nestedResources: Resource[] | undefined =
      res.outputResources && res.outputResources.length > 0
        ? res.outputResources.map((out) => ({
            id: out.id,
            name: out.name,
            type: out.type,
            provider: out.type.split('/')[0],
            provisioningState: '',
            resources: [],
            connections: [],
          }))
        : undefined;

    // Enrich connections by looking up target resources
    const connections: Connection[] | undefined =
      res.connections && res.connections.length > 0
        ? res.connections.map((conn) => {
            const target = resourceMap.get(conn.id);
            if (target) {
              return {
                id: conn.id,
                name: target.name,
                type: target.type,
                provider: target.type.split('/')[0],
                direction: conn.direction,
              };
            }
            // Handle missing references gracefully
            const lastSegment = conn.id.split('/').pop() || conn.id;
            return {
              id: conn.id,
              name: lastSegment,
              type: 'Unknown',
              provider: 'Unknown',
              direction: conn.direction,
            };
          })
        : undefined;

    return {
      id: res.id,
      name: res.name,
      type: res.type,
      provider,
      provisioningState: res.provisioningState,
      resources: nestedResources,
      connections,
    };
  });

  return {
    name: name || 'Preview',
    resources,
  };
}

// --- JSON Parse ---

/**
 * Parses raw text as JSON and validates as ApplicationGraphResponse.
 * Combines JSON.parse + validateApplicationGraphResponse.
 */
export function parseGraphJson(text: string): ValidationResult<ApplicationGraphResponse> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { success: false, errors: [`Invalid JSON: ${message}`] };
  }

  return validateApplicationGraphResponse(parsed);
}
