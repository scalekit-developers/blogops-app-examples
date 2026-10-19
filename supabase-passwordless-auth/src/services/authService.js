// Service layer to interact with Scalekit (decouples SDK from routes)
const { getScalekit } = require('../config/scalekit');
const supabase = require('../config/supabase');
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
  // Use Supabase service role key for backend profile upsert
  // You must set SUPABASE_SERVICE_ROLE_KEY in your .env (never expose to client)
  const { createClient } = require('@supabase/supabase-js');
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
    console.error('[Supabase profile select error]', error);
    throw new AppError('Supabase profile lookup failed', 500, error);
  }

  if (!profile) {
    // Create new profile
    const { data: newProfile, error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: verifyResponse.user_id || uuid(),
        email,
        full_name: '',
        avatar_url: '',
      })
      .select()
      .single();
    if (insertError) {
      console.error('[Supabase profile creation error]', insertError);
      throw new AppError('Supabase profile creation failed', 500, insertError);
    }
    profile = newProfile;
  }

  if (authRequestId) authRequests.delete(authRequestId);
  return { user: profile, verifyResponse };
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
