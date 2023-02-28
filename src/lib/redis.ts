import Redis from 'ioredis';
import type * as TMDB from '$lib/types/tmdb';
import type { MovieDetails } from '$lib/types';
import { REDIS_CONNECTION } from '$env/static/private';

const redis = REDIS_CONNECTION ? new Redis(REDIS_CONNECTION) : new Redis();

const MOVIE_IDS_KEY = 'movie_ids';

/** Return the key used to store movie details for a given ID in Redis */
function getMovieKey(id: number) {
	return `movie:${id}`;
}

export async function getMovieDetailsFromCache(
	id: number
): Promise<MovieDetails | Record<string, never>> {
	try {
		const cached = await redis.get(getMovieKey(id));

		if (cached) {
			const parsed: MovieDetails = JSON.parse(cached);
			console.log(`Found ${id} in cache`);
			return parsed;
		}
	} catch (e) {
		console.log('Unable to retrieve from cache', id, e);
	}
	return {};
}

const DEFAULT_EXPIRY = 24 * 60 * 60;

export async function cacheMovieResponse(
	id: number,
	movie: TMDB.Movie,
	credits: TMDB.MovieCreditsResponse
) {
	try {
		console.log(`Caching ${id}`);
		const cache: MovieDetails = {
			movie,
			credits
		};
		const movieKey = getMovieKey(id);
		await redis.set(movieKey, JSON.stringify(cache), 'EX', DEFAULT_EXPIRY);
	} catch (e) {
		console.log('Unable to cache', id, e);
	}
}

export async function getRandomMovieId() {
	return await redis.srandmember(MOVIE_IDS_KEY);
}

export async function cacheMovieIds(ids: number[]) {
	if (ids.length > 0) {
		try {
			await redis.sadd(MOVIE_IDS_KEY, ...ids);
		} catch (e) {
			console.log(e);
		}
	}
}
