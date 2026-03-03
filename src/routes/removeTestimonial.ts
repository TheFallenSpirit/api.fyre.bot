import { env } from 'cloudflare:workers';
import { error, IRequest, json } from 'itty-router';

export default async (request: IRequest) => {
    const authorId = request.params.authorId;
    const testimonial = await env.testimonials.get(authorId, 'json');

    if (!testimonial) return error(400, {
        error: true,
        messages: [`There are no testimonials by author "${authorId}".`]
    });

    await env.testimonials.delete(authorId);
    const url = new URL(request.url);
    url.pathname = '/testimonials';
    await caches.default.delete(url);

    return json({
        error: false,
        data: []
    });
};
