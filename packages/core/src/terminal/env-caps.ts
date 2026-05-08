export const caps = {
  color:   !process.env.NO_COLOR && process.env.TERM !== 'dumb',
  unicode: !process.env.NO_UNICODE && process.env.TERM !== 'dumb',
  motion:  !process.env.NO_MOTION && !process.env.CI,
  ci:      !!process.env.CI,
} as const;
