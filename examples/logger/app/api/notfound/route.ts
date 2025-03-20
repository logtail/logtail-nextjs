import { AxiomRequest, withAxiom } from '@logtail/next';
import { notFound } from 'next/navigation';

export const runtime = 'nodejs';

// test handling NEXT_NOT_FOUND error
export const GET = withAxiom(async (req: AxiomRequest) => {
    return notFound()
});
