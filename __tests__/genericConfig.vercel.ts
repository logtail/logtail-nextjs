process.env.LOGTAIL_SOURCE_TOKEN = '';
process.env.LOGTAIL_URL = 'https://in.logtail.com';

import config from '../src/config';
import { EndpointType } from '../src/shared';

test('reading logtail ingest endpoint', () => {
  let url = config.getIngestURL(EndpointType.webVitals);
  expect(url).toEqual('https://in.logtail.com');

  url = config.getIngestURL(EndpointType.logs);
  expect(url).toEqual('https://in.logtail.com');
});
