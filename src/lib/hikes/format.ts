const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatHikeDate(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  const monthName = MONTHS[Number(month) - 1] ?? month;
  return `${Number(day)} ${monthName} ${year}`;
}

export function formatCardDate(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = WEEKDAYS[date.getUTCDay()] ?? "";
  const monthName = MONTHS[month - 1] ?? "";
  return `${weekday} ${day} ${monthName}`;
}

export function currentCalendarYear() {
  return String(new Date().getFullYear());
}

export function firstName(name: string) {
  const token = name.trim().split(/\s+/)[0];
  return token || name;
}

export function companionLabel(names: string[]) {
  if (names.length === 0) {
    return null;
  }

  if (names.length === 1) {
    return firstName(names[0] ?? "");
  }

  return `${firstName(names[0] ?? "")} + ${names.length - 1}`;
}

export function countLabel(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

export function deleteHikeCopy(photoCount: number, ratingCount: number, commentCount: number) {
  return `The hike, its ${countLabel(photoCount, "photo")}, ${countLabel(ratingCount, "rating")} and ${countLabel(commentCount, "comment")} will be gone for the whole group. This can't be undone.`;
}

export function formatDistance(km: number | null) {
  if (km === null) {
    return null;
  }

  const text = km.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${text} km`;
}

export function formatDifficulty(value: string | null) {
  if (value === "easy") return "Easy";
  if (value === "moderate") return "Moderate";
  if (value === "hard") return "Hard";
  return null;
}

export function formatRating(average: number | null, count: number) {
  if (average === null || count < 1) {
    return "No ratings";
  }

  const label = count === 1 ? "rating" : "ratings";
  return `${average.toFixed(1)} · ${count} ${label}`;
}

export function mapSearchUrl(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function trailLink(url: string | null) {
  if (!url || !url.startsWith("https://")) {
    return null;
  }

  return url;
}
