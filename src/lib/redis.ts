import Redis from 'ioredis';
import { REDIS_CONNECTION } from '$env/static/private';
import type * as TMDB from '$lib/types/tmdb';
import type { MovieDetails } from '$lib/types';

const MOVIE_IDS_KEY = 'movie_ids';

/** Return the key used to store movie details for a given ID in Redis */
function getMovieKey(id: number) {
	return `movie:${id}`;
}

function getExpiryKey(id: number) {
	return getMovieKey(id) + ':fresh';
}

const redis = REDIS_CONNECTION ? new Redis(REDIS_CONNECTION) : new Redis();

async function hasMovieCacheExpired(id: number) {
	const key = getExpiryKey(id);
	try {
		const result = await redis.get(key);
		return result === null;
	} catch (e) {
		console.log('Unable to retrieve', key, e);
	}
	return false;
}

export async function getMovieDetailsFromCache(
	id: number
): Promise<MovieDetails | Record<string, never>> {
	try {
		const cached = await redis.get(getMovieKey(id));
		if (cached) {
			const hasExpired = await hasMovieCacheExpired(id);
			const parsed: MovieDetails = JSON.parse(cached);
			console.log(`Found ${id} in cache`, hasExpired);
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
		const movieKey = getMovieKey(id);
		const expiryKey = getExpiryKey(id);
		const pipeline = redis
			.multi()
			// store movie response
			.set(movieKey, JSON.stringify(cache))
			// this will track whether the data needs to be refreshed
			// TODO: update to 24 * 60 * 60
			.set(expiryKey, 'true', 'EX', 20);

		await pipeline.exec();
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
