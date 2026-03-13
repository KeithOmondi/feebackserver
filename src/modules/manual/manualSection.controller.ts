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
      primaryGreen: "#1a3a32",  // Judicial Green
      accentGold: "#b48222",    // Official Gold
      textDark: "#222222",
      lightGray: "#777777",
      borderGray: "#d1d1d1",
      actionBlue: "#1e40af",    // Professional Blue
      bgSoft: "#f9f9f9"
    };

    // --- Page Header ---
    const drawHeader = () => {
      doc.rect(0, 0, doc.page.width, 100).fill(colors.primaryGreen);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(20).text("HIGH COURT OF KENYA", 50, 30);
      doc.fontSize(10).font("Helvetica").text("HIGH COURT DRAFT JUDICIAL SERVICE", 50, 55);
      doc.fontSize(9).fillColor(colors.accentGold).text(`REPORT GENERATED: ${new Date().toLocaleDateString('en-GB')}`, 50, 70);
    };

    drawHeader();
    doc.moveDown(5);

    sections.forEach((section) => {
      // Prevent orphaned section headers
      if (doc.y > 600) {
        doc.addPage();
        drawHeader();
        doc.moveDown(5);
      }

      // --- Section Header Bar ---
      const sectionTop = doc.y;
      doc.rect(50, sectionTop, 50, 22).fill(colors.primaryGreen);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(11).text(section.code, 50, sectionTop + 6, { width: 50, align: "center" });
      
      doc.fillColor(colors.primaryGreen).fontSize(13).text(section.title.toUpperCase(), 110, sectionTop + 5);
      doc.moveDown(1.5);

      // --- Section Original Content ---
      doc.font("Helvetica-Oblique").fontSize(10).fillColor(colors.textDark).text(section.content || "No clause content available.", { 
        align: "justify",
        lineGap: 2 
      });
      
      doc.moveDown(1);
      doc.strokeColor(colors.borderGray).lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // --- Audit Entries ---
      const entryTypes = [
        { key: "actions", label: "PROPOSED ACTION", field: "action", color: colors.actionBlue },
        { key: "amendments", label: "PROPOSED WORDING / AMENDMENT", field: "proposedChange", color: colors.primaryGreen },
        { key: "justifications", label: "JUSTIFICATION", field: "justification", color: colors.accentGold },
        { key: "references", label: "LEGAL REFERENCES", field: "reference", color: colors.lightGray },
        { key: "comments", label: "OFFICER COMMENTS", field: "comment", color: colors.lightGray },
      ];

      entryTypes.forEach((et) => {
        let entries = (section as any)[et.key] || [];
        if (userId) {
          entries = entries.filter((e: any) => e.userId?._id.toString() === userId);
        }

        if (entries.length > 0) {
          // Sub-heading for Entry Type
          doc.font("Helvetica-Bold").fontSize(8).fillColor(et.color).text(et.label);
          doc.moveDown(0.3);

          entries.forEach((entry: any) => {
            if (doc.y > 720) {
                doc.addPage();
                drawHeader();
                doc.moveDown(5);
            }

            const content = et.key === 'actions' ? entry[et.field].toUpperCase() : entry[et.field];
            
            // Text box for clarity
            doc.font("Helvetica").fontSize(10).fillColor("#000000").text(content, { 
                indent: 10,
                lineGap: 1
            });

            // Metadata
            const author = `${entry.userId?.firstName || 'Unknown'} ${entry.userId?.lastName || 'User'}`;
            const pj = entry.userId?.pj ? ` (PJ: ${entry.userId.pj})` : "";
            doc.fontSize(7.5).fillColor(colors.lightGray).text(`Submitted by: ${author}${pj}`, { indent: 10 });
            doc.moveDown(0.8);
          });
          doc.moveDown(0.5);
        }
      });

      doc.moveDown(2); // Space between different manual sections
    });

    // --- Footer: Page Numbers ---
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor(colors.lightGray).text(
        `Confidential - Internal Judiciary Document | Page ${i + 1} of ${range.count}`, 
        50, 
        doc.page.height - 40, 
        { align: "center" }
      );
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
