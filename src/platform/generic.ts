import { GetServerSidePropsContext, NextApiRequest } from "next";
import { LogEvent } from "../logger";
import { EndpointType } from "../shared";
import type Provider from "./base";
import { isBrowser, isVercel } from "../config";

// This is the generic config class for all platforms that doesn't have a special
// implementation (e.g: vercel, netlify). All config classes extends this one.
export default class GenericConfig implements Provider {
  proxyPath = '/_betterstack';
  shouldSendEdgeReport = false;
  token = process.env.NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN || process.env.BETTER_STACK_SOURCE_TOKEN || process.env.NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN || process.env.LOGTAIL_SOURCE_TOKEN;
  environment: string = process.env.NODE_ENV;
  ingestingUrl = process.env.NEXT_PUBLIC_BETTER_STACK_INGESTING_URL || process.env.BETTER_STACK_INGESTING_URL || process.env.NEXT_PUBLIC_LOGTAIL_URL || process.env.LOGTAIL_URL;
  region = process.env.REGION || undefined;
  customEndpoint: string | undefined = process.env.NEXT_PUBLIC_BETTER_STACK_CUSTOM_ENDPOINT;

  isEnvVarsSet(): boolean {
    return !!(this.ingestingUrl && this.token) || !!this.customEndpoint;
  }

  getIngestURL(_: EndpointType): string {
    return `${this.ingestingUrl}`;
  }

  getLogsEndpoint(): string {
    if (isBrowser && this.customEndpoint) {
      return this.customEndpoint
    }

    return isBrowser ? `${this.proxyPath}/logs` : this.getIngestURL(EndpointType.logs);
  }

  getWebVitalsEndpoint(): string {
    if (isBrowser && this.customEndpoint) {
      return this.customEndpoint
    }

    return isBrowser ? `${this.proxyPath}/web-vitals` : this.getIngestURL(EndpointType.webVitals);
  }

  wrapWebVitalsObject(metrics: any[]): any {
    return metrics.map(m => ({
      webVital: m,
      _time: new Date().getTime(),
      platform: {
        environment: this.environment,
        source: 'web-vital',
      },
      source: 'web-vital'
    }))
  }

  injectPlatformMetadata(logEvent: LogEvent, source: string) {
    let key: "platform" | "vercel" | "netlify" = "platform"
    if (isVercel) {
      key = "vercel"
    }

    logEvent.source = source;
    logEvent[key] = {
      environment: this.environment,
      region: this.region,
      source: source,
    };

    if (isVercel) {
      logEvent[key]!.region = process.env.VERCEL_REGION;
      logEvent[key]!.deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
      logEvent[key]!.deploymentUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
      logEvent[key]!.project = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
      logEvent.git = {
        commit: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
        repo: process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG,
        ref: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF,
      }
    }
  }

  getHeaderOrDefault(req: NextApiRequest | GetServerSidePropsContext['req'], headerName: string, defaultValue: any) {
    return req.headers[headerName] ? req.headers[headerName] : defaultValue;
  }
}
