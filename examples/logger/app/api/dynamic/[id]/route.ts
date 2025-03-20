import { AxiomRequest, withAxiom } from '@logtail/next';

export const runtime = 'edge';

export const POST = withAxiom(
  (req: AxiomRequest, { params }: { params: { id: string } }) => {
    req.log.info('dynamic route');
    return new Response(`Hello, Next.js! ${params.id}`);
  },
);
