export type LandingHero = {
  id: string;
  mediaType: "movie" | "tv_show";
  tmdbId: number;
  title: string;
  year: string | number;
  byline: string;
  defaultScore: number;
  posterUrl: string;
  backdropUrl: string;
  creditUrl: string;
};
export function isLandingHeroes(value: unknown): value is LandingHero[] {
  if (!Array.isArray(value) || value.length !== 6) return false;
  return value.every(
    (h) =>
      h &&
      typeof h.id === "string" &&
      typeof h.title === "string" &&
      typeof h.byline === "string" &&
      ["string", "number"].includes(typeof h.year) &&
      ["movie", "tv_show"].includes(h.mediaType) &&
      Number.isInteger(h.tmdbId) &&
      h.tmdbId > 0 &&
      Number.isFinite(h.defaultScore) &&
      h.defaultScore >= 0 &&
      h.defaultScore <= 10 &&
      /^https:\/\/image\.tmdb\.org\/t\/p\/w500\/[A-Za-z0-9_.-]+$/.test(
        h.posterUrl,
      ) &&
      /^https:\/\/image\.tmdb\.org\/t\/p\/w1280\/[A-Za-z0-9_.-]+$/.test(
        h.backdropUrl,
      ) &&
      /^https:\/\/www\.themoviedb\.org\/(movie|tv)\/\d+$/.test(h.creditUrl),
  );
}
