/**
 * Converts a normalized metric value (0-1) to an HSL color string.
 * 0 = Green (healthy), 1 = Red (hot/problematic).
 */
export function metricToHSL(value: number): string {
    // Clamp value between 0 and 1
    const clampedValue = Math.max(0, Math.min(1, value));
    // Hue: 120 (green) to 0 (red)
    const hue = 120 - clampedValue * 120;
    return `hsl(${hue}, 75%, 45%)`;
}

/**
 * Returns a CSS class suffix based on the metric severity.
 */
export function metricToSeverity(value: number): "low" | "medium" | "high" {
    if (value < 0.33) return "low";
    if (value < 0.66) return "medium";
    return "high";
}
