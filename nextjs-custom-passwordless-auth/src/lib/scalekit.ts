import Scalekit from "@scalekit-sdk/node";

const SCALEKIT_ENVIRONMENT_URL = process.env.SCALEKIT_ENVIRONMENT_URL;
const SCALEKIT_CLIENT_ID = process.env.SCALEKIT_CLIENT_ID;
const SCALEKIT_CLIENT_SECRET = process.env.SCALEKIT_CLIENT_SECRET;

if (!SCALEKIT_ENVIRONMENT_URL || !SCALEKIT_CLIENT_ID || !SCALEKIT_CLIENT_SECRET) {
  throw new Error(
    "Missing Scalekit environment variables. Please set SCALEKIT_ENVIRONMENT_URL, SCALEKIT_CLIENT_ID, SCALEKIT_CLIENT_SECRET"
  );
}

export const scalekit = new Scalekit(
  SCALEKIT_ENVIRONMENT_URL,
  SCALEKIT_CLIENT_ID,
  SCALEKIT_CLIENT_SECRET
);
