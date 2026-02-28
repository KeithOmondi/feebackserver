import { Request, Response } from "express";
import ManualSection from "./manualSection.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import PDFDocument from "pdfkit";

/* ===============================
   USER ROUTES
=============================== */

/**
 * Fetch all manual sections (Questions only)
 * Accessible to user/admin
 */
export const getManualSections = asyncHandler(
  async (_req: Request, res: Response) => {
    const sections = await ManualSection.find().sort({ code: 1 });
    res.status(200).json({ success: true, data: sections });
  },
);

/**
 * Add user answer/comment/amendment/reference
 * Accessible to user/admin
 */
export const addSectionEntry = asyncHandler(
  async (req: Request, res: Response) => {
    const { sectionId, userId, content, type } = req.body;

    const typeMap: Record<string, { arrayKey: string; fieldName: string }> = {
      comment: { arrayKey: "comments", fieldName: "comment" },
      amendment: { arrayKey: "amendments", fieldName: "proposedChange" },
      justification: { arrayKey: "justifications", fieldName: "justification" },
      reference: { arrayKey: "references", fieldName: "reference" },
    };

    const config = typeMap[type as keyof typeof typeMap];
    if (!config) throw new ApiError(400, "Invalid entry type");
    if (!content) throw new ApiError(400, `${type} content cannot be empty`);

    const updatePayload = {
      userId,
      createdAt: new Date(),
      [config.fieldName]: content,
    };

    const section = await ManualSection.findByIdAndUpdate(
      sectionId,
      { $push: { [config.arrayKey]: updatePayload } },
      { new: true, runValidators: true },
    ).populate(`${config.arrayKey}.userId`, "firstName lastName pj");

    if (!section) throw new ApiError(404, "Manual section not found");

    res.status(200).json({ success: true, data: section });
  },
);

/* ===============================
   ADMIN ROUTES
=============================== */

/**
 * Fetch all sections with all user submissions
 * Read-only, structured for admin dashboard
 */
export const getAdminQuestionnaireView = asyncHandler(
  async (_req: Request, res: Response) => {
    const sections = await ManualSection.find()
      .sort({ code: 1 })
      .populate(
        "comments.userId amendments.userId justifications.userId references.userId",
        "firstName lastName pj",
      );

    // Return in a shape matching frontend
    const formatted = sections.map((section) => ({
      _id: section._id,
      code: section.code,
      title: section.title,
      part: section.part,
      content: section.content,
      comments: section.comments.map((c: any) => ({ ...c._doc })),
      amendments: section.amendments.map((a: any) => ({ ...a._doc })),
      justifications: section.justifications.map((j: any) => ({ ...j._doc })),
      references: section.references.map((r: any) => ({ ...r._doc })),
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
        "comments.userId amendments.userId justifications.userId references.userId",
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

    // --- HELPER: Colors from the UI ---
    const colors = {
      primaryGreen: "#1a3a32",
      accentGold: "#b48222",
      textDark: "#25443c",
      lightGray: "#666666",
      borderGray: "#e0e0e0"
    };

    // --- HEADER SECTION ---
    doc
      .rect(0, 0, doc.page.width, 100)
      .fill(colors.primaryGreen);

    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(22)
      .text("High Court of Kenya", 50, 35)
      .fontSize(10)
      .font("Helvetica")
      .text("DISCIPLINARY PROCEDURES MANUAL | CENTRALIZED AUDIT SYSTEM", 50, 65, { characterSpacing: 1 });

    doc.moveDown(4);

    // --- CONTENT ITERATION ---
    sections.forEach((section, index) => {
      // Check for page overflow
      if (doc.y > 650) doc.addPage();

      // Section Header (The Gold Box style)
      const sectionTop = doc.y;
      doc
        .rect(50, sectionTop, 40, 20)
        .fill(colors.accentGold);
      
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(section.code, 55, sectionTop + 5, { width: 30, align: "center" });

      doc
        .fillColor(colors.primaryGreen)
        .fontSize(12)
        .text(section.title.toUpperCase(), 100, sectionTop + 5);

      doc.moveDown(1.5);

      // Main Content Box (The Italic body text)
      doc
        .font("Helvetica-Oblique")
        .fontSize(11)
        .fillColor(colors.textDark)
        .text(section.content || "No content provided.", {
          align: "justify",
          lineGap: 4
        });

      doc.moveDown(1);
      
      // Horizontal Rule
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor(colors.borderGray)
        .stroke();
      
      doc.moveDown(1);

      // --- SUB-ENTRIES (Justifications, Wording, etc.) ---
      const entryTypes = [
        { key: "justifications", label: "JUSTIFICATIONS", field: "justification" },
        { key: "amendments", label: "PROPOSED WORDING", field: "proposedChange" },
        { key: "references", label: "REFERENCES", field: "reference" },
        { key: "comments", label: "GENERAL COMMENTS", field: "comment" },
      ];

      // Layout entries in a grid-like or list fashion
      entryTypes.forEach((et) => {
        let entries = (section as any)[et.key] || [];
        if (userId) {
          entries = entries.filter((e: any) => e.userId?._id.toString() === userId);
        }

        if (entries.length > 0) {
          doc
            .font("Helvetica-Bold")
            .fontSize(8)
            .fillColor(colors.accentGold)
            .text(et.label, { continued: false });

          entries.forEach((entry: any) => {
            doc
              .font("Helvetica")
              .fontSize(10)
              .fillColor("#000000")
              .text(entry[et.field], { indent: 10 })
              .fontSize(7)
              .fillColor(colors.lightGray)
              .text(`By: ${entry.userId?.firstName} ${entry.userId?.lastName} (PJ: ${entry.userId?.pj || 'N/A'})`, { indent: 10 })
              .moveDown(0.5);
          });
          doc.moveDown(0.5);
        }
      });

      doc.moveDown(2);
    });

    // --- FOOTER (Page Numbers) ---
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .fillColor(colors.lightGray)
        .text(
          `Generated on ${new Date().toLocaleString()} - Page ${i + 1} of ${range.count}`,
          50,
          doc.page.height - 50,
          { align: "center" }
        );
    }

    doc.end();
  },
);

