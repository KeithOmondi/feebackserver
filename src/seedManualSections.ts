import mongoose from "mongoose";
import ManualSection from "./modules/manual/manualSection.model";
import { manualSections } from "./manualSectionsData";

const seedManualSections = async () => {
  try {
    for (const section of manualSections) {
      const existing = await ManualSection.findOne({ code: section.code });
      if (existing) {
        console.log(`Skipping section ${section.code} — already exists`);
        continue;
      }

      await ManualSection.create(section);
      console.log(`Created section ${section.code} - ${section.title}`);
    }

    console.log("Manual sections seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
};

// Connect to MongoDB and run
mongoose
  .connect(process.env.MONGO_URI || "mongodb+srv://principalregistry_db_user:pr.@cluster0.85iismr.mongodb.net/?appName=Cluster0")
  .then(() => {
    console.log("MongoDB connected...");
    seedManualSections();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
