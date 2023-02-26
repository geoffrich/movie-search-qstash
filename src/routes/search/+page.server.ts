import type { PageServerLoad } from './$types';
import type { SearchResponse } from '$lib/types/tmdb';
import { cacheMovieIds } from '$lib/redis';
import { TMDB_API_KEY } from '$env/static/private';

const VOTE_THRESHOLD = 20;

export const load: PageServerLoad = async function ({ url, setHeaders }) {
	const searchQuery = url.searchParams.get('query');
	const page = url.searchParams.get('page') ?? 1;
	const response = await fetch(
		`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&page=${page}&include_adult=false&query=${searchQuery}`
	);
	const parsed: SearchResponse = await response.json();

	// filter out obscure movies
	const filteredMovies = parsed.results.filter((movie) => movie.vote_count >= VOTE_THRESHOLD);
	const removedMovies = parsed.results.filter((movie) => movie.vote_count < 20);
	console.log(
		'Filtered out:',
		removedMovies.map((m) => m.title)
	);

	await cacheMovieIds(filteredMovies.map((m) => m.id));

	setHeaders({
		'cache-control': 'max-age=300'
	});
	return {
		searchResponse: parsed
	};
};
