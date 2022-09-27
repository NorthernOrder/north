import 'dotenv/config';
import { z, ZodFormattedError } from 'zod';

export const schema = z.object({
  DATABASE_URL: z.string(),
  TOKEN: z.string(),
  CLIENT_ID: z.string(),
  PERMISSION_EVERYONE: z.string(),
  PERMISSION_STAFF: z.string(),
  PERMISSION_ADMIN: z.string(),
  PERMISSION_OWNER: z.string(),
});

const formatErrors = (errors: ZodFormattedError<Map<string, string>, string>) =>
  Object.entries(errors)
    .map(([name, value]) => {
      if (value && '_errors' in value)
        return `${name}: ${value._errors.join(', ')}\n`;
    })
    .filter(Boolean);

const _env = schema.safeParse(process.env);

if (_env.success === false) {
  console.error(
    'Invalid environment variables:\n',
    ...formatErrors(_env.error.format()),
  );
  throw new Error('Invalid environment variables');
}

export const env = { ..._env.data };
