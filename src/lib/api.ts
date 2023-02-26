import { error } from '@sveltejs/kit';
import { TMDB_API_KEY } from '$env/static/private';

import { cacheMovieResponse } from '$lib/redis';
import type { SearchResponse } from '$lib/types/tmdb';
import { cacheMovieIds } from '$lib/redis';

const VOTE_THRESHOLD = 20;

export async function searchMovies(searchQuery: string, page: number) {
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

	return parsed;
}

export async function getMovieDetailsFromApi(id: number) {
	const [movieResponse, creditsResponse] = await Promise.all([getMovieDetails(id), getCredits(id)]);
	if (movieResponse.ok) {
		const movie = await movieResponse.json();
		const credits = await creditsResponse.json();
		await cacheMovieResponse(id, movie, credits);
		return {
			movie,
			credits
		};
	}

	console.log('Bad status from API', movieResponse.status);
	throw error(500, 'unable to retrieve movie details from API');
}

async function getMovieDetails(id: number) {
	return await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`);
}

async function getCredits(id: number) {
	return await fetch(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${TMDB_API_KEY}`);
}
