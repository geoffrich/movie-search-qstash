import type { RequestHandler } from './$types';
import { Receiver } from '@upstash/qstash';
import { QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY } from '$env/static/private';
import { getMovieDetailsFromApi } from '$lib/api';

const receiver = new Receiver({
	currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
	nextSigningKey: QSTASH_NEXT_SIGNING_KEY
});

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	const isValid = await receiver.verify({
		signature: request.headers.get('Upstash-Signature') ?? '',
		body
	});

	if (!isValid) {
		console.log('Invalid request:', body);
		return new Response(null, { status: 400 });
	}

	// normally we would use .json(), but we've already consumed the request for the verification
	const { id } = JSON.parse(body);
	console.log('Received update request for', id);

	// this will automatically cache the response
	await getMovieDetailsFromApi(id);
	return new Response();
};
