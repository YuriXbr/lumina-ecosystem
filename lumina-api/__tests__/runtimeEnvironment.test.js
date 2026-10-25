'use strict';
const path = require('node:path');
jest.mock('@dotenvx/dotenvx', () => ({ config: jest.fn() }));
const dotenv = require('@dotenvx/dotenvx');
const originalEnvironment = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnvironment, MONGODB_URI: 'mongodb://127.0.0.1/isolated-config-test' };
  delete process.env.VERCEL;
  dotenv.config.mockClear();
});
afterEach(() => { process.env = { ...originalEnvironment }; });

test.each(['production', 'development'])('loads the API-local environment for %s even when cwd points elsewhere', environment => {
  process.env.NODE_ENV = environment;
  jest.spyOn(process, 'cwd').mockReturnValue(path.parse(__dirname).root);
  jest.isolateModules(() => require('../src/config/runtime'));
  expect(dotenv.config).toHaveBeenCalledWith({ path: path.resolve(__dirname, '..', environment === 'production' ? '.env' : '.env.dev'), quiet: true });
});

test.each(['test', 'vercel'])('never loads a local secret file under %s', target => {
  process.env.NODE_ENV = target === 'test' ? 'test' : 'production';
  if (target === 'vercel') process.env.VERCEL = '1';
  jest.isolateModules(() => require('../src/config/runtime'));
  expect(dotenv.config).not.toHaveBeenCalled();
});

test('missing required secrets fail before startup without echoing other env values', () => {
  process.env.NODE_ENV = 'production';
  process.env.VERCEL = '1';
  delete process.env.OAUTH_STATE_SECRET;
  expect(() => jest.isolateModules(() => require('../src/config/runtime'))).toThrow('Missing required configuration: OAUTH_STATE_SECRET');
});
