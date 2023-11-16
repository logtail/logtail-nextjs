// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { withLogtail, LogtailRequest } from '@logtail/next'

export const config = {
    runtime: 'experimental-edge',
};

function handler(req: LogtailRequest) {
    req.log.debug("Log from edge runtime API function", { req })

    return new Response(
        JSON.stringify({
            message: 'Hello, world!',
        }),
        {
            status: 200,
            headers: {
                'content-type': 'application/json',
            },
        }
    )
}


export default withLogtail(handler);
