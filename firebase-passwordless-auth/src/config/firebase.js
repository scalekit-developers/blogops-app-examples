const admin = require('firebase-admin');
const env = require('./env');

const serviceAccount = {
  type: 'service_account',
  project_id: env.FIREBASE_PROJECT_ID,
  private_key_id: env.FIREBASE_PRIVATE_KEY_ID,
  private_key: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: env.FIREBASE_CLIENT_EMAIL,
  client_id: env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: 'googleapis.com'
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: env.FIREBASE_DATABASE_URL
});

module.exports = admin;
