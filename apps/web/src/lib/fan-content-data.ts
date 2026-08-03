import type { LucideIcon } from "lucide-react";
import {
  Baby,
  CalendarRange,
  Gift,
  HardHat,
  Mic,
  Shirt,
  ShoppingBag,
  Star,
  Trophy,
  Video,
  Zap,
} from "lucide-react";

export type ContentCategory = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  count?: number;
};

export const VIDEO_CATEGORIES: readonly ContentCategory[] = [
  {
    id: "highlights",
    title: "Highlights",
    description: "Top plays, buzzer beaters, and weekly reels",
    icon: Zap,
    count: 48,
  },
  {
    id: "full-games",
    title: "Full Games",
    description: "Complete game broadcasts and replays",
    icon: Video,
    count: 124,
  },
  {
    id: "full-tournaments",
    title: "Full Tournaments",
    description: "Tournament archives and bracket runs",
    icon: Trophy,
    count: 12,
  },
  {
    id: "full-season",
    title: "Full Season",
    description: "Season-long recaps and documentary series",
    icon: CalendarRange,
    count: 8,
  },
  {
    id: "interviews",
    title: "Interviews",
    description: "Player, coach, and league interviews",
    icon: Mic,
    count: 36,
  },
];

export const MERCH_CATEGORIES: readonly ContentCategory[] = [
  {
    id: "jerseys",
    title: "Jerseys",
    description: "Official NBBL team and league jerseys",
    icon: Shirt,
    count: 24,
  },
  {
    id: "apparel",
    title: "Apparel",
    description: "Tees, hoodies, and warm-up gear",
    icon: ShoppingBag,
    count: 42,
  },
  {
    id: "headwear",
    title: "Headwear",
    description: "Hats, beanies, and snapbacks",
    icon: HardHat,
    count: 18,
  },
  {
    id: "accessories",
    title: "Accessories",
    description: "Bags, water bottles, and fan gear",
    icon: Gift,
    count: 31,
  },
  {
    id: "youth",
    title: "Youth",
    description: "Sizes and styles for young fans",
    icon: Baby,
    count: 22,
  },
  {
    id: "collectibles",
    title: "Collectibles",
    description: "Signed items, posters, and memorabilia",
    icon: Star,
    count: 15,
  },
];

export function getVideoCategory(id: string) {
  return VIDEO_CATEGORIES.find((category) => category.id === id);
}

export function getMerchCategory(id: string) {
  return MERCH_CATEGORIES.find((category) => category.id === id);
}
