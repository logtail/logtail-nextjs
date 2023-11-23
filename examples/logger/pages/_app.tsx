import { log } from '@logtail/next'
import { AppProps } from "next/app";
import Link from "next/link";

export { reportWebVitals } from '@logtail/next'

log.info('Initializing MyApp')

function MyApp({ Component, pageProps }: AppProps) {
  return <>
      <Component {...pageProps} />
      <hr />
      <ul>
          <li><Link href="/">Homepage</Link></li>
          <li><Link href="/serverSideProps">Server side props demo</Link></li>
      </ul>
  </>
}

export default MyApp
