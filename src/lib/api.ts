import { error } from '@sveltejs/kit';
import { TMDB_API_KEY } from '$env/static/private';

import { cacheMovieResponse } from '$lib/redis';

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
