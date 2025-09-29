/* ──────────────────────────────────────────────────────────────────────────
   Crypto Routes
────────────────────────────────────────────────────────────────────────── */
import { getMostCrypto, getUsdts } from "@/controllers/crypto.controller";
import { Router } from "express";

const router = Router();

/**
 * @route GET /crypto/most
 * @desc  Top USDT pairs by 24h quoteVolume (Most Traded)
 */
router.get("/crypto/most", getMostCrypto);

/**
 * @route GET /crypto/symbols
 * @desc  Tradable USDT symbols list
 */
router.get("/crypto/symbols", getUsdts);

export default router;
