import { withLogtailGetServerSideProps } from 'next-logtail';

export const getServerSideProps = withLogtailGetServerSideProps(async ({ req, log }) => {
  log.info('Hello from server side');
  return {
    props: {
      method: req.method,
    },
  };
});

export default function Home({ method }: { method: string }) {
  return (
    <div>
      <h1>Hello from server, this is a {method} request</h1>
    </div>
  );
}
