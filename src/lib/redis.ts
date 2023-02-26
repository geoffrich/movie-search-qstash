import Redis from 'ioredis';
import { REDIS_CONNECTION } from '$env/static/private';
import type * as TMDB from '$lib/types/tmdb';
import type { MovieDetails } from '$lib/types';

const MOVIE_IDS_KEY = 'movie_ids';

/** Return the key used to store movie details for a given ID in Redis */
function getMovieKey(id: number): string {
	return `movie:${id}`;
}

const redis = REDIS_CONNECTION ? new Redis(REDIS_CONNECTION) : new Redis();

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
		// store movie response for 24 hours
		await redis.set(getMovieKey(id), JSON.stringify(cache), 'EX', 24 * 60 * 60);
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
