import { IUser } from "../models/User"; // Adjust path as needed

declare module "express-serve-static-core" {
  interface Request {
    user?: IUser;
  }
}