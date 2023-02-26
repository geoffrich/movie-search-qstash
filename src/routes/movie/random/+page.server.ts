import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRandomMovieId } from '$lib/redis';

export const load: PageServerLoad = async function () {
	const randomId = await getRandomMovieId();
	throw redirect(303, `/movie/${randomId}`);
};
