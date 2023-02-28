import Redis from 'ioredis';
import { Client } from '@upstash/qstash';
import type * as TMDB from '$lib/types/tmdb';
import type { MovieDetails } from '$lib/types';
import { REDIS_CONNECTION, QSTASH_TOKEN, CALLBACK_URL } from '$env/static/private';

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

export async function getMovieDetailsFromCache(
	id: number
): Promise<MovieDetails | Record<string, never>> {
	try {
		const [cached, expiryKey] = await redis.mget(getMovieKey(id), getExpiryKey(id));

		if (cached) {
			if (expiryKey === null) {
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
		const expiryKey = getExpiryKey(id);
		await redis
			.multi()
			// store movie response
			.set(movieKey, JSON.stringify(cache))
			// this will track whether the data needs to be refreshed
			// set the last argument to a smaller value for easier testing
			.set(expiryKey, 'true', 'EX', DEFAULT_EXPIRY)
			.exec();
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
			url: new URL('/api/refresh', CALLBACK_URL).toString(),
			body: {
				id
			}
		});

		console.log('QStash response:', res);
	} catch (e) {
		console.log('Unable to call QStash', e);
	}
}
