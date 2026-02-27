import { Request, Response } from "express";
import ManualSection from "./manualSection.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";

// Get all manual sections
export const getManualSections = asyncHandler(async (_req: Request, res: Response) => {
  const sections = await ManualSection.find().sort({ code: 1 });
  res.status(200).json({ success: true, data: sections });
});

/**
 * Generic helper to add entries to ManualSection arrays
 * Handles: comments, amendments, justifications
 */
export const addSectionEntry = asyncHandler(async (req: Request, res: Response) => {
  const { sectionId, userId, content, type } = req.body;

  // 1. Validate 'type' maps to a valid schema array
  const validTypes: Record<string, string> = {
    comment: "comments",
    amendment: "amendments",
    justification: "justifications",
  };

  const arrayKey = validTypes[type as keyof typeof validTypes];
  if (!arrayKey) throw new ApiError(400, "Invalid entry type");
  if (!content) throw new ApiError(400, `${type} content cannot be empty`);

  // 2. Build the update object dynamically
  // We use [arrayKey] to target the specific array (e.g., 'comments')
  const updatePayload = {
    userId,
    createdAt: new Date(),
    ...(type === "comment" && { comment: content }),
    ...(type === "amendment" && { proposedChange: content }),
    ...(type === "justification" && { justification: content }),
  };

  // 3. Atomic update using $push (More efficient than find + save)
  const section = await ManualSection.findByIdAndUpdate(
    sectionId,
    { $push: { [arrayKey]: updatePayload } },
    { new: true, runValidators: true }
  );

  if (!section) throw new ApiError(404, "Manual section not found");

  res.status(200).json({ success: true, data: section });
});