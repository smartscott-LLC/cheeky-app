import 'server-only';
import OpenAI from 'openai';

// DateSafe — Club Cheeky's automated safety reviewer. One component that
// sits in the back and does nothing but complaints: when a report lands, it
// pipes the content to a dedicated vision model (via OpenRouter) and returns
// a verdict the human process confirms. Not the floor AI — this one never
// chats with members. (Spec: docs/Governance/takedown-appeals.md)

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || ''
});

const VISION_MODEL =
  process.env.DATESAFE_VISION_MODEL ?? 'nvidia/nemotron-nano-12b-v2-vl:free';

export interface DateSafeVerdict {
  verdict: 'violation' | 'clean' | 'inconclusive';
  category: string | null;
  confidence: number | null;
  summary: string | null;
}

const SYSTEM_PROMPT = `You are DateSafe, Club Cheeky's automated safety reviewer. A member has reported content on a dating platform. Judge the reported content against the Acceptable Use Policy.

Mark a VIOLATION only for clearly prohibited content:
- sexually explicit content or nudity
- non-consensual intimate imagery
- harassment, threats, hate, or targeted abuse
- any indication of a minor (under 18)
- illegal activity or dangerous goods

Mark CLEAN when the content is safe (a normal photo, clothing, everyday activity).
Mark INCONCLUSIVE when you cannot determine it from the image alone.

Be strict about sexual content, fair about everything else. You are the first pass, not the final word — a human confirms every ban.

Return STRICT JSON only, no prose, no markdown:
{"verdict":"violation|clean|inconclusive","category":"explicit_content|harassment|threats|hate|underage|illegal|non_consensual|none","confidence":0.0,"summary":"one short sentence"}`;

/** OpenRouter reasoning mode — the reviewer thinks before it rules. */
const REASONING = { enabled: true } as const;

async function complete(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
) {
  // `reasoning` is an OpenRouter extension (deep-thinking pass); the SDK
  // types don't know it yet, hence the assertion.
  return client.chat.completions.create({
    model: VISION_MODEL,
    messages,
    reasoning: REASONING
  } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);
}

function parseVerdict(raw: string): DateSafeVerdict {
  const fallback: DateSafeVerdict = {
    verdict: 'inconclusive',
    category: null,
    confidence: null,
    summary: null
  };
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]);
    return {
      verdict:
        parsed.verdict === 'violation' || parsed.verdict === 'clean'
          ? parsed.verdict
          : 'inconclusive',
      category: typeof parsed.category === 'string' ? parsed.category : null,
      confidence:
        typeof parsed.confidence === 'number'
          ? Math.min(1, Math.max(0, parsed.confidence))
          : null,
      summary: typeof parsed.summary === 'string' ? parsed.summary : null
    };
  } catch {
    return fallback;
  }
}

/** Image complaint — the vision model sees the reported photo. */
export async function reviewImage(
  imageUrl: string,
  complaint: string
): Promise<DateSafeVerdict> {
  const res = await complete([
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: `Member complaint: ${complaint}` },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    }
  ]);
  return parseVerdict(res.choices[0]?.message?.content ?? '');
}

/** Text complaint — no image involved; classify the report itself. */
export async function reviewComplaint(
  complaint: string
): Promise<DateSafeVerdict> {
  const res = await complete([
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `A member filed this report. Classify it: ${complaint}`
    }
  ]);
  return parseVerdict(res.choices[0]?.message?.content ?? '');
}

/** The entry point — image reports get the vision pass, otherwise text. */
export async function runDateSafe(input: {
  imageUrl?: string | null;
  complaint: string;
}): Promise<DateSafeVerdict> {
  if (input.imageUrl) {
    return reviewImage(input.imageUrl, input.complaint);
  }
  return reviewComplaint(input.complaint);
}
