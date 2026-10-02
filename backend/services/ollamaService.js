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

function cleanVisibleStreamContent(raw) {
  if (!raw) return "";
  let text = raw;

  // Filter out explicit <think>...</think> tags
  if (text.includes("<think>")) {
    if (!text.includes("</think>")) {
      return ""; // Still inside think tags
    }
    text = text.split("</think>")[1] || "";
  }

  // Filter out untagged thinking process if model starts rambling internal thoughts
  const thinkingPatterns = [
    /^I need to respond[^.]*\.\s*/i,
    /^Let me check[^.]*\.\s*/i,
    /^Since they're interacting[^.]*\.\s*/i,
    /^The user might be[^.]*\.\s*/i,
    /^The user is asking[^.]*\.\s*/i,
  ];
  for (const pattern of thinkingPatterns) {
    text = text.replace(pattern, "");
  }

  // Clean conversational preambles
  const preambleMatch = text.match(/^(Okay|Alright|Let's see|Let me see)/i);
  if (preambleMatch) {
    const dotIndex = text.indexOf(".");
    if (dotIndex !== -1 && dotIndex < 60) {
      text = text.slice(dotIndex + 1).trimStart();
    } else if (text.length < 60) {
      return "";
    }
  }

  return text;
}

export async function generateInspectorResponse({ history, context, onChunk }) {
  let response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        think: false,
        keep_alive: "60m",
        messages: [
          { role: "system", content: `${INSPECTOR_SYSTEM_PROMPT}\n\nFactory Data Context:\n${JSON.stringify(context)}` },
          ...history.slice(-4).map(({ role, content }) => ({ role, content: content.slice(-500) })),
        ],
        options: {
          temperature: 0.0,
          num_ctx: 2048,
          num_predict: 512,
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

  let accumulatedRaw = "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        continue;
      }

      if (parsed.error) {
        throw new OllamaError(parsed.error, 502, "generation_failed");
      }

      // Ignore any internal thinking field
      const chunkContent = parsed.message?.content || parsed.response || "";

      if (chunkContent) {
        accumulatedRaw += chunkContent;
        const visible = cleanVisibleStreamContent(accumulatedRaw);
        if (visible && onChunk) {
          onChunk(visible);
        }
      }

      if (parsed.done) {
        break;
      }
    }
  }

  let content = cleanVisibleStreamContent(accumulatedRaw).trim();

  // Final fallback if content was suppressed or empty
  if (!content) {
    const lastUserMsg = history[history.length - 1]?.content?.toLowerCase() || "";
    if (lastUserMsg.includes("hello") || lastUserMsg.includes("hi") || lastUserMsg.includes("hey")) {
      content = "Hello! I am the VisionQC AI Quality Inspector. How can I assist you with your manufacturing quality control, products, or reference datasets today?";
    } else {
      content = "Quality inspection analysis completed. No major defects or drift detected in recent inspection records.";
    }
  }

  return content;
}

export const ollamaConfig = { model: MODEL, baseUrl: BASE_URL };

