// Service layer to interact with Scalekit (decouples SDK from routes)
const { getScalekit } = require('../config/scalekit');
const { v4: uuid } = require('uuid');
const { AppError } = require('../utils/errors');

// In-memory map of authRequestId -> { email, createdAt }
// In production, persist in a DB or cache (Redis) for resilience.
const authRequests = new Map();

async function sendPasswordlessEmail(email, options = {}) {
  try {
    const sendResponse = await getScalekit().passwordless.sendPasswordlessEmail(email, options);
    authRequests.set(sendResponse.authRequestId, { email, createdAt: Date.now() });
    return sendResponse;
  } catch (e) {
    throw wrapSDKError(e, 'Failed to send passwordless email');
  }
}

async function resendPasswordlessEmail(authRequestId) {
  try {
    const resendResponse = await getScalekit().passwordless.resendPasswordlessEmail(authRequestId);
    return resendResponse;
  } catch (e) {
    throw wrapSDKError(e, 'Failed to resend passwordless email');
  }
}

async function verifyWithCode(code, authRequestId) {
  try {
    const verifyResponse = await getScalekit().passwordless.verifyPasswordlessEmail({ code }, authRequestId);
    return finalizeUserSession(verifyResponse, authRequestId);
  } catch (e) {
    throw wrapSDKError(e, 'Failed to verify code');
  }
}

async function verifyWithLink(linkToken, authRequestId) {
  try {
    const options = { linkToken };
    const verifyResponse = await getScalekit().passwordless.verifyPasswordlessEmail(options, authRequestId);
    return finalizeUserSession(verifyResponse, authRequestId);
  } catch (e) {
    throw wrapSDKError(e, 'Failed to verify magic link');
  }
}

function finalizeUserSession(verifyResponse, authRequestId) {
  // Placeholder user lookup / creation logic (don't actually integrate DB per instructions)
  // Example (commented):
  // let user = await UserModel.findOne({ email: verifyResponse.email });
  // if (!user) user = await UserModel.create({ id: uuid(), email: verifyResponse.email });
  const user = {
    id: uuid(), // ephemeral id for demo
    email: verifyResponse.email,
    createdAt: new Date().toISOString(),
  };
  if (authRequestId) authRequests.delete(authRequestId);
  return { user, verifyResponse };
}

module.exports = {
  sendPasswordlessEmail,
  resendPasswordlessEmail,
  verifyWithCode,
  verifyWithLink,
  authRequests,
};

function wrapSDKError(err, message) {
  const status = (err && err.response && err.response.status) || 502;
  return new AppError(message, status, { sdkError: err.message });
}
