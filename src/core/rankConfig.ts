/* ────────── comments ────────── */
/* Single source of truth for rank targets & rewards. */
/* ────────── comments ────────── */
import { RankKey } from "@/types/rank";

export const RANKS: Readonly<
  {
    key: RankKey;
    directRefTarget: number;
    minInvestTarget: number;
    rewardUsd: number;
  }[]
> = [
  { key: "bronze", directRefTarget: 5, minInvestTarget: 500, rewardUsd: 100 },
  { key: "silver", directRefTarget: 15, minInvestTarget: 1500, rewardUsd: 200 },
  { key: "gold", directRefTarget: 30, minInvestTarget: 2500, rewardUsd: 300 },
  {
    key: "platinum",
    directRefTarget: 90,
    minInvestTarget: 9000,
    rewardUsd: 500,
  },
  {
    key: "diamond",
    directRefTarget: 200,
    minInvestTarget: 50000,
    rewardUsd: 1000,
  },
  {
    key: "emerald",
    directRefTarget: 300,
    minInvestTarget: 50000,
    rewardUsd: 2000,
  },
  {
    key: "master",
    directRefTarget: 1000,
    minInvestTarget: 100000,
    rewardUsd: 10000,
  },
];
