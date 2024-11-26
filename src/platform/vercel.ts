import { LogEvent } from '../logger';
// import { EndpointType } from '../shared';
import type Provider from './base';
import GenericConfig from './generic';

const sourceToken = process.env.NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN || process.env.LOGTAIL_SOURCE_TOKEN || '';
// const port = "6516";

export default class VercelConfig extends GenericConfig implements Provider {
  provider = 'vercel';
  shouldSendEdgeReport = true;
  region = process.env.VERCEL_REGION || undefined;
  environment = process.env.VERCEL_ENV || process.env.NODE_ENV;
  token = sourceToken;

  isEnvVarsSet (): boolean {
    return sourceToken != undefined && sourceToken != '';
  }

  // getIngestURL(t: EndpointType) {
  //   const url = new URL(this.logtailUrl);
  //   url.port = port;
  //   url.searchParams.set('source_token', this.token);
  //   return url.toString();
  // }

  wrapWebVitalsObject(metrics: any[]) {
    const time = new Date().getTime();
    return {
      dt: time,
      webVitals: metrics,
      environment: this.environment,
    };
  }

  injectPlatformMetadata(logEvent: LogEvent, source: string) {
    logEvent.vercel = {
      environment: this.environment,
      region: this.region,
      source: source,
    };
  }
}
