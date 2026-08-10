import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { whatsappService, MetaOAuthError } from "../services/whatsapp.service";
import { encrypt } from "../utils/crypto";
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

    const { code, wabaId: inputWabaId, phoneNumberId: inputPhoneNumberId, connectionRequestId } = req.body;
    if (!code) {
      res.status(400).json({ success: false, message: "Authorization code is required" });
      return;
    }

    const requestId = connectionRequestId || `req_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`[Connect Request] Received connection request with connectionRequestId: ${requestId}`);

    let accountDetails: {
      businessId: string;
      wabaId: string;
      phoneNumberId: string;
      displayPhoneNumber: string;
      businessName: string;
      accessToken: string;
      tokenExpiry?: Date;
    };

    let isWebhookVerified = false;
    let isPhoneStateVerified = false;

    // Sandbox/Mock fallback allowed ONLY in development mode when explicitly passed mock codes
    const isMockRequest = (code === "mock_code" || code === "test_code");
    if (isMockRequest && env.NODE_ENV === "development") {
      console.log("[Embedded Signup] Development environment detected: Using Sandbox Demo/Mock onboarding setup");
      accountDetails = {
        businessId: "109876543210987",
        wabaId: inputWabaId || "209876543210988",
        phoneNumberId: inputPhoneNumberId || "309876543210989",
        displayPhoneNumber: "+1 555-0100",
        businessName: "OFFSHIFT Demo Shop",
        accessToken: env.WHATSAPP_ACCESS_TOKEN || "mock_developer_access_token",
        tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      };
      isWebhookVerified = true;
      isPhoneStateVerified = true;
    } else {
      // Real Meta Onboarding Flow
      try {
        console.log(`[Embedded Signup] Initiating Meta token exchange for requestId: ${requestId}...`);
        const tokenExchange = await whatsappService.exchangeCodeForToken(
          String(code),
          undefined,
          requestId
        );

        const details = await whatsappService.fetchAccountDetails(
          tokenExchange.accessToken,
          inputWabaId,
          inputPhoneNumberId
        );

        accountDetails = {
          ...details,
          accessToken: tokenExchange.accessToken,
          tokenExpiry: tokenExchange.tokenExpiry,
        };

        // 1. Execute WABA Webhook App Subscription (POST /{waba_id}/subscribed_apps)
        console.log(`[Embedded Signup] Subscribing WABA ID ${accountDetails.wabaId} to webhooks...`);
        const subResult = await whatsappService.subscribeWaba(
          accountDetails.wabaId,
          accountDetails.accessToken
        );

        isWebhookVerified = subResult.success;
        if (!subResult.success) {
          console.warn("[Embedded Signup] WABA webhook subscription did not complete cleanly:", subResult.data);
        }

        // 2. Inspect phone registration & readiness state without hardcoding PINs
        console.log(`[Embedded Signup] Verifying phone readiness for Phone ID ${accountDetails.phoneNumberId}...`);
        const phoneState = await whatsappService.verifyPhoneState(
          accountDetails.phoneNumberId,
          accountDetails.accessToken
        );

        isPhoneStateVerified = phoneState.isRegistered;
        if (!phoneState.isRegistered) {
          console.warn("[Embedded Signup] Phone number verification state on Meta Cloud API is incomplete.");
        }
      } catch (exchangeError: any) {
        if (exchangeError instanceof MetaOAuthError) {
          res.status(400).json({
            success: false,
            message: exchangeError.message || "Meta token exchange failed",
            meta: {
              code: exchangeError.code,
              subcode: exchangeError.subcode,
              trace_id: exchangeError.trace_id,
            },
          });
          return;
        }
        res.status(400).json({
          success: false,
          message: exchangeError.message || "Failed to complete Meta WhatsApp onboarding",
        });
        return;
      }
    }

    // Determine Connection Status strictly based on successful Meta onboarding
    const finalConnectionStatus = (isPhoneStateVerified || isMockRequest) ? "Connected" : "Pending Verification";

    // Encrypt access token before storing
    console.log(`[Database] Encrypting access token and upserting WhatsAppAccount for merchantId: ${merchantId}`);
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
        connectionStatus: finalConnectionStatus,
        webhookVerified: isWebhookVerified,
      },
      update: {
        businessId: accountDetails.businessId,
        wabaId: accountDetails.wabaId,
        phoneNumberId: accountDetails.phoneNumberId,
        displayPhoneNumber: accountDetails.displayPhoneNumber,
        businessName: accountDetails.businessName,
        accessToken: encryptedToken,
        tokenExpiry: accountDetails.tokenExpiry,
        connectionStatus: finalConnectionStatus,
        webhookVerified: isWebhookVerified,
      },
    });

    res.json({
      success: true,
      message: finalConnectionStatus === "Connected" 
        ? "WhatsApp Business Account connected successfully" 
        : "WhatsApp Business Account connected, awaiting phone verification on Meta",
      data: {
        wabaId: account.wabaId,
        phoneNumberId: account.phoneNumberId,
        displayPhoneNumber: account.displayPhoneNumber,
        businessName: account.businessName,
        connectionStatus: account.connectionStatus,
        webhookVerified: account.webhookVerified,
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
export const verifyWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === env.META_VERIFY_TOKEN
  ) {
    console.log("[Webhook] Verification successful");
    res.status(200).send(challenge);
    return;
  }

  console.log("[Webhook] Verification failed");
  res.sendStatus(403);
};

export const receiveWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {

  console.log("[Webhook] Incoming Event");
  console.log(JSON.stringify(req.body, null, 2));

  res.sendStatus(200);
};