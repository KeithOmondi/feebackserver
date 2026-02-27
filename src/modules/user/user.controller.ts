import { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "./user.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { generateToken } from "../../utils/generateToken";


// =============================
// CREATE USER
// =============================
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { pj, firstName, lastName, email, password } = req.body;

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new ApiError(400, "Email already exists");
  }

  const existingPj = await User.findOne({ pj });
  if (existingPj) {
    throw new ApiError(400, "PJ number already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    pj,
    firstName,
    lastName,
    email,
    password: hashedPassword,
  });

  res.status(201).json({
    success: true,
    data: user,
  });
});


// =============================
// LOGIN WITH PJ NUMBER
// =============================
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { pj, password } = req.body;

  if (!pj || !password) {
    throw new ApiError(400, "PJ number and password are required");
  }

  const user = await User.findOne({ pj });

  if (!user) {
    throw new ApiError(401, "Invalid PJ number or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new ApiError(401, "Invalid PJ number or password");
  }

  const token = generateToken(user._id.toString());

  res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    data: {
      id: user._id,
      pj: user.pj,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });
});



// =============================
// GET USERS
// =============================
export const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().select("-password");

  res.status(200).json({
    success: true,
    data: users,
  });
});
