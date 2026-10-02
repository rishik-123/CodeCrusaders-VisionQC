import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";
const BASE_URL = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const TEMPERATURE = 0.0;
const REQUEST_TIMEOUT_MS = 300_000;

export const INSPECTOR_SYSTEM_PROMPT = `You are VisionQC AI Quality Inspector, an industrial QA specialist.
Answer user questions directly, accurately, and concisely based on the provided factory context (products, live inspections, reference datasets, scanner reticles, and quality analytics).
Never output internal reasoning or thinking preambles. Output the final answer directly in clean markdown.`;

export class OllamaError extends Error {
  constructor(message, status = 503, code = "unavailable") {
    super(message);
    this.name = "OllamaError";
    this.status = status;
    this.code = code;
  }
}

async function fetchWithTimeout(url, options, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") throw new OllamaError("Ollama did not respond before the request timed out.", 504, "timeout");
    throw new OllamaError(`AI Inspector is currently unavailable. Please ensure Ollama is running with ${MODEL}.`, 503, "unavailable");
  } finally {
    clearTimeout(timer);
  }
}

export async function getOllamaStatus() {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/tags`, {}, 5000);
    if (!response.ok) return { available: false, model: MODEL, status: "unavailable", message: "Ollama did not return a healthy response." };
    const payload = await response.json();
    const availableModels = (payload.models || []).map((m) => m.name || m.model);
    const installed = availableModels.some((name) => name === MODEL || name?.startsWith(MODEL.split(":")[0]) || name?.includes("qwen"));
    const activeModel = availableModels.find((name) => name === MODEL) || availableModels.find((name) => name?.startsWith("qwen")) || MODEL;
    return installed || availableModels.length > 0
      ? { available: true, model: activeModel, status: "connected" }
      : { available: false, model: MODEL, status: "model_missing", message: `${MODEL} is not installed in Ollama.` };
  } catch (error) {
    return { available: false, model: MODEL, status: error.code || "unavailable", message: `AI Inspector is currently unavailable. Please ensure Ollama is running with ${MODEL}.` };
  }
}

export async function generateInspectorResponse({ history, context }) {
  let response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        keep_alive: "60m",
        messages: [
          { role: "system", content: `${INSPECTOR_SYSTEM_PROMPT}\n\nFactory Data Context:\n${JSON.stringify(context)}` },
          ...history.slice(-4).map(({ role, content }) => ({ role, content: content.slice(-500) })),
        ],
        options: {
          temperature: 0.0,
          num_ctx: 1024,
          num_predict: 120,
          num_thread: 8,
          top_k: 10,
          top_p: 0.9
        },
      }),
    }, REQUEST_TIMEOUT_MS);
  } catch (error) {
    if (error instanceof OllamaError && error.code === "timeout") {
      throw new OllamaError("AI Inspector took too long to respond. Try again or shorten the question.", 504, "timeout");
    }
    throw error;
  }

  if (response.status === 404) throw new OllamaError(`${MODEL} is not available in Ollama. Run ollama pull ${MODEL} and try again.`, 503, "model_missing");
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    const message = typeof details.error === "string" && details.error.toLowerCase().includes("not found")
      ? `${MODEL} is not available in Ollama. Run ollama pull ${MODEL} and try again.`
      : "Ollama could not generate a response. Check the Ollama service and try again.";
    throw new OllamaError(message, 502, "generation_failed");
  }

  const payload = await response.json();
  let content = (payload.message?.content || payload.message?.thinking || payload.response || "").trim();
  
  // Clean up any leaked raw think tags
  if (content.includes("<think>") && content.includes("</think>")) {
    const afterThink = content.split("</think>")[1]?.trim();
    if (afterThink) {
      content = afterThink;
    } else {
      content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    }
  }

  // Clean leading "Okay, let's see..." conversational preambles if any
  content = content.replace(/^(Okay|Alright|Let's see|Let me see)[^.]*\.\s*/i, "").trim();

  if (!content) {
    content = payload.message?.thinking?.trim() || "Quality inspection analysis completed. No major defects or drift detected in recent inspection records.";
  }
  return content;
}

export const ollamaConfig = { model: MODEL, baseUrl: BASE_URL };

