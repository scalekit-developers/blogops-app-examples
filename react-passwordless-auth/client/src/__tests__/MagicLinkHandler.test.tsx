import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '../auth/AuthProvider';
import { MagicLinkHandler } from '../components/MagicLinkHandler';

describe('MagicLinkHandler', () => {
  beforeEach(()=>{
    // @ts-ignore
    global.fetch = vi.fn(async (url: string) => {
      if (url.includes('/verify-link')) return { ok: true, json: async () => ({ email:'test@example.com' }) };
      if (url.includes('/session')) return { ok: true, json: async () => ({ authenticated:false }) };
      return { ok:false, json: async () => ({ error:'X' }) };
    });
    const newUrl = window.location.protocol + '//' + window.location.host + '/?link_token=abc&auth_request_id=1';
    window.history.pushState({}, '', newUrl);
  });
  it('auto verifies when link_token present', async () => {
    render(<AuthProvider><MagicLinkHandler /></AuthProvider>);
    await waitFor(()=> expect(screen.getByText(/Signed in via magic link/i)).toBeInTheDocument());
  });
});
