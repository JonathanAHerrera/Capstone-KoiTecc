import { checkScamWithAnthropic } from "@/ai/check-scam-anthropic";
import { looksLikeInjection } from "@/ai/injection";
import { hasApiKey } from "@/ai/model";
import { redactSecrets } from "@/ai/redaction";
import type {
  ScamAnalysis,
  ScamAnalyzerInput,
  ScamCheckInput,
  ScamCheckResult,
  ScamLanguage,
} from "@/ai/scam-schema";

export const SCAM_PROMPT_VERSION = "check-scam.v1";
export const MOCK_SCAM_MODEL = "mock-scam-checker";

// The two steps that are forced to the top of whatToDoNext whenever a payment-change or wire
// request is detected (by rule or by model). Exported so the UI and tests can match them exactly.
// They mirror the SB 2610 essential control essential.payment-change-callback.
export const PAYMENT_CALLBACK_RULE_STEP: Readonly<Record<ScamLanguage, string>> = {
  en: "Do not send any money or change any payment details yet. Call the vendor back on a phone number you already had on file before this message arrived, never one from the message.",
  es: "No envíe dinero ni cambie ningún dato de pago todavía. Llame al proveedor a un número de teléfono que ya tenía registrado antes de recibir este mensaje, nunca a uno que aparezca en el mensaje.",
};

export const ESCALATE_TO_KOITECC_STEP: Readonly<Record<ScamLanguage, string>> = {
  en: "Escalate this to KOITECC (tap “Get help”) before any payment moves, so a person reviews it with you.",
  es: "Escale esto a KOITECC (toque “Obtener ayuda”) antes de que se mueva cualquier pago, para que una persona lo revise con usted.",
};

const PAYMENT_CHANGE_REASON: Readonly<Record<ScamLanguage, string>> = {
  en: "The message asks you to send money or change where payments go. That is the single most common way Texas small businesses lose money to fraud.",
  es: "El mensaje le pide enviar dinero o cambiar a dónde van los pagos. Esa es la forma más común en que las pequeñas empresas de Texas pierden dinero por fraude.",
};

const INJECTION_REASON: Readonly<Record<ScamLanguage, string>> = {
  en: "The message contains text aimed at automated tools (telling a checker to ignore its rules or rate it safe). Real business messages do not do this.",
  es: "El mensaje contiene texto dirigido a herramientas automáticas (indicando a un verificador que ignore sus reglas o lo califique como seguro). Los mensajes comerciales reales no hacen esto.",
};

const HUMAN_REVIEW_STEP: Readonly<Record<ScamLanguage, string>> = {
  en: "Do not act on this message. Have a person look at it before you reply, click, or pay.",
  es: "No actúe según este mensaje. Pida a una persona que lo revise antes de responder, hacer clic o pagar.",
};

