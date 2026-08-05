const configuredAppUrl = import.meta.env.PUBLIC_APP_URL?.trim();

export const APP_URL = (
	configuredAppUrl || (import.meta.env.DEV ? 'http://localhost:5173' : 'https://app.myvu.app')
).replace(/\/$/, '');

export const links = {
	app: APP_URL,
	guest: `${APP_URL}/discover?mediaType=movie`,
	register: `${APP_URL}/register`,
	login: `${APP_URL}/login`,
	discover: `${APP_URL}/discover`,
	start: `${APP_URL}/start`,
	privacy: `${APP_URL}/privacy`,
	terms: `${APP_URL}/terms`,
	contact: `${APP_URL}/contact`,
	attribution: `${APP_URL}/attribution`
};

export type CampaignHero = {
	id: string;
	mediaType: 'movie' | 'tv_show';
	tmdbId: number;
	title: string;
	year: number;
	byline: string;
	creditUrl: string;
};

export const campaignHeroes: CampaignHero[] = [
	{
		id: 'sunshine',
		mediaType: 'movie',
		tmdbId: 1272,
		title: 'Sunshine',
		year: 2007,
		byline: 'Danny Boyle',
		creditUrl: 'https://www.themoviedb.org/movie/1272-sunshine'
	},
	{
		id: 'parasite',
		mediaType: 'movie',
		tmdbId: 496243,
		title: 'Parasite',
		year: 2019,
		byline: 'Bong Joon Ho',
		creditUrl: 'https://www.themoviedb.org/movie/496243-parasite'
	},
	{
		id: 'grand-budapest',
		mediaType: 'movie',
		tmdbId: 120467,
		title: 'The Grand Budapest Hotel',
		year: 2014,
		byline: 'Wes Anderson',
		creditUrl: 'https://www.themoviedb.org/movie/120467-the-grand-budapest-hotel'
	},
	{
		id: 'severance',
		mediaType: 'tv_show',
		tmdbId: 95396,
		title: 'Severance',
		year: 2022,
		byline: 'Dan Erickson',
		creditUrl: 'https://www.themoviedb.org/tv/95396-severance'
	},
	{
		id: 'the-bear',
		mediaType: 'tv_show',
		tmdbId: 136315,
		title: 'The Bear',
		year: 2022,
		byline: 'Christopher Storer',
		creditUrl: 'https://www.themoviedb.org/tv/136315-the-bear'
	},
	{
		id: 'shogun',
		mediaType: 'tv_show',
		tmdbId: 126308,
		title: 'Shōgun',
		year: 2024,
		byline: 'Rachel Kondo & Justin Marks',
		creditUrl: 'https://www.themoviedb.org/tv/126308-shogun'
	}
];
