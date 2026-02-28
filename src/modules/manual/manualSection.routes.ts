import { Router } from "express";
import { 
  getManualSections,
  getAdminQuestionnaireView,
  downloadAdminReport,
  addSectionEntry
} from "./manualSection.controller";
import { authorize, protect } from "../../middlewares/authMiddleware";

const router = Router();

/**
 * ==================================================
 * USER ROUTES
 * ==================================================
 */

/**
 * @route   GET /api/manual-sections
 * @desc    Fetch all manual sections (Questions only)
 * @access  Private (User/Admin)
 */
router.get(
  "/get",
  protect,
  getManualSections
);

/**
 * @route   POST /api/manual-sections/entry
 * @desc    Submit an answer (comment, amendment, etc.)
 * @access  Private (User/Admin)
 * @body    { sectionId, userId, content, type }
 */
router.post(
  "/entry",
  protect,
  addSectionEntry
);



/**
 * ==================================================
 * ADMIN ROUTES
 * ==================================================
 */

/**
 * @route   GET /api/manual-sections/admin
 * @desc    Fetch structured questionnaire (Questions + Answers)
 * @access  Private (Admin only)
 */
router.get(
  "/admin",
  protect,
  authorize("admin"),
  getAdminQuestionnaireView
);

/**
 * @route   GET /api/manual-sections/admin/download
 * @desc    Download structured questionnaire report
 * @access  Private (Admin only)
 */
router.get(
  "/admin/download",
  protect,
  authorize("admin"),
  downloadAdminReport
);


export default router;
