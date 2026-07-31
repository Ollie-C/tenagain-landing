/**
 * This is intentionally mirrored from the app frontend for v1.
 * The landing page stays deployable on its own without depending on another package's source files.
 */
export const communitySpotlight = {
  headline: 'Community spotlight',
  subcopy:
    'Browse one featured ranker, one public list, and a wider directory of community rankings before you sign up.',
  featuredRankerUsername: null,
  featuredRankingListId: null,
} satisfies {
  headline: string;
  subcopy: string;
  featuredRankerUsername: string | null;
  featuredRankingListId: string | null;
};
