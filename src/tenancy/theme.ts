export function relativeLuminance(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(normalized)) return 0;
  const channels = normalized.match(/.{2}/g)!.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

export function contrastRatio(foreground: string, background: string) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function validateThemeColours(primaryColour: string, secondaryColour: string) {
  const primaryOnWhite = contrastRatio(primaryColour, "#FFFFFF");
  const secondaryOnWhite = contrastRatio(secondaryColour, "#FFFFFF");
  return {
    valid: primaryOnWhite >= 4.5 && secondaryOnWhite >= 4.5,
    primaryOnWhite,
    secondaryOnWhite,
    recommendation: "#243B53",
  };
}
