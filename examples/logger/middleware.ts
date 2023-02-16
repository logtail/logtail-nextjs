import {NextFetchEvent, NextResponse} from 'next/server'
import {LogtailRequest, log, withLogtail} from 'next-logtail'

async function middleware(req: LogtailRequest, ev: NextFetchEvent) {
  req.log.info("Hello from middleware", { 'bar': 'baz' });
  return NextResponse.next()
}

export default withLogtail(middleware)
