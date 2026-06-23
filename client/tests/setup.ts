import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Component tests must not hit the network. Stub fetch to return
// appropriate responses based on the URL being fetched.
vi.stubGlobal(
  'fetch',
  vi.fn((url: string) => {
    if (url === '/api/skills') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ skills: ['TypeScript', 'React', 'Node.js'] }),
      } as Response);
    }
    if (url === '/api/roles') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ roles: ['Engineer', 'Architect', 'Tester'] }),
      } as Response);
    }
    // Default: health check for backward compatibility
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' }),
    } as Response);
  })
);
