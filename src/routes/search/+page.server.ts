import type { PageServerLoad } from './$types';
import { searchMovies } from '$lib/api';

export const load: PageServerLoad = async function ({ url, setHeaders }) {
	const searchQuery = url.searchParams.get('query') ?? '';
	const page = url.searchParams.get('page') ?? 1;
	const searchResponse = await searchMovies(searchQuery, Number(page));

	setHeaders({
		'cache-control': 'max-age=300'
	});
	return {
		searchResponse
	};
};
