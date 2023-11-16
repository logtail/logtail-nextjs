import { log } from '@logtail/next'
import { GetStaticProps } from 'next'
import useSWR from 'swr'

export const getStaticProps: GetStaticProps =  async (context) => {
  log.debug('Log from Static Props getter', { context })
  return {
    props: { greeting: "Hello" },
  }
}

const fetcher = async (url: string) => {
  log.debug('Log from SWR fetcher function', { url });
  const res = await fetch(url);

  return await res.json();
}

export default function Home({ greeting }: { greeting: string }) {
  const { data, error } = useSWR('/api/hello', fetcher)

  if (error) {
    log.error("Failed to load", error)
    return <h1>Failed to load: {error.message}</h1>
  }
  if (data) {
    return <h1>{greeting}, {data.name}!</h1>
  }

  return <h1>Loading...</h1>
}
