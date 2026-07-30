import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  getStatus,
  connectAccount,
  getProfile,
  disconnectAccount,
  getChats,
  sendChat,
} from "../controllers/whatsapp.controller";

const router = Router();

router.use(authenticate);

router.get("/status", getStatus);
router.get("/connect", connectAccount);
router.get("/profile", getProfile);
router.post("/disconnect", disconnectAccount);
router.get("/chats", getChats);
router.post("/send", sendChat);

export default router;
