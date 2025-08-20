import React from 'react';
export const LoadingSpinner: React.FC<{ show: boolean }> = ({ show }) => show ? <div aria-label="loading">Loading...</div> : null;
