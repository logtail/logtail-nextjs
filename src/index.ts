export { log, Logger, LogLevel, type LoggerConfig, type RequestReport } from './logger';
export { EndpointType, throttle } from './shared';
export * from './platform/base';
export * from './config';
export {
  withBetterStack,
  type BetterStackRequest,
  withBetterStackNextConfig,
  withBetterStackRouteHandler,
  withBetterStack as withLogtail,
  type BetterStackRequest as LogtailRequest,
  withBetterStackNextConfig as withLogtailNextConfig,
  withBetterStackRouteHandler as withLogtailRouteHandler,
} from './withBetterStack';
// BetterStackWebVitals and useLogger not exported to avoid client-side imports during server builds
