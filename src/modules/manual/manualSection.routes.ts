import { Router } from "express";
import { getManualSections, addSectionEntry } from "./manualSection.controller";

const router = Router();

/**
 * @route   GET /api/manual-sections
 * @desc    Fetch all sections sorted by code
 */
router.get("/get", getManualSections);

/**
 * @route   POST /api/manual-sections/entry
 * @desc    Adds a comment, amendment, or justification
 * @body    { sectionId, userId, content, type: "comment" | "amendment" | "justification" }
 */
router.post("/entry", addSectionEntry);

export default router;
