import { Router } from "express";
import userRoutes from "../modules/user/user.routes";
import  manualRoutes from "../modules/manual/manualSection.routes"

const router = Router();

router.use("/users", userRoutes);
router.use("/manual", manualRoutes);

export default router;
