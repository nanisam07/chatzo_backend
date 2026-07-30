import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { whatsappService } from "../services/whatsapp.service";
import { encrypt, decrypt } from "../utils/crypto";
import { env } from "../config/env";

const prisma = new PrismaClient();

export const getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = (req as any).user?.id;
    if (!merchantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const account = await prisma.whatsAppAccount.findUnique({
      where: { merchantId },
    });

    if (!account) {
      res.json({
        success: true,
        connected: false,
        status: "Disconnected",
      });
      return;
    }

    res.json({
      success: true,
      connected: account.connectionStatus === "Connected",
      wabaId: account.wabaId,
      phoneNumberId: account.phoneNumberId,
      displayPhoneNumber: account.displayPhoneNumber || "",
      businessName: account.businessName || "WhatsApp Store",
      webhookStatus: account.webhookVerified ? "Verified" : "Pending Verification",
      cloudApiStatus: "Connected",
      connectionStatus: account.connectionStatus,
    });
  } catch (error) {
    next(error);
  }
};

export const connectAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = (req as any).user?.id;
    if (!merchantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { code, redirect_uri } = req.query;
    if (!code) {
      res.status(400).json({ success: false, message: "Authorization code is required" });
      return;
    }

    const isAjax = !!req.headers.authorization;
    const resolvedRedirectUri = redirect_uri !== undefined 
      ? String(redirect_uri) 
      : (isAjax ? undefined : env.META_REDIRECT_URI);

    let accountDetails: {
      businessId: string;
      wabaId: string;
      phoneNumberId: string;
      displayPhoneNumber: string;
      businessName: string;
      accessToken: string;
      tokenExpiry?: Date;
    };

    // If using mock code or Meta credentials are not fully set up, fallback to mock details
    if (code === "mock_code" || code === "test_code" || !env.META_APP_ID || !env.META_APP_SECRET) {
      console.log("[WhatsApp] Using mock onboarding setup");
      accountDetails = {
        businessId: "109876543210987",
        wabaId: "209876543210988",
        phoneNumberId: "309876543210989",
        displayPhoneNumber: "+1 555-0100",
        businessName: "OFFSHIFT Demo Shop",
        accessToken: env.WHATSAPP_ACCESS_TOKEN || "mock_developer_access_token",
        tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      };
    } else {
      // Real flow
      const tokenExchange = await whatsappService.exchangeCodeForToken(
        String(code),
        resolvedRedirectUri
      );
      const details = await whatsappService.fetchAccountDetails(tokenExchange.accessToken);
      accountDetails = {
        ...details,
        accessToken: tokenExchange.accessToken,
        tokenExpiry: tokenExchange.tokenExpiry,
      };
    }

    // Encrypt access token before storing
    const encryptedToken = encrypt(accountDetails.accessToken);

    // Create or update WhatsAppAccount record
    const account = await prisma.whatsAppAccount.upsert({
      where: { merchantId },
      create: {
        merchantId,
        businessId: accountDetails.businessId,
        wabaId: accountDetails.wabaId,
        phoneNumberId: accountDetails.phoneNumberId,
        displayPhoneNumber: accountDetails.displayPhoneNumber,
        businessName: accountDetails.businessName,
        accessToken: encryptedToken,
        tokenExpiry: accountDetails.tokenExpiry,
        connectionStatus: "Connected",
        webhookVerified: true,
      },
      update: {
        businessId: accountDetails.businessId,
        wabaId: accountDetails.wabaId,
        phoneNumberId: accountDetails.phoneNumberId,
        displayPhoneNumber: accountDetails.displayPhoneNumber,
        businessName: accountDetails.businessName,
        accessToken: encryptedToken,
        tokenExpiry: accountDetails.tokenExpiry,
        connectionStatus: "Connected",
        webhookVerified: true,
      },
    });

    res.json({
      success: true,
      message: "WhatsApp Business Account connected successfully",
      data: {
        wabaId: account.wabaId,
        phoneNumberId: account.phoneNumberId,
        displayPhoneNumber: account.displayPhoneNumber,
        businessName: account.businessName,
        connectionStatus: account.connectionStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = (req as any).user?.id;
    if (!merchantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const account = await prisma.whatsAppAccount.findUnique({
      where: { merchantId },
    });

    if (!account || account.connectionStatus === "Disconnected") {
      res.status(404).json({ success: false, message: "No active WhatsApp connection found" });
      return;
    }

    res.json({
      success: true,
      data: {
        wabaId: account.wabaId,
        phoneNumberId: account.phoneNumberId,
        displayPhoneNumber: account.displayPhoneNumber || "",
        businessName: account.businessName || "WhatsApp Store",
        connectionStatus: account.connectionStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const disconnectAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = (req as any).user?.id;
    if (!merchantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // Preserve the record by updating connectionStatus as requested
    const account = await prisma.whatsAppAccount.findUnique({
      where: { merchantId },
    });

    if (!account) {
      res.status(404).json({ success: false, message: "WhatsApp connection not found" });
      return;
    }

    await prisma.whatsAppAccount.update({
      where: { merchantId },
      data: {
        connectionStatus: "Disconnected",
      },
    });

    res.json({
      success: true,
      message: "WhatsApp Business Account disconnected successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getChats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = (req as any).user?.id;
    if (!merchantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const threads = await prisma.chatThread.findMany({
      where: { merchantId },
      include: {
        messages: {
          orderBy: { id: "asc" },
        },
      },
      orderBy: { id: "desc" },
    });

    // Map to ChatItem[] type required by frontend
    const chatsList = threads.map((t) => ({
      id: t.id,
      name: t.name,
      phone: t.phone,
      lastMessage: t.lastMessage,
      time: t.time,
      unread: t.unread,
      messages: t.messages.map((m) => ({
        sender: m.sender,
        text: m.text,
        time: m.time,
      })),
    }));

    res.json({
      success: true,
      chats: chatsList,
    });
  } catch (error) {
    next(error);
  }
};

export const sendChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = (req as any).user?.id;
    if (!merchantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { threadId, text } = req.body;
    if (!threadId || !text) {
      res.status(400).json({ success: false, message: "ThreadId and text are required" });
      return;
    }

    const thread = await prisma.chatThread.findFirst({
      where: { id: threadId, merchantId },
    });

    if (!thread) {
      res.status(404).json({ success: false, message: "Chat thread not found" });
      return;
    }

    const result = await whatsappService.sendMessage(merchantId, {
      recipientPhone: thread.phone,
      type: "text",
      text,
    });

    res.json({
      success: true,
      message: "Message sent successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
