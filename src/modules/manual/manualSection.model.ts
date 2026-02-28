import mongoose, { Schema, Document } from "mongoose";

// Define an Enum for the Action types to ensure consistency
export enum SectionAction {
  AMEND = "amend",
  CLARIFY = "clarify",
  RETAIN = "Retain as is",
  DELETE = "delete"
}

export interface IManualSection extends Document {
  code: string;
  title: string;
  part: string;
  description?: string;
  content?: string;
  comments: Array<{
    userId: mongoose.Types.ObjectId;
    comment: string;
    createdAt: Date;
  }>;
  amendments: Array<{
    userId: mongoose.Types.ObjectId;
    proposedChange: string;
    createdAt: Date;
  }>;
  justifications: Array<{
    userId: mongoose.Types.ObjectId;
    justification: string;
    createdAt: Date;
  }>;
  references: Array<{
    userId: mongoose.Types.ObjectId;
    reference: string;
    createdAt: Date;
  }>;
  actions: Array<{
    userId: mongoose.Types.ObjectId;
    action: SectionAction;
    createdAt: Date;
  }>;
}

const ManualSectionSchema = new Schema<IManualSection>({
  code: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  part: { type: String, required: true },
  description: { type: String },
  content: { type: String },
  
  comments: [{
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],

  amendments: [{
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    proposedChange: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],

  justifications: [{
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    justification: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],

  references: [{
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reference: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],

  actions: [{
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { 
      type: String, 
      enum: Object.values(SectionAction),
      required: true 
    },
    createdAt: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true // Automatically manages createdAt/updatedAt for the main document
});

export default mongoose.model<IManualSection>("ManualSection", ManualSectionSchema);