import { env } from 'cloudflare:workers';
import { error, IRequest, json } from 'itty-router';
import { clearCache } from '../common';

export default async (request: IRequest) => {
    const authorId = request.params.authorId;
    const testimonial = await env.testimonials.get(authorId, 'json');

    if (!testimonial) return error(400, {
        error: true,
        messages: [`There are no testimonials by author "${authorId}".`]
    });

    await env.testimonials.delete(authorId);
    await clearCache(request);

    return json({
        error: false,
        data: []
    });
};