// Bilingual phrases that mean "send money somewhere new". Deterministic on purpose: the callback
// rule must surface even when the model is wrong, offline, or talked out of it.
const PAYMENT_CHANGE_PATTERNS: readonly RegExp[] = [
  /\bwire( transfer)?\b/i,
  /\bach\b/i,
  /\brouting (number|no\.?|#)/i,
  /\b(new|updated?|changed?|different) (bank|banking|account|payment|remittance|wiring)\b/i,
  /\b(bank|banking|account|payment|remittance|wiring) (details|information|info|instructions)\b/i,
  /\bchange (of |in |to )?(our |the |your )?(bank|banking|payment|remittance|account)/i,
  /\bsend (the |your |this )?(payment|funds|money|deposit) to\b/i,
  /\bgift cards?\b/i,
  /\btransferencia( bancaria| electr[oó]nica)?\b/i,
  /\b(nueva|nuevo|cambi\w+|actualiz\w+)\s+(de\s+)?(la\s+|el\s+|los\s+|nuestr[ao]s?\s+)?(cuenta|datos bancarios|datos de pago|informaci[oó]n bancaria)/i,
  /\bcuenta bancaria\b/i,
  /\bdatos (bancarios|de pago)\b/i,
  /\bn[uú]mero de cuenta\b/i,
  /\benv[ií]\w+ (el|la|su) (pago|transferencia|dep[oó]sito)/i,
  /\btarjetas? de regalo\b/i,
];

// Common Spanish function words and business terms. Two or more hits in a message is a strong
// enough signal for a two-language product; anything else is treated as English.
const SPANISH_MARKER_PATTERNS: readonly RegExp[] = [
  /\b(estimad[oa]|hola|buenos d[ií]as|buenas tardes|saludos|gracias|por favor|usted|urgente)\b/i,
  /\b(cuenta|factura|pago|transferencia|proveedor|empresa|mensaje|contrase[ñn]a|verificar)\b/i,
  /\b(que|para|con|por|una|los|las|del|este|esta|hemos|debe|realice|haga)\b/i,
];
const SPANISH_MARKER_THRESHOLD = 2;

const URGENCY_PATTERNS: readonly RegExp[] = [
  /\b(urgent|immediately|right away|today|within 24 hours|asap|final notice|last warning)\b/i,
  /\b(urgente|inmediatamente|de inmediato|hoy mismo|[uú]ltimo aviso|en 24 horas)\b/i,
];
const CREDENTIAL_PATTERNS: readonly RegExp[] = [
  /\b(password|passcode|verification code|one[- ]time code|2fa|mfa|log ?in|sign ?in|verify your (account|identity))\b/i,
  /\b(contrase[ñn]a|c[oó]digo de verificaci[oó]n|inici[ae]r sesi[oó]n|verifi\w+ su (cuenta|identidad))\b/i,
];
const SECRECY_PATTERNS: readonly RegExp[] = [
  /\b(keep this (confidential|between us|quiet)|do not tell|don't tell|confidential)\b/i,
  /\b(no (se lo )?diga a nadie|mant[eé]ngalo (confidencial|en secreto)|confidencial)\b/i,
];
const LINK_PATTERN = /\bhxxps?:\/\/|\bwww\[\.\]|\bhttps?:\/\//i;

export type ScamAnalyzer = (input: ScamAnalyzerInput) => ScamCheckResult | Promise<ScamCheckResult>;

export type CheckScamOptions = {
  // Lets tests inject a deterministic or spy analyzer; defaults to Anthropic-or-mock.
  analyzer?: ScamAnalyzer;
};

export type CheckScamOutcome = ScamCheckResult & {
  redactedSecretCount: number;
  paymentChangeDetectedByRule: boolean;
  injectionDetected: boolean;
  detectedLanguage: ScamLanguage;
};

export class ScamCheckInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScamCheckInputError";
  }
}

export function detectScamLanguage(text: string | null): ScamLanguage {
  if (!text) return "en";
  let spanishMarkerCount = 0;
  for (const pattern of SPANISH_MARKER_PATTERNS) {
    const matches = text.match(new RegExp(pattern.source, "gi"));
    spanishMarkerCount += matches ? matches.length : 0;
  }
  return spanishMarkerCount >= SPANISH_MARKER_THRESHOLD ? "es" : "en";
}

export function looksLikePaymentChangeOrWire(text: string | null): boolean {
  if (!text) return false;
  return PAYMENT_CHANGE_PATTERNS.some((pattern) => pattern.test(text));
}

