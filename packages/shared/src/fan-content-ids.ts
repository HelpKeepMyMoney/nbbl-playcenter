export const FAN_VIDEO_CATEGORY_IDS = [
  "highlights",
  "full-games",
  "full-tournaments",
  "full-season",
  "interviews",
] as const;

export const FAN_MERCH_CATEGORY_IDS = [
  "jerseys",
  "apparel",
  "headwear",
  "accessories",
  "youth",
  "collectibles",
] as const;

export type FanVideoCategoryId = (typeof FAN_VIDEO_CATEGORY_IDS)[number];
export type FanMerchCategoryId = (typeof FAN_MERCH_CATEGORY_IDS)[number];
