import { render, screen } from '@testing-library/react';
import React from 'react';
import { AuthProvider } from '../auth/AuthProvider';
import { OtpForm } from '../components/OtpForm';

// Minimal mock for context: we will simulate sendResult + verifyCode auto submit
const Wrapper: React.FC<{ onVerify: (code: string)=>void }> = ({ onVerify }) => {
  // monkey patch hook by mocking module? simpler: inline custom provider not required if we mimic structure
  return <AuthProvider><OtpForm /></AuthProvider>;
};

describe('OtpForm basic rendering', () => {
  it('renders nothing without context sendResult (smoke)', () => {
    render(<AuthProvider><OtpForm /></AuthProvider>);
    // Should not find heading since no sendResult
    expect(screen.queryByText(/Enter the Code/i)).toBeNull();
  });
});
