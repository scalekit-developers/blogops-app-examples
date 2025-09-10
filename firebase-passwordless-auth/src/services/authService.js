// Service layer to interact with Scalekit and Firebase
const { getScalekit } = require('../config/scalekit');
const admin = require('../config/firebase');
const { v4: uuid } = require('uuid');
const { AppError } = require('../utils/errors');

// In-memory map of authRequestId -> { email, createdAt }
// For production, use Redis or a database for resilience.
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
    return await finalizeUserSessionAsync(verifyResponse, authRequestId);
  } catch (e) {
    throw wrapSDKError(e, 'Failed to verify code');
  }
}

async function verifyWithLink(linkToken, authRequestId) {
  try {
    const options = { linkToken };
    const verifyResponse = await getScalekit().passwordless.verifyPasswordlessEmail(options, authRequestId);
    return await finalizeUserSessionAsync(verifyResponse, authRequestId);
  } catch (e) {
    throw wrapSDKError(e, 'Failed to verify magic link');
  }
}

// Upsert user profile in Supabase after passwordless verification (Scalekit only)
async function finalizeUserSessionAsync(verifyResponse, authRequestId) {
  const email = verifyResponse.email;
  const db = admin.firestore();
  // Try to get user profile from Firestore
  let userDoc = await db.collection('users').where('email', '==', email).limit(1).get();
  let profile;
  if (userDoc.empty) {
    // Create new profile
    const userId = verifyResponse.user_id || uuid();
    profile = {
      id: userId,
      email
    };
    await db.collection('users').doc(userId).set(profile);
  } else {
    const data = userDoc.docs[0].data();
    profile = { id: data.id, email: data.email };
  }
  // Generate Firebase custom token
  const firebaseToken = await admin.auth().createCustomToken(profile.id);
  if (authRequestId) authRequests.delete(authRequestId);
  return { user: profile, verifyResponse, firebaseToken };
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
