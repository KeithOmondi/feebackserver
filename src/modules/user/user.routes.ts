import { Router } from "express";
import { createUser, loginUser, getUsers } from "./user.controller";

const router = Router();

router.post("/create", createUser);
router.post("/login", loginUser);
router.get("/get", getUsers);

export default router;
