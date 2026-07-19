import assert from "node:assert/strict";
import {
  getWhatsAppIntakeConfirmation,
  processDemoWhatsAppIntake,
} from "../src/lib/whatsapp-intake.js";

const baseConversation = {
  language: "es",
  intake_status: "idle",
  intake_draft: {},
};

const first = processDemoWhatsAppIntake({
  conversation: baseConversation,
  message: "Hola, necesito seis botellas de agua, leche y pan.",
});
assert.equal(first.complete, false);
assert.equal(first.draft.service_type, "supermercado");
assert.deepEqual(first.missingFields, ["delivery_address", "preferred_schedule"]);
assert.match(first.reply, /dirección/i);

const second = processDemoWhatsAppIntake({
  conversation: {
    ...baseConversation,
    intake_status: "collecting",
    intake_draft: first.draft,
  },
  message: "Hotel Playitas, habitación 214",
});
assert.equal(second.complete, false);
assert.equal(second.language, "es");
assert.equal(second.draft.delivery_address, "Hotel Playitas, habitación 214");
assert.deepEqual(second.missingFields, ["preferred_schedule"]);

const third = processDemoWhatsAppIntake({
  conversation: {
    ...baseConversation,
    intake_status: "collecting",
    intake_draft: second.draft,
  },
  message: "Lo antes posible",
});
assert.equal(third.complete, true);
assert.equal(third.draft.preferred_schedule, "lo_antes_posible");
assert.match(getWhatsAppIntakeConfirmation("es", "1042"), /#1042/);

const allAtOnce = processDemoWhatsAppIntake({
  conversation: { ...baseConversation, language: "en" },
  message: "I need water and bread. Deliver to Villa 12, Playitas Resort this afternoon.",
});
assert.equal(allAtOnce.complete, true);
assert.equal(allAtOnce.language, "en");
assert.equal(allAtOnce.draft.service_type, "supermercado");
assert.equal(allAtOnce.draft.preferred_schedule, "tarde");
assert.match(allAtOnce.draft.delivery_address, /Villa 12/i);

console.log("WhatsApp intake flow verified.");