// Links are kept readable (a lookalike domain is a red flag the model should see) but defanged so
// nothing downstream renders or follows them by accident.
export function defangLinks(text: string): string {
  return text.replace(/\bhttps?:\/\//gi, (match) => match.replace(/^http/i, "hxxp")).replace(/\bwww\./gi, "www[.]");
}

export type ScamRedactionResult = { text: string; redactedCount: number };

export function redactScamMessage(text: string): ScamRedactionResult {
  const secretRedaction = redactSecrets(text);
  return { text: defangLinks(secretRedaction.text), redactedCount: secretRedaction.redactedCount };
}

function countMatches(text: string, patterns: readonly RegExp[]): number {
  return patterns.filter((pattern) => pattern.test(text)).length;
}

// Deterministic stand-in used whenever ANTHROPIC_API_KEY is absent (local dev, CI, tests). It scores
// the redacted text with the same bilingual phrase lists the pipeline uses, so a payment-change
// email always comes back high even before the pipeline's own enforcement runs.
export function checkScamWithMock(input: ScamAnalyzerInput): ScamCheckResult {
  const language = input.detectedLanguage;
  const text = input.redactedText ?? "";
  const isSpanish = language === "es";

  if (text.trim().length === 0) {
    return {
      analysis: {
        riskLevel: "medium",
        language,
        summary: isSpanish
          ? "La verificación sin conexión (sin clave de modelo) no puede leer fotos. Pegue el texto del mensaje para obtener una respuesta real."
          : "The offline check (no model key set) cannot read photos. Paste the text of the message to get a real answer.",
        reasons: [
          isSpanish
            ? "Solo se recibió una imagen y no se pudo leer sin conexión."
            : "Only an image was received and it could not be read offline.",
        ],
        whatToDoNext: [
          isSpanish
            ? "Copie el texto del mensaje y péguelo en el verificador."
            : "Copy the text of the message and paste it into the checker.",
          HUMAN_REVIEW_STEP[language],
        ],
        isPaymentChangeOrWire: false,
      },
      model: MOCK_SCAM_MODEL,
      promptVersion: SCAM_PROMPT_VERSION,
      isMock: true,
      rawResponse: null,
    };
  }

  const isPaymentChangeOrWire = looksLikePaymentChangeOrWire(text);
  const urgencyHits = countMatches(text, URGENCY_PATTERNS);
  const credentialHits = countMatches(text, CREDENTIAL_PATTERNS);
  const secrecyHits = countMatches(text, SECRECY_PATTERNS);
  const hasLink = LINK_PATTERN.test(text);

  const reasons: string[] = [];
  if (urgencyHits > 0) {
    reasons.push(
      isSpanish
        ? "Presiona con urgencia o un plazo corto para que actúe sin pensarlo."
        : "It pressures you with urgency or a short deadline so you act without thinking.",
    );
  }
  if (credentialHits > 0) {
    reasons.push(
      isSpanish
        ? "Pide una contraseña, un código o que inicie sesión; las empresas reales no lo piden por mensaje."
        : "It asks for a password, a code, or a login; real businesses do not ask for these in a message.",
    );
  }
  if (secrecyHits > 0) {
    reasons.push(
      isSpanish
        ? "Le pide mantenerlo en secreto, lo cual evita que alguien más lo verifique."
        : "It asks you to keep it quiet, which stops anyone else from checking it.",
    );
  }
  if (hasLink) {
    reasons.push(
      isSpanish
        ? "Contiene un enlace. Los enlaces en mensajes inesperados suelen llevar a páginas falsas."
        : "It contains a link. Links in unexpected messages often lead to fake pages.",
    );
  }

  let riskLevel: ScamAnalysis["riskLevel"] = "low";
  if (isPaymentChangeOrWire || credentialHits > 0) riskLevel = "high";
  else if (reasons.length >= 2) riskLevel = "high";
  else if (reasons.length === 1) riskLevel = "medium";

  const summary =
    riskLevel === "low"
      ? isSpanish
        ? "La verificación sin conexión no encontró señales de alerta obvias. Eso no significa que sea genuino: confirme por otro canal antes de actuar."
        : "The offline check found no obvious red flags. That does not mean it is genuine: confirm through another channel before acting."
      : isSpanish
        ? "La verificación sin conexión encontró señales típicas de estafa. Trátelo como sospechoso hasta confirmarlo por otro canal."
        : "The offline check found signs typical of a scam. Treat it as suspicious until you confirm it through another channel.";

  const whatToDoNext: string[] = [];
  if (credentialHits > 0) {
    whatToDoNext.push(
      isSpanish
        ? "No comparta contraseñas ni códigos. Entre al sitio escribiendo la dirección usted mismo, nunca desde el enlace."
        : "Do not share passwords or codes. Go to the site by typing the address yourself, never from the link.",
    );
  }
  whatToDoNext.push(
    isSpanish
      ? "Confirme con el remitente por un canal que ya conocía (teléfono registrado o en persona)."
      : "Confirm with the sender through a channel you already knew (a phone number on file or in person).",
  );
  if (riskLevel !== "low") {
    whatToDoNext.push(
      isSpanish
        ? "Guarde el mensaje como está; no lo borre, puede servir como prueba."
        : "Keep the message as is; do not delete it, it may be needed as evidence.",
    );
  }

  return {
    analysis: { riskLevel, language, summary, reasons, whatToDoNext, isPaymentChangeOrWire },
    model: MOCK_SCAM_MODEL,
    promptVersion: SCAM_PROMPT_VERSION,
    isMock: true,
    rawResponse: null,
  };
}

function defaultAnalyzer(input: ScamAnalyzerInput): Promise<ScamCheckResult> {
  if (hasApiKey()) return checkScamWithAnthropic(input);
  return Promise.resolve(checkScamWithMock(input));
}

function cleanStringList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    cleaned.push(trimmed);
  }
  return cleaned;
}

