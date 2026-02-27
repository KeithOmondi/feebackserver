import mongoose, { Schema, Document } from "mongoose";

export interface IManualSection extends Document {
  code: string;
  title: string;
  part: string;
  comments: {
    userId: mongoose.Types.ObjectId;
    comment: string;
    createdAt: Date;
  }[];
  amendments: {
    userId: mongoose.Types.ObjectId;
    proposedChange: string;
    createdAt: Date;
  }[];
  justifications: {
    userId: mongoose.Types.ObjectId;
    justification: string;
    createdAt: Date;
  }[];
}

const ManualSectionSchema = new Schema<IManualSection>({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  part: { type: String, required: true },
  comments: [
    {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      comment: { type: String },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  amendments: [
    {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      proposedChange: { type: String },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  justifications: [
    {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      justification: { type: String },
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

export default mongoose.model<IManualSection>("ManualSection", ManualSectionSchema);
