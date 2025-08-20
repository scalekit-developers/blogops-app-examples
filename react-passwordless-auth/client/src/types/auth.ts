export type PasswordlessPhase = 'idle' | 'sending' | 'codeSent' | 'verifying' | 'authenticated' | 'error';
export interface SendResult { authRequestId: string; expiresAt: number; expiresIn: number; passwordlessType: string; maskedEmail: string; }
