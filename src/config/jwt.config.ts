import { registerAs } from '@nestjs/config';

type Duration = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}` | number;

export default registerAs('jwt', () => ({
  access: {
    secret: process.env.JWT_ACCESS_SECRET!,
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN! as Duration,
  },

  refresh: {
    secret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN! as Duration,
  },

  verification: {
    secret: process.env.JWT_VERIFICATION_SECRET!,
    expiresIn: process.env.JWT_VERIFICATION_EXPIRES_IN! as Duration,
  },

  issuer: process.env.JWT_ISSUER!,
  audience: process.env.JWT_AUDIENCE!,
}));

// config.access.secret
// config.refresh.secret
// config.verification.secret
// config.access.expiresIn
