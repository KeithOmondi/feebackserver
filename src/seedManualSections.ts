import mongoose from "mongoose";
import ManualSection from "./modules/manual/manualSection.model";
import { manualSections } from "./manualSectionsData";

const seedManualSections = async () => {
  try {
    console.log("Starting synchronization of Manual Repository...");

    for (const section of manualSections) {
      // Using findOneAndUpdate ensures existing sections get the new 'content' and 'description' fields
      await ManualSection.findOneAndUpdate(
        { code: section.code },
        { 
          $set: { 
            title: section.title,
            part: section.part,
            content: section.content,
            description: section.description 
          } 
        },
        { upsert: true, new: true }
      );
      console.log(`Synced: ${section.code} - ${section.title}`);
    }

    console.log("Manual sections synchronization complete!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
};

mongoose
  .connect(process.env.MONGO_URI || "mongodb+srv://principalregistry_db_user:pr.@cluster0.85iismr.mongodb.net/?appName=Cluster0")
  .then(() => {
    console.log("MongoDB connected...");
    seedManualSections();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });