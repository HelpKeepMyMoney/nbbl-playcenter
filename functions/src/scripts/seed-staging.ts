process.env.SEED_TARGET = "remote";
process.env.GCLOUD_PROJECT =
  process.env.GCLOUD_PROJECT ?? "nbbl-playcenter-dev";

import "./seed-emulator";
