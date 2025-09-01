const { Scalekit } = require('@scalekit-sdk/node');
const env = require('./env');

// Lazy SDK initialization so server can boot with placeholder env vars without immediate network call
let scalekitInstance;
function getScalekit() {
  if (!scalekitInstance) {
    scalekitInstance = new Scalekit(
      env.SCALEKIT_ENVIRONMENT_URL,
      env.SCALEKIT_CLIENT_ID,
      env.SCALEKIT_CLIENT_SECRET
    );
  }
  return scalekitInstance;
}

module.exports = { getScalekit };
