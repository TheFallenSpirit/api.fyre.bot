import { env } from 'cloudflare:workers';
import { error, IRequest } from 'itty-router';
import { BaseIssue, BaseSchema, flatten, InferIssue} from 'valibot';

export function issuesToMessages<T extends Schema>(issues: [InferIssue<T>, ...InferIssue<T>[]]): string[] {
    const issueMessages: string[] = [];
    const flattenedIssues = flatten<T>(issues);

    const nestedErrors = Object.values(flattenedIssues.nested ?? {}) as string[][];
    issueMessages.push(...(nestedErrors.flat()), ...(flattenedIssues.root ?? []));

    return issueMessages;
};

export function wait(time: number): Promise<unknown> {
	return new Promise((resolve) => setTimeout(resolve, time));
};

export async function getTestimonialInfo(raw: Omit<RawTestimonial, 'message'>): Promise<TestimonialInfo | undefined> {
    const discordHeaders = {
        'Authorization': `Bot ${env.discordToken}`
    };

	const userInfoRequest = await fetch(`https://discord.com/api/v10/users/${raw.authorId}`, {
		headers: discordHeaders
	}).catch(() => {});

    if (!userInfoRequest?.ok) return;
    const userInfo = await userInfoRequest.json() as any;

    const guildInfoRequest = await fetch(`https://discord.com/api/v10/guilds/${raw.guildId}`, {
        headers: discordHeaders
    }).catch(() => {});

    if (!guildInfoRequest?.ok) return;
    const guildInfo = await guildInfoRequest.json() as any;

    return {
        guild: {
            name: guildInfo.name,
            iconUrl: `https://cdn.discordapp.com/icons/${raw.guildId}/${guildInfo.icon}.webp`
        },
        author: {
            name: userInfo.global_name ?? userInfo.username,
            avatarUrl: `https://cdn.discordapp.com/avatars/${raw.authorId}/${userInfo.avatar}.webp`
        }
    };
};

export function authMiddleware(request: IRequest) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return error(401, {
        error: true,
        messages: [`The required "Authorization" header wasn't provided.`]
    });

    if (authHeader !== env.apiToken) return error(401, {
        error: true,
        messages: [`The provided "Authorization" header isn't a valid auth token.`]
    });
};

type Schema = BaseSchema<unknown, unknown, BaseIssue<unknown>>;

interface TestimonialInfo {
    guild: {
        name: string;
        iconUrl: string;
    };
    author: {
        name: string;
        avatarUrl: string;
    };
}

export interface RawTestimonial {
    message: string;
    guildId: string;
    authorId: string;
}

export interface Testimonial {
    message: string;
    expiresAt: number;
    guild: {
        id: string;
        name: string;
        iconUrl: string;
    };
    author: {
        id: string;
        name: string;
        avatarUrl: string;
    };
}
