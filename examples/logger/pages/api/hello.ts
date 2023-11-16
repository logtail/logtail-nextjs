// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiResponse } from 'next'
import { withLogtail, LogtailAPIRequest } from '@logtail/next'

async function handler(req: LogtailAPIRequest, res: NextApiResponse) {
  const names = [
    "Aulus Agerius",
    "Numerius Negidius",
    "John Doe",
    "Jane Doe",
    "Tommy Atkins",
    "Alice and Bob"
  ]
  const random = Math.floor(Math.random() * names.length)
  const name = names[random]

  req.log.debug('Log from API function', { url: req.url, name, random })

  res.status(200).json({ name })
}

export default withLogtail(handler)
