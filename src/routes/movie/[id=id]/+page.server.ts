import type { PageServerLoad } from './$types';
import type * as TMDB from '$lib/types/tmdb';
import type { Movie } from '$lib/types';
import { getMovieDetailsFromCache } from '$lib/redis';
import { getMovieDetailsFromApi } from '$lib/api';

export const load: PageServerLoad = async function ({ params }) {
	const id = parseInt(params.id ?? '');
	const { movie, credits } = await getMovieDetailsFromCache(id);
	if (movie && credits) {
		return {
			movie: adaptResponse(movie, credits)
		};
	}

	const result = await getMovieDetailsFromApi(id);
	const { movie: apiMovie, credits: apiCredits } = result;

	return {
		movie: adaptResponse(apiMovie, apiCredits)
	};
};

function adaptResponse(movie: TMDB.Movie, credits: TMDB.MovieCreditsResponse): Movie {
	const { cast, crew } = credits;
	return {
		budget: movie.budget,
		cast: cast ? cast.map((c) => ({ name: c.name, role: c.character })) : [],
		crew: crew ? crew.map((c) => ({ name: c.name, role: c.job })) : [],
		genres: movie.genres.map((g) => g.name),
		id: movie.id,
		overview: movie.overview,
		poster_path: movie.poster_path,
		production_companies: movie.production_companies.map((c) => c.name),
		release_date: movie.release_date,
		revenue: movie.revenue,
		runtime: movie.runtime,
		tagline: movie.tagline,
		title: movie.title,
		imdb_id: movie.imdb_id,
		vote_average: movie.vote_average,
		vote_count: movie.vote_count
	};
}
