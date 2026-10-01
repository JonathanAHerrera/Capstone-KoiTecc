const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatBytes(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "0 B";
  const unitIndex = Math.min(
    Math.floor(Math.log(sizeBytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const scaledValue = sizeBytes / 1024 ** unitIndex;
  const decimals = unitIndex === 0 ? 0 : scaledValue < 10 ? 1 : 0;
  return `${scaledValue.toFixed(decimals)} ${BYTE_UNITS[unitIndex]}`;
}

export function formatPercent(fraction: number, decimals = 0): string {
  if (!Number.isFinite(fraction)) return "0%";
  const clampedFraction = Math.min(Math.max(fraction, 0), 1);
  return `${(clampedFraction * 100).toFixed(decimals)}%`;
}
