import { GetServerSidePropsContext, NextApiRequest } from "next";
import { LogEvent, RequestReport } from "../logger";
import { EndpointType } from "../shared";
import type Provider from "./base";

const port = "6516";

// This is the generic config class for all platforms that doesn't have a special
// implementation (e.g: vercel, netlify). All config classes extends this one.
export default class GenericConfig implements Provider {
  proxyPath = '/_logtail';
  isBrowser = typeof window !== 'undefined';
  shouldSendEdgeReport = false;
  token = process.env.LOGTAIL_SOURCE_TOKEN;
  environment: string = process.env.NODE_ENV;
  logtailUrl = process.env.LOGTAIL_URL || 'https://in.logtail.com';
  region = process.env.REGION || undefined;

  isEnvVarsSet(): boolean {
    return !!(this.logtailUrl && process.env.LOGTAIL_SOURCE_TOKEN);
  }

  getIngestURL(_: EndpointType): string {
    return this.logtailUrl;
  }

  getProxyEndpoint(): string {
    if (this.token === undefined || this.token === "") {
      return ""
    }
    const url = new URL(this.logtailUrl);
    url.port = port;
    url.searchParams.set('source_token', this.token);
    return url.toString();
  }

  getLogsEndpoint(): string {
    return this.isBrowser ? this.proxyPath : this.getIngestURL(EndpointType.logs);
  }

  getWebVitalsEndpoint(): string {
    return this.isBrowser ? this.proxyPath : this.getIngestURL(EndpointType.webVitals);
  }

  wrapWebVitalsObject(metrics: any[]): any {
    const time = new Date().getTime();
    return metrics.map(m => ({
      webVital: m,
      dt: time,
      _time: time,
      platform: {
        environment: this.environment,
        source: 'web-vital',
      },
    }))
  }

  injectPlatformMetadata(logEvent: LogEvent, source: string) {
    logEvent.platform = {
      environment: this.environment,
      region: this.region,
      source: source + '-log',
    };
  }

  generateRequestMeta(req: NextApiRequest | GetServerSidePropsContext['req']): RequestReport {
    return {
      startTime: new Date().getTime(),
      path: req.url!,
      method: req.method!,
      host: this.getHeaderOrDefault(req, 'host', ''),
      userAgent: this.getHeaderOrDefault(req, 'user-agent', ''),
      scheme: 'https',
      ip: this.getHeaderOrDefault(req, 'x-forwarded-for', ''),
      region: this.region,
    };
  }

  getHeaderOrDefault(req: NextApiRequest | GetServerSidePropsContext['req'], headerName: string, defaultValue: any) {
    return req.headers[headerName] ? req.headers[headerName] : defaultValue;
  }
}
