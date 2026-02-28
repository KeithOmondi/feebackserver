import { Request, Response } from "express";
import ManualSection, { SectionAction } from "./manualSection.model"; // Import Enum
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import PDFDocument from "pdfkit";

/* ===============================
   USER ROUTES
=============================== */

export const getManualSections = asyncHandler(
  async (_req: Request, res: Response) => {
    const sections = await ManualSection.find().sort({ code: 1 });
    res.status(200).json({ success: true, data: sections });
  },
);

/**
 * Add user answer/comment/amendment/reference/action
 */
// manualSection.controller.ts

export const addSectionEntry = asyncHandler(
  async (req: Request, res: Response) => {
    const { sectionId, userId, content, type } = req.body;

    const typeMap: Record<string, { arrayKey: string; fieldName: string }> = {
      comment: { arrayKey: "comments", fieldName: "comment" },
      amendment: { arrayKey: "amendments", fieldName: "proposedChange" },
      justification: { arrayKey: "justifications", fieldName: "justification" },
      reference: { arrayKey: "references", fieldName: "reference" },
      action: { arrayKey: "actions", fieldName: "action" },
    };

    const config = typeMap[type as keyof typeof typeMap];
    if (!config) throw new ApiError(400, "Invalid entry type");
    
    // Check if content exists and isn't just whitespace
    if (!content || content.toString().trim() === "") {
        throw new ApiError(400, `${type} content cannot be empty`);
    }

    const updatePayload = {
      userId,
      createdAt: new Date(),
      [config.fieldName]: content,
    };

    const section = await ManualSection.findByIdAndUpdate(
      sectionId,
      { $push: { [config.arrayKey]: updatePayload } },
      { new: true, runValidators: true } // Ensure your model allows these strings
    ).populate(`${config.arrayKey}.userId`, "firstName lastName pj");

    if (!section) throw new ApiError(404, "Manual section not found");

    res.status(200).json({ success: true, data: section });
  },
);

/* ===============================
   ADMIN ROUTES
=============================== */

export const getAdminQuestionnaireView = asyncHandler(
  async (_req: Request, res: Response) => {
    const sections = await ManualSection.find()
      .sort({ code: 1 })
      .populate(
        "comments.userId amendments.userId justifications.userId references.userId actions.userId",
        "firstName lastName pj",
      );

    const formatted = sections.map((section) => ({
      _id: section._id,
      code: section.code,
      title: section.title,
      part: section.part,
      content: section.content,
      comments: section.comments,
      amendments: section.amendments,
      justifications: section.justifications,
      references: section.references,
      actions: section.actions, // Included in response
    }));

    res.status(200).json({ success: true, data: formatted });
  },
);

export const downloadAdminReport = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.query as { userId?: string };

    const sections = await ManualSection.find()
      .sort({ code: 1 })
      .populate(
        "comments.userId amendments.userId justifications.userId references.userId actions.userId",
        "firstName lastName pj",
      );

    const doc = new PDFDocument({ 
      size: "A4", 
      margin: 50, 
      bufferPages: true 
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition", 
      `attachment; filename=Audit_Report_${new Date().toISOString().split("T")[0]}.pdf`
    );
    doc.pipe(res);

    const colors = {
      primaryGreen: "#1a3a32",
      accentGold: "#b48222",
      textDark: "#25443c",
      lightGray: "#666666",
      borderGray: "#e0e0e0",
      actionBlue: "#2b5a91" // Distinct color for actions
    };

    // Header logic...
    doc.rect(0, 0, doc.page.width, 100).fill(colors.primaryGreen);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(22).text("High Court of Kenya", 50, 35);
    doc.fontSize(10).font("Helvetica").text("DISCIPLINARY PROCEDURES MANUAL | AUDIT REPORT", 50, 65);
    doc.moveDown(4);

    sections.forEach((section) => {
      if (doc.y > 650) doc.addPage();

      // Section Code and Title
      const sectionTop = doc.y;
      doc.rect(50, sectionTop, 40, 20).fill(colors.accentGold);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text(section.code, 55, sectionTop + 5, { width: 30, align: "center" });
      doc.fillColor(colors.primaryGreen).fontSize(12).text(section.title.toUpperCase(), 100, sectionTop + 5);
      doc.moveDown(1.5);

      // Main Content
      doc.font("Helvetica-Oblique").fontSize(11).fillColor(colors.textDark).text(section.content || "No content provided.", { align: "justify" });
      doc.moveDown(1);
      
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(colors.borderGray).stroke();
      doc.moveDown(1);

      // --- SUB-ENTRIES ---
      const entryTypes = [
        { key: "actions", label: "PROPOSED ACTION", field: "action", color: colors.actionBlue },
        { key: "justifications", label: "JUSTIFICATIONS", field: "justification", color: colors.accentGold },
        { key: "amendments", label: "PROPOSED WORDING", field: "proposedChange", color: colors.accentGold },
        { key: "references", label: "REFERENCES", field: "reference", color: colors.accentGold },
        { key: "comments", label: "GENERAL COMMENTS", field: "comment", color: colors.accentGold },
      ];

      entryTypes.forEach((et) => {
        let entries = (section as any)[et.key] || [];
        if (userId) {
          entries = entries.filter((e: any) => e.userId?._id.toString() === userId);
        }

        if (entries.length > 0) {
          doc.font("Helvetica-Bold").fontSize(8).fillColor(et.color || colors.accentGold).text(et.label);

          entries.forEach((entry: any) => {
            const displayVal = et.key === 'actions' ? entry[et.field].toUpperCase() : entry[et.field];
            doc.font("Helvetica").fontSize(10).fillColor("#000000").text(displayVal, { indent: 10 });
            doc.fontSize(7).fillColor(colors.lightGray).text(`By: ${entry.userId?.firstName} ${entry.userId?.lastName} (PJ: ${entry.userId?.pj || 'N/A'})`, { indent: 10 });
            doc.moveDown(0.5);
          });
          doc.moveDown(0.5);
        }
      });
      doc.moveDown(1);
    });

    // Footer logic...
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor(colors.lightGray).text(`Page ${i + 1} of ${range.count}`, 50, doc.page.height - 50, { align: "center" });
    }

    doc.end();
  },
);


/**
 * Delete a specific entry from a manual section
 * URL: DELETE /api/manuals/:sectionId/:entryType/:entryId
 */
export const deleteSectionEntry = asyncHandler(
  async (req: Request, res: Response) => {
    const { sectionId, entryType, entryId } = req.params;

    // Map the type to the correct database array key
    const typeMap: Record<string, string> = {
      comment: "comments",
      amendment: "amendments",
      justification: "justifications",
      reference: "references",
      action: "actions",
    };

    const arrayKey = typeMap[entryType as keyof typeof typeMap];

    if (!arrayKey) {
      throw new ApiError(400, "Invalid entry type for deletion");
    }

    // Use $pull to remove the sub-document with the matching _id from the specific array
    const section = await ManualSection.findByIdAndUpdate(
      sectionId,
      {
        $pull: {
          [arrayKey]: { _id: entryId }
        }
      },
      { new: true }
    );

    if (!section) {
      throw new ApiError(404, "Manual section not found");
    }

    res.status(200).json({
      success: true,
      message: `${entryType} deleted successfully`,
      data: section
    });
  }
);