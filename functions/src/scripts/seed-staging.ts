process.env.SEED_TARGET = "remote";
process.env.GCLOUD_PROJECT =
  process.env.GCLOUD_PROJECT ?? "nbbl-playcenter";

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "";
}

import "./seed-emulator";
