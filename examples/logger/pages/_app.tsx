import { log } from 'next-logtail'
import {AppProps} from "next/app";

export { reportWebVitals } from 'next-logtail'

log.info('Hello from frontend', { foo: 'bar' })

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

export default MyApp
