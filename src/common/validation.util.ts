import { BadRequestException } from '@nestjs/common';

const MAX_LIMIT = 100;
const MAX_OFFSET = 10000;

/**
 * Parses and validates a numeric ID from route params.
 */
export function parseIdParam(id: string): number {
  const idNum = parseInt(id, 10);
  if (Number.isNaN(idNum) || idNum < 1) {
    throw new BadRequestException('Invalid ID');
  }
  return idNum;
}

/**
 * Parses limit from query, enforcing max value.
 */
export function parseLimit(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return undefined;
  return Math.min(n, MAX_LIMIT);
}

/**
 * Parses offset from query, enforcing max value.
 */
export function parseOffset(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) return undefined;
  return Math.min(n, MAX_OFFSET);
}
