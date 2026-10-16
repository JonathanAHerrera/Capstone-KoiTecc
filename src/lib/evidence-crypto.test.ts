import { describe, expect, test } from "vitest";
import {
  assertContentMatchesClaimedType,
  stripLocationMetadata,
} from "@/lib/evidence-content";
import { decryptEvidenceBytes, encryptEvidenceBytes } from "@/lib/evidence-crypto";

describe("evidence encryption", () => {
  test("round-trips arbitrary bytes and does not store plaintext", () => {
    const plaintext = Buffer.from("sensitive evidence contents \u{1F6E1}", "utf8");
    const blob = encryptEvidenceBytes(plaintext);
    expect(blob.equals(plaintext)).toBe(false);
    expect(blob.includes(plaintext)).toBe(false);
    expect(decryptEvidenceBytes(blob).equals(plaintext)).toBe(true);
  });

  test("uses a fresh IV so identical inputs produce different ciphertext", () => {
    const plaintext = Buffer.from("same input");
    const first = encryptEvidenceBytes(plaintext);
    const second = encryptEvidenceBytes(plaintext);
    expect(first.equals(second)).toBe(false);
  });

  test("rejects a tampered blob via the GCM auth tag", () => {
    const blob = encryptEvidenceBytes(Buffer.from("authenticated"));
    blob[blob.byteLength - 1] ^= 0xff;
    expect(() => decryptEvidenceBytes(blob)).toThrow();
  });
});

describe("content type validation", () => {
  test("accepts a real PNG declared as image/png", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(() => assertContentMatchesClaimedType(png, "image/png")).not.toThrow();
  });

  test("rejects a non-image masquerading as image/png", () => {
    const notPng = Buffer.from("#!/bin/sh\nrm -rf /\n");
    expect(() => assertContentMatchesClaimedType(notPng, "image/png")).toThrow();
  });

  test("lets unsniffable text types pass", () => {
    const text = Buffer.from("just some notes");
    expect(() => assertContentMatchesClaimedType(text, "text/plain")).not.toThrow();
  });
});

describe("image metadata stripping", () => {
  test("drops a JPEG APP1 (Exif) segment while keeping image data", () => {
    const soi = Buffer.from([0xff, 0xd8]);
    const exifPayload = Buffer.from("Exif\x00\x00GPSDATA-secret-location");
    const app1Length = Buffer.alloc(2);
    app1Length.writeUInt16BE(exifPayload.byteLength + 2);
    const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), app1Length, exifPayload]);
    // Minimal Start-of-Scan + trailing data + End-of-Image so the walker copies the remainder.
    const sos = Buffer.from([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]);
    const jpeg = Buffer.concat([soi, app1, sos]);

    const stripped = stripLocationMetadata(jpeg, "image/jpeg");
    expect(stripped.includes(Buffer.from("GPSDATA-secret-location"))).toBe(false);
    expect(stripped.subarray(0, 2).equals(soi)).toBe(true);
    expect(stripped.includes(sos)).toBe(true);
  });
});
