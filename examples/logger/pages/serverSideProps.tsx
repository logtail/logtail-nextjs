import { withLogtailGetServerSideProps } from '@logtail/next';

export const getServerSideProps = withLogtailGetServerSideProps(async ({ req, log }) => {
  log.debug('Log from server side props getter');
  return {
    props: {
      method: req.method,
    },
  };
});

export default function Home({ method }: { method: string }) {
  return (
    <div>
      <h1>Hello from server, this is a {method} request.</h1>
        <form method="get" action="">
          <input type="submit" value="Make a GET request" />
        </form>
        <form method="post" action="">
          <input type="submit" value="Make a POST request" />
        </form>
    </div>
  );
}
