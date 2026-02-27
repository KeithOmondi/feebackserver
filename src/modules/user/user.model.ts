import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  pj: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  gender: string;
  email: string;
  phone?: string;
  idNo?: string;
  station: string;
  img?: string;
  password?: string; // Made optional for PJ-only login
  role: "admin" | "user"; // Added role to TypeScript
}

const userSchema = new Schema<IUser>(
  {
    pj: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String },
    otherNames: { type: String },
    gender: { type: String },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    idNo: { type: String },
    station: { type: String },
    img: { type: String },
    password: { type: String }, // Removed required: true if not using passwords
    role: { 
      type: String, 
      enum: ["admin", "user"], 
      default: "user" 
    }, // Added role to Mongoose with a default
  },
  { timestamps: true }
);

export default model<IUser>("User", userSchema);