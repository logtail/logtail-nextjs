// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiResponse } from 'next'
import { withLogtail, LogtailAPIRequest } from 'next-logtail'

async function handler(req: LogtailAPIRequest, res: NextApiResponse) {
  req.log.info('Hello from function', { url: req.url });
  res.status(200).json({ name: 'John Doe' })
}

export default withLogtail(handler)
