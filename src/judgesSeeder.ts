import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { judgesData } from "./judgesData";
import User from "./modules/user/user.model";

dotenv.config();

const seedJudges = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);

    console.log("Connected to DB...");

    // Remove duplicates based on pj
    const uniqueJudges = Array.from(
      new Map(judgesData.map((j) => [j.pj, j])).values()
    );

    const formattedJudges = await Promise.all(
      uniqueJudges.map(async (judge) => ({
        pj: judge.pj,
        firstName: judge.firstName,
        lastName: judge.lastName || "",
        otherNames: judge.otherNames || "",
        gender: judge.gender,
        email: judge.email,
        phone: judge.phone || "",
        idNo: judge.idNo || judge.idno || "",
        station: judge.station,
        img: judge.img || "",
        password: await bcrypt.hash(judge.password || judge.pj, 10),
      }))
    );

    await User.deleteMany(); // optional: clear collection
    await User.insertMany(formattedJudges);

    console.log("Judges seeded successfully ✅");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedJudges();
