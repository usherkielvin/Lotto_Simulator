const host = process.env.EXPO_PUBLIC_API_HOST ?? '192.168.137.1';
const port = process.env.EXPO_PUBLIC_API_PORT ?? '8099';

export const API_BASE = `http://${host}:${port}/api`;
