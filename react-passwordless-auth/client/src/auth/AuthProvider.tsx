import React, { createContext, useContext } from 'react';
import { usePasswordlessAuth } from './usePasswordlessAuth';
const AuthCtx = createContext<ReturnType<typeof usePasswordlessAuth> | null>(null);
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => { const auth = usePasswordlessAuth(); return <AuthCtx.Provider value={auth}>{children}</AuthCtx.Provider>; };
export function useAuth() { const ctx = useContext(AuthCtx); if (!ctx) throw new Error('useAuth must be used inside AuthProvider'); return ctx; }
