import React from 'react';
export const ErrorMessage: React.FC<{ message?: string|null }> = ({ message }) => message ? <div style={{color:'red'}}>{message}</div> : null;
