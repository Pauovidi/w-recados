import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const functionsRoot = path.resolve("base44", "functions");
const sharedRoot = path.join(functionsRoot, "_shared");

const copies = {
  "utils.ts": [
    "completeCustomerProfile",
    "createAuthenticatedOrder",
    "createPublicOrder",
    "createStripeCheckout",
    "getCustomerPortal",
    "markManualPayment",
    "sendAdminMessage",
    "sendCustomerMessage",
    "sendWhatsApp",
    "stripeWebhook",
    "twilioInbound",
    "twilioStatus",
  ],
  "customerPortal.ts": [
    "completeCustomerProfile",
    "createAuthenticatedOrder",
    "createPublicOrder",
    "getCustomerPortal",
    "sendCustomerMessage",
  ],
  "whatsappIntake.ts": ["twilioInbound"],
};

for (const [sourceName, targets] of Object.entries(copies)) {
  for (const target of targets) {
    const targetDirectory = path.join(functionsRoot, target);
    await mkdir(targetDirectory, { recursive: true });
    await copyFile(
      path.join(sharedRoot, sourceName),
      path.join(targetDirectory, sourceName),
    );
  }
}

console.log("Base44 shared function files synchronized.");
