import { cors, json, Router } from 'itty-router';
import getTestimonials from './routes/getTestimonials';
import addTestimonial from './routes/addTestimonial';
import removeTestimonial from './routes/removeTestimonial';
import { authMiddleware } from './common';

const { corsify, preflight } = cors({
	origin: '*'
});

const router = Router({
	before: [preflight],
	finally: [corsify]
});

router.get('/testimonials', getTestimonials);
router.post('/testimonials', authMiddleware, addTestimonial);
router.delete('/testimonials/:authorId', authMiddleware, removeTestimonial);

router.all('*', (request) => {
	const url = new URL(request.url)

	return json({
		error: true,
		messages: [`The specified path ${request.method}:${url.pathname} doesn't exist.`]
	});
})

export default { fetch };

async function fetch(request: Request, context: ExecutionContext) {
	return router.fetch(request, context);
};

export interface Env {
	apiToken: string;
	discordToken: string;
	testimonials: KVNamespace;
}
