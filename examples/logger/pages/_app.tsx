import { log } from '@logtail/next'
import { AppProps } from "next/app";

export { reportWebVitals } from '@logtail/next'

log.info('Initializing MyApp')

function MyApp({ Component, pageProps }: AppProps) {
  return <>
      <Component {...pageProps} />
      <hr />
      <ul>
          <li><a href="/">Homepage</a></li>
          <li><a href="/serverSideProps">Server side props demo</a></li>
      </ul>
  </>
}

export default MyApp
