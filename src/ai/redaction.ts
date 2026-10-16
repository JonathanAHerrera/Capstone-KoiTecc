// Scrubs secrets out of extracted text *before* it is sent to the model or stored in a raw
// response. This is a pragmatic regex pass, not a DLP engine: it targets the three identifiers a
// small-business owner is most likely to photograph by accident — SSNs, payment card numbers, and
// bank account/routing numbers. Image pixels are not OCR'd here; redacting text inside an image is
// tracked as a TODO below.

export type RedactionResult = {
  text: string;
  redactedCount: number;
};

const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
// 13-16 digit runs, optionally grouped by spaces or dashes (e.g. 4111 1111 1111 1111).
const CARD_PATTERN = /\b(?:\d[ -]?){13,16}\b/g;
const ROUTING_OR_ACCOUNT_PATTERN = /\b\d{8,17}\b/g;

function passesLuhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let value = digits.charCodeAt(index) - 48;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

export function redactSecrets(input: string): RedactionResult {
  let redactedCount = 0;
  const countAndReplace = (placeholder: string) => () => {
    redactedCount += 1;
    return placeholder;
  };

  let text = input.replace(SSN_PATTERN, countAndReplace("[REDACTED-SSN]"));

  text = text.replace(CARD_PATTERN, (match) => {
    const digits = match.replace(/[ -]/g, "");
    // Only treat it as a card when the digit count and Luhn checksum both fit; this keeps ordinary
    // long numbers (order ids, timestamps) from being over-redacted.
    if (digits.length >= 13 && digits.length <= 16 && passesLuhn(digits)) {
      redactedCount += 1;
      return "[REDACTED-CARD]";
    }
    return match;
  });

  text = text.replace(ROUTING_OR_ACCOUNT_PATTERN, countAndReplace("[REDACTED-ACCOUNT]"));

  return { text, redactedCount };
}

// TODO(image-redaction): we do not OCR image bytes, so secrets visible *inside* a photo or
// screenshot are not scrubbed here. The pipeline instead flags such files for human review via the
// model's possible_secret concern. Add OCR-based redaction before auto-accepting image evidence.
