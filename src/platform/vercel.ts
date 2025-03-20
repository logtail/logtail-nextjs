import { LogEvent } from '../logger';
import type Provider from './base';
import GenericConfig from './generic';

export default class VercelConfig extends GenericConfig implements Provider {
  shouldSendEdgeReport = true;
  region = process.env.VERCEL_REGION || undefined;
  environment = process.env.VERCEL_ENV || process.env.NODE_ENV || '';

  wrapWebVitalsObject(metrics: any[]): any {
    return metrics.map(m => ({
      webVital: m,
      dt: new Date().getTime(),
      vercel: {
        environment: this.environment,
        source: 'web-vital',
        deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
        deploymentUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
        project: process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
        git: {
          commit: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
          repo: process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG,
          ref: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF,
        },
      },
    }))
  }

  injectPlatformMetadata(logEvent: LogEvent, source: string) {
    logEvent.vercel = {
      environment: this.environment,
      region: this.region,
      source: source,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
      deploymentUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
      project: process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
      git: {
        commit: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
        repo: process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG,
        ref: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF,
      },
    };
  }
}
