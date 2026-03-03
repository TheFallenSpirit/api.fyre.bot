import { env } from 'cloudflare:workers';
import { IRequest, json } from 'itty-router';
import { getTestimonialInfo, Testimonial, wait } from '../common';

export default async (request: IRequest, context: ExecutionContext) => {
    const cache = caches.default;
    const url = new URL(request.url);

    const cachedResponse = await cache.match(url);
    if (cachedResponse) return cachedResponse;

    const testimonials: Testimonial[] = [];
    const keyList = await env.testimonials.list();
    if (keyList.keys.length < 1) return json({ error: false, data: [] });

    const keys = keyList.keys.map(({ name }) => name);
    const rawTestimonials = await env.testimonials.get(keys, 'json');

    for (const testimonial of rawTestimonials.values()) {
        if (testimonial) testimonials.push(testimonial as Testimonial);
    };

    const now = Date.now();
    const expiredTestimonials = testimonials.filter(({ expiresAt }) => expiresAt >= now);

    if (expiredTestimonials.length > 0) {
        context.waitUntil(updateExpiredTestimonials(expiredTestimonials));
    };

    const cacheResponse = new Response(JSON.stringify(testimonials), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=10800' }
    });

    context.waitUntil(cache.put(url, cacheResponse));
    return json(testimonials);
};

async function updateExpiredTestimonials(testimonials: Testimonial[]) {
    const expiresAt = Date.now() + 259_200_000;

    for await (const oldTestimonial of testimonials) {
        const guildId = oldTestimonial.guild.id;
        const authorId = oldTestimonial.author.id;

        const info = await getTestimonialInfo({
            guildId,
            authorId
        });

        if (!info) {
            await wait(1000);
            continue;
        };

        const testimonial: Testimonial = {
            message: oldTestimonial.message,
            expiresAt,
            guild: { id: guildId, ...info.guild },
            author: { id: authorId, ...info.author }
        };

        await env.testimonials.put(
            authorId,
            JSON.stringify(testimonial)
        );
    };
};
