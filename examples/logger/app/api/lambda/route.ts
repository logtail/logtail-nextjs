import { AxiomRequest, withAxiom } from '@logtail/next';

export const runtime = 'nodejs';

export const GET = withAxiom(async (req: AxiomRequest) => {
  req.log.info('lambda route');
  return new Response('Hello, Next.js!');
});
