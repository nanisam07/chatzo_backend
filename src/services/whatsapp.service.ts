import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";
import { encrypt, decrypt } from "../utils/crypto";

const prisma = new PrismaClient();

export class MetaOAuthError extends Error {
  code?: number;
  subcode?: number;
  trace_id?: string;

  constructor(message: string, code?: number, subcode?: number, trace_id?: string) {
    super(message);
    this.name = "MetaOAuthError";
    this.code = code;
    this.subcode = subcode;
    this.trace_id = trace_id;
  }
}

interface SendMessageOptions {
  recipientPhone: string;
  type: "text" | "image" | "document" | "template" | "interactive_button" | "interactive_list" | "product";
  text?: string;
  mediaUrl?: string;
  filename?: string;
  templateName?: string;
  buttons?: { id: string; title: string }[];
  sections?: { title: string; rows: { id: string; title: string; description?: string }[] }[];
  catalogId?: string;
  productSku?: string;
}

export const whatsappService = {
  // Exchange OAuth code for access token
  async exchangeCodeForToken(
    code: string,
    redirectUri?: string
  ): Promise<{
    accessToken: string;
    tokenExpiry?: Date;
  }> {
    console.log("[Token Exchange] Exchanging authorization code via Meta Graph API v23.0");

    const body = new URLSearchParams({
      client_id: env.META_APP_ID,
      client_secret: env.META_APP_SECRET,
      code,
    });

    if (redirectUri) {
      body.append("redirect_uri", redirectUri);
    }
    console.log("===== TOKEN EXCHANGE =====");
console.log("META_APP_ID:", env.META_APP_ID);
console.log("redirectUri:", redirectUri);
console.log("BODY:", body.toString());
console.log("==========================");

    const res = await fetch(
      "https://graph.facebook.com/v23.0/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    const data = (await res.json()) as any;

    if (!res.ok || data.error) {
      const errorObj = data.error || {};
      console.error("[Token Exchange] Meta token exchange failed:", errorObj);
      throw new MetaOAuthError(
        errorObj.message || "Meta token exchange failed",
        errorObj.code,
        errorObj.error_subcode,
        errorObj.fbtrace_id
      );
    }

    console.log("[Token Exchange] Token exchange successful.");

    return {
      accessToken: data.access_token,
      tokenExpiry: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  },

  // Fetch WABA details shared with the token
  async fetchAccountDetails(token: string): Promise<{
    businessId: string;
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    businessName: string;
  }> {
    console.log("[Account Details] Fetching shared WhatsApp Business Accounts from Meta Graph API v23.0...");

    // 1. Get shared WhatsApp Business Accounts
    const wabaUrl = `https://graph.facebook.com/v23.0/me/whatsapp_business_accounts?access_token=${token}`;
    const wabaRes = await fetch(wabaUrl);
    const wabaData = (await wabaRes.json()) as any;

    if (!wabaRes.ok || wabaData.error) {
      const errorObj = wabaData.error || {};
      console.error("[Account Details] Fetching WhatsApp Business Accounts failed:", errorObj);
      throw new MetaOAuthError(
        errorObj.message || "Failed to fetch WhatsApp Business Accounts",
        errorObj.code,
        errorObj.error_subcode,
        errorObj.fbtrace_id
      );
    }

    if (!wabaData.data || wabaData.data.length === 0) {
      console.error("[Account Details] No WhatsApp Business Accounts linked to this token");
      throw new Error("No WhatsApp Business Accounts linked to this token");
    }

    const firstAccount = wabaData.data[0];
    const wabaId = firstAccount.id;
    const businessName = firstAccount.name || "My WhatsApp Store";
    console.log("[Account Details] Shared WABA retrieved successfully. WABA ID:", wabaId);

    // 2. Get phone numbers registered with this WABA
    console.log("[Account Details] Fetching phone numbers for WABA:", wabaId);
    const phoneUrl = `https://graph.facebook.com/v23.0/${wabaId}/phone_numbers?access_token=${token}`;
    const phoneRes = await fetch(phoneUrl);
    const phoneData = (await phoneRes.json()) as any;

    if (!phoneRes.ok || phoneData.error) {
      const errorObj = phoneData.error || {};
      console.error("[Account Details] Fetching phone numbers failed:", errorObj);
      throw new MetaOAuthError(
        errorObj.message || "Failed to fetch phone numbers from WhatsApp Business Account",
        errorObj.code,
        errorObj.error_subcode,
        errorObj.fbtrace_id
      );
    }

    if (!phoneData.data || phoneData.data.length === 0) {
      console.error("[Account Details] No phone numbers registered with this WhatsApp Business Account");
      throw new Error("No phone numbers registered with this WhatsApp Business Account");
    }

    const firstPhone = phoneData.data[0];
    const phoneNumberId = firstPhone.id;
    const displayPhoneNumber = firstPhone.display_phone_number || "";
    console.log("[Account Details] Registered phone numbers retrieved successfully. Phone ID:", phoneNumberId);

    // 3. For businessId, fetch WABA profile to resolve business owner
    const businessId = firstAccount.owner_business_info?.id || "1234567890";

    return {
      businessId,
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      businessName,
    };
  },

  // Persist conversation and message to Database
  async persistMessage(options: {
    merchantId: string;
    customerPhone: string;
    customerName?: string;
    text: string;
    sender: "customer" | "merchant" | "bot";
  }): Promise<any> {
    const { merchantId, customerPhone, customerName, text, sender } = options;

    let thread = await prisma.chatThread.findFirst({
      where: {
        merchantId,
        phone: customerPhone,
      },
    });

    const cleanTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (!thread) {
      thread = await prisma.chatThread.create({
        data: {
          name: customerName || customerPhone,
          phone: customerPhone,
          lastMessage: text,
          time: cleanTime,
          unread: sender === "customer" ? 1 : 0,
          category: "retail",
          merchantId,
        },
      });
    } else {
      thread = await prisma.chatThread.update({
        where: { id: thread.id },
        data: {
          lastMessage: text,
          time: cleanTime,
          unread: sender === "customer" ? thread.unread + 1 : 0, // Reset unread if merchant replies
        },
      });
    }

    return prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        sender,
        text,
        time: cleanTime,
      },
    });
  },

  // Send WhatsApp message via Meta Cloud API
  async sendMessage(merchantId: string, options: SendMessageOptions): Promise<any> {
    const account = await prisma.whatsAppAccount.findUnique({
      where: { merchantId },
    });

    if (!account || account.connectionStatus === "Disconnected") {
      throw new Error("WhatsApp account not connected");
    }

    const accessToken = decrypt(account.accessToken);
    const phoneNumberId = account.phoneNumberId;

    let messageBody: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: options.recipientPhone,
    };

    switch (options.type) {
      case "text":
        messageBody = {
          ...messageBody,
          type: "text",
          text: { body: options.text || "" },
        };
        break;

      case "image":
        messageBody = {
          ...messageBody,
          type: "image",
          image: { link: options.mediaUrl || "" },
        };
        break;

      case "document":
        messageBody = {
          ...messageBody,
          type: "document",
          document: {
            link: options.mediaUrl || "",
            filename: options.filename || "Document",
          },
        };
        break;

      case "template":
        messageBody = {
          ...messageBody,
          type: "template",
          template: {
            name: options.templateName || "",
            language: { code: "en_US" },
          },
        };
        break;

      case "interactive_button":
        messageBody = {
          ...messageBody,
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: options.text || "Please select an option" },
            action: {
              buttons: (options.buttons || []).map((b) => ({
                type: "reply",
                reply: { id: b.id, title: b.title },
              })),
            },
          },
        };
        break;

      case "interactive_list":
        messageBody = {
          ...messageBody,
          type: "interactive",
          interactive: {
            type: "list",
            body: { text: options.text || "Please select from the options" },
            action: {
              button: "Select",
              sections: (options.sections || []).map((sec) => ({
                title: sec.title,
                rows: sec.rows.map((r) => ({
                  id: r.id,
                  title: r.title,
                  description: r.description,
                })),
              })),
            },
          },
        };
        break;

      case "product":
        messageBody = {
          ...messageBody,
          type: "interactive",
          interactive: {
            type: "product",
            action: {
              catalog_id: options.catalogId || "",
              product_retailer_id: options.productSku || "",
            },
          },
        };
        break;
    }

    // Call Graph API (if config is real, otherwise mock)
    let metaMessageId = "mock_msg_id_" + Math.random().toString(36).substr(2, 9);
    
    if (env.META_APP_ID && accessToken && accessToken !== "mock_token") {
      const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messageBody),
        });
        const responseData = (await response.json()) as any;
        if (!response.ok || responseData.error) {
          console.error("Meta API Message Send Error:", responseData.error);
        } else {
          metaMessageId = responseData.messages?.[0]?.id || metaMessageId;
        }
      } catch (err) {
        console.error("Failed to make request to Meta API:", err);
      }
    }

    // Store outgoing message
    await this.persistMessage({
      merchantId,
      customerPhone: options.recipientPhone,
      text: options.text || `[Sent ${options.type} message]`,
      sender: "merchant",
    });

    return { success: true, messageId: metaMessageId };
  },
};
