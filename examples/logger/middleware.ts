import { NextResponse } from 'next/server'
import { LogtailRequest, withLogtail } from '@logtail/next'

async function middleware(req: LogtailRequest) {
  req.log.debug("Log from middleware");
  return NextResponse.next()
}

export default withLogtail(middleware)
