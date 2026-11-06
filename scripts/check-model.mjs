// Verifies that CLAUDE_MODEL is a model this API key can access.
// Prints model id/name only — never the API key.
import Anthropic from "@anthropic-ai/sdk";

const model = process.env.CLAUDE_MODEL?.trim();
if (!process.env.ANTHROPIC_API_KEY?.trim() || !model) {
  console.error("Missing ANTHROPIC_API_KEY and/or CLAUDE_MODEL (set them in .env.local).");
  process.exit(1);
}
try {
  const client = new Anthropic({ maxRetries: 0, timeout: 15_000 });
  const info = await client.models.retrieve(model);
  console.log(`OK: ${info.id} (${info.display_name}) is accessible to this key.`);
} catch (err) {
  const status = err instanceof Anthropic.APIError ? err.status : undefined;
  console.error(`Model check failed for "${model}"${status ? ` (HTTP ${status})` : ""}: ${err?.constructor?.name ?? "Error"}`);
  process.exit(1);
}
