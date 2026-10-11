const colors = ["#2f5d46", "#3e6a7a", "#6b4f3a", "#5a4d73", "#3f5d3a", "#8a6232", "#7a4e3a", "#2f6b62"];

export function avatarColor(userId: string) {
  let hash = 0;
  for (const char of userId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return colors[hash % colors.length] ?? colors[0];
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  if (parts.length < 2) {
    return first.toLocaleUpperCase("en");
  }

  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toLocaleUpperCase("en");
}
