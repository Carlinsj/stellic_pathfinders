import type { FastifyRequest } from 'fastify';

export class AuthenticationError extends Error {}

export async function authenticateRequest(
  request: FastifyRequest,
) {
  const authorization =
    request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    throw new AuthenticationError(
      'Missing bearer token',
    );
  }

  try {
    const payload =
      await request.jwtVerify<{
        sub: string;
        universityId: string;
        role: string;
        demo: boolean;
      }>();

    if (!payload.demo) {
      throw new Error('Not a demo token');
    }

    return {
      token: authorization.slice(7),

      user: {
        id: payload.sub,
        role: payload.role,
        universityId: payload.universityId,
      },
    };
  } catch {
    throw new AuthenticationError(
      'Invalid or expired access token',
    );
  }
}