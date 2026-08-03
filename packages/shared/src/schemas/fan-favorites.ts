import { z } from "zod";
import { FAN_MERCH_CATEGORY_IDS, FAN_VIDEO_CATEGORY_IDS } from "../fan-content-ids";

const videoCategoryIdSchema = z.enum(FAN_VIDEO_CATEGORY_IDS);
const merchCategoryIdSchema = z.enum(FAN_MERCH_CATEGORY_IDS);

export const updateFanFavoritesSchema = z.object({
  favoriteTeamIds: z.array(z.string()).max(20),
  favoriteParticipantIds: z.array(z.string()).max(20),
  favoriteVideoIds: z.array(videoCategoryIdSchema).max(20),
  interestedMerchIds: z.array(merchCategoryIdSchema).max(20),
  purchasedMerchIds: z.array(merchCategoryIdSchema).max(20),
});

export type UpdateFanFavoritesInput = z.infer<typeof updateFanFavoritesSchema>;
