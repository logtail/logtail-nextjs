import { isBrowser } from '../config';
import { LogEvent } from '../logger';
import { EndpointType } from '../shared';
import type Provider from './base';
import GenericConfig from './generic';

export default class VercelConfig extends GenericConfig implements Provider {
  provider = 'vercel';
  shouldSendEdgeReport = true;
  region = process.env.VERCEL_REGION || undefined;
  environment = process.env.VERCEL_ENV || process.env.NODE_ENV || '';

  getWebVitalsEndpoint(): string {
    if (isBrowser && this.customEndpoint) {
      return this.customEndpoint
    }

    return `${this.proxyPath}/web-vitals`;
  }

  getLogsEndpoint(): string {
    if (isBrowser && this.customEndpoint) {
      return this.customEndpoint
    }

    return isBrowser ? `${this.proxyPath}/logs` : this.getIngestURL(EndpointType.logs);
  }

  wrapWebVitalsObject(metrics: any[]) {
    return {
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
