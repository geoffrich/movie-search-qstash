import Redis from 'ioredis';
import { Client } from '@upstash/qstash';
import { REDIS_CONNECTION, QSTASH_TOKEN, CALLBACK_URL } from '$env/static/private';
import type * as TMDB from '$lib/types/tmdb';
import type { MovieDetails } from '$lib/types';

const redis = REDIS_CONNECTION ? new Redis(REDIS_CONNECTION) : new Redis();
const qstash = new Client({
	token: QSTASH_TOKEN
});

const MOVIE_IDS_KEY = 'movie_ids';

/** Return the key used to store movie details for a given ID in Redis */
function getMovieKey(id: number) {
	return `movie:${id}`;
}

function getExpiryKey(id: number) {
	return getMovieKey(id) + ':fresh';
}

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
		const [cached, didCacheExpire] = await Promise.all([
			redis.get(getMovieKey(id)),
			hasMovieCacheExpired(id)
		]);
		if (cached) {
			if (didCacheExpire) {
				console.log('Cache expired, sending update request');
				await sendUpdateRequest(id);
			}
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
		const movieKey = getMovieKey(id);
		const expiryKey = getExpiryKey(id);
		const pipeline = redis
			.multi()
			// store movie response
			.set(movieKey, JSON.stringify(cache))
			// this will track whether the data needs to be refreshed
			// set the last argument to a smaller value for easier testing
			.set(expiryKey, 'true', 'EX', 24 * 60 * 60);

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

async function sendUpdateRequest(id: number) {
	try {
		const res = await qstash.publishJSON({
			url: `${CALLBACK_URL}/api/refresh`,
			body: {
				id
			}
		});

		console.log('QStash response:', res);
	} catch (e) {
		console.log('Unable to call QStash', e);
	}
}
