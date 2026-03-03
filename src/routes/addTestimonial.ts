import { error, IRequest, json } from 'itty-router';
import { maxLength, minLength, nonEmpty, object, pipe, safeParse, string } from 'valibot';
import { getTestimonialInfo, issuesToMessages, Testimonial } from '../common';
import { env } from 'cloudflare:workers';

const testimonialSchema = object({
   message: pipe(string(), nonEmpty()),
   guildId: pipe(string(), nonEmpty(), minLength(17), maxLength(20)),
   authorId: pipe(string(), nonEmpty(), minLength(17), maxLength(20))
});

export default async (request: IRequest) => {
    const body = await request.json().catch(() => null);
    const { issues, output, success } = safeParse(testimonialSchema, body);

    if (!success) return error(400, {
        error: true,
        messages: issuesToMessages<typeof testimonialSchema>(issues)
    });

    const info = await getTestimonialInfo(output);
    if (!info) return error(400, {
        error: true,
        messages: ['Failed to fetch associated information from the Discord API.']
    });

    const testimonial: Testimonial = {
        message: output.message,
        expiresAt: Date.now() + 259_200_000,
        guild: { id: output.guildId, ...info.guild },
        author: { id: output.authorId, ...info.author }
    };

    await env.testimonials.put(
        output.authorId,
        JSON.stringify(testimonial)
    );

    const url = new URL(request.url);
    url.pathname = '/testimonials';
    await caches.default.delete(url);

    return json({
        error: false,
        messages: [`Successfully set testimonial for user "${output.authorId}".`]
    }, { status: 201 });
};