function prependUnique(list: string[], ...items: string[]): string[] {
  const rest = list.filter((entry) => !items.includes(entry));
  return [...items, ...rest];
}

// Redacts and defangs the message, detects language and payment-change phrasing by rule, calls the
// chosen analyzer, then enforces the guidance the model is not trusted to keep: a payment-change
// or wire request is always high risk with the callback rule and escalation on top, and a message
// that tries to instruct the checker is always high risk.
export async function checkScam(
  input: ScamCheckInput,
  options: CheckScamOptions = {},
): Promise<CheckScamOutcome> {
  const trimmedText = input.text?.trim() ?? "";
  if (trimmedText.length === 0 && !input.image) {
    throw new ScamCheckInputError("Paste the message text or add a photo of it.");
  }

  const analyzer = options.analyzer ?? defaultAnalyzer;
  const detectedLanguage = detectScamLanguage(trimmedText || null);
  const injectionDetected = trimmedText.length > 0 && looksLikeInjection(trimmedText);
  const paymentChangeDetectedByRule = looksLikePaymentChangeOrWire(trimmedText || null);

  let redactedText: string | null = null;
  let redactedSecretCount = 0;
  if (trimmedText.length > 0) {
    const redaction = redactScamMessage(trimmedText);
    redactedText = redaction.text;
    redactedSecretCount = redaction.redactedCount;
  }

  const result = await analyzer({
    sourceKind: input.sourceKind,
    redactedText,
    image: input.image,
    detectedLanguage,
  });

  // The model may disagree with the rule on language; the rule wins so forced copy stays consistent
  // with the reader's language when the model is offline or wrong.
  const language = detectedLanguage;
  const analysis: ScamAnalysis = {
    ...result.analysis,
    language,
    reasons: cleanStringList(result.analysis.reasons),
    whatToDoNext: cleanStringList(result.analysis.whatToDoNext),
  };

  const isPaymentChangeOrWire = analysis.isPaymentChangeOrWire || paymentChangeDetectedByRule;
  if (isPaymentChangeOrWire) {
    analysis.isPaymentChangeOrWire = true;
    analysis.riskLevel = "high";
    analysis.reasons = prependUnique(analysis.reasons, PAYMENT_CHANGE_REASON[language]);
    analysis.whatToDoNext = prependUnique(
      analysis.whatToDoNext,
      PAYMENT_CALLBACK_RULE_STEP[language],
      ESCALATE_TO_KOITECC_STEP[language],
    );
  }

  if (injectionDetected) {
    analysis.riskLevel = "high";
    analysis.reasons = prependUnique(analysis.reasons, INJECTION_REASON[language]);
    if (!isPaymentChangeOrWire) {
      analysis.whatToDoNext = prependUnique(analysis.whatToDoNext, HUMAN_REVIEW_STEP[language]);
    }
  }

  return {
    analysis,
    model: result.model,
    promptVersion: result.promptVersion,
    isMock: result.isMock,
    rawResponse: result.rawResponse,
    redactedSecretCount,
    paymentChangeDetectedByRule,
    injectionDetected,
    detectedLanguage,
  };
}
