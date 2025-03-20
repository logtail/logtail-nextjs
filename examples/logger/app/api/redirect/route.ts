import { AxiomRequest, withAxiom } from '@logtail/next';
import { redirect } from 'next/navigation';

export const runtime = 'nodejs';


// test handling NEXT_REDIRECT error
export const GET = withAxiom(async (req: AxiomRequest) => {
    return redirect('/')
});
