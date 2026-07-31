export const APP_URL = 'https://app.myvu.app';

export const links = {
	app: APP_URL,
	guest: APP_URL,
	register: `${APP_URL}/register`,
  login: `${APP_URL}/login`,
  discover: `${APP_URL}/discover`,
  privacy: `${APP_URL}/privacy`,
  terms: `${APP_URL}/terms`,
  contact: `${APP_URL}/contact`,
  attribution: `${APP_URL}/attribution`,
};

/**
 * Landing campaign — exactly three fixed titles for every visitor.
 *
 * Image files go in public/heroes/ with two sizes each:
 *   {id}-lg.jpg  → desktop (1280px wide, TMDB w1280)
 *   {id}-sm.jpg  → mobile  (780px wide,  TMDB w780)
 *
 * To add a new image:
 *  1. Download both sizes from TMDB:
 *     curl -o public/heroes/inception-lg.jpg "https://image.tmdb.org/t/p/w1280/{backdrop_path}"
 *     curl -o public/heroes/inception-sm.jpg "https://image.tmdb.org/t/p/w780/{backdrop_path}"
 *  2. Add an entry to this array.
 */
export type CampaignHero = {
	id: string;
	mediaType: 'movie' | 'tv_show';
	tmdbId: number;
	title: string;
	year: number;
	credit: string;
	creditUrl: string;
};

export const campaignHeroes: CampaignHero[] = [
	{
		id: 'sunshine',
		mediaType: 'movie',
		tmdbId: 1272,
		title: 'Sunshine',
		year: 2007,
		credit: 'Sunshine (2007)',
		creditUrl: 'https://www.themoviedb.org/movie/1272-sunshine',
	},
	{
		id: 'campaign-title-2',
		mediaType: 'movie',
		tmdbId: 0,
		title: 'Campaign title two',
		year: 2026,
		credit: 'Replace with approved campaign title',
		creditUrl: 'https://www.themoviedb.org/',
	},
	{
		id: 'campaign-title-3',
		mediaType: 'tv_show',
		tmdbId: 0,
		title: 'Campaign title three',
		year: 2026,
		credit: 'Replace with approved campaign title',
		creditUrl: 'https://www.themoviedb.org/',
	}
];
