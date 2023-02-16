import { Logger, withLogtail } from '../src/index';
import { withLogtailGetServerSideProps, withLogtailNextServerSidePropsHandler } from '../src/withLogtail';
import { GetServerSideProps, GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next';
import 'whatwg-fetch';
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';

test('withLogtail(NextConfig)', async () => {
  const config = withLogtail({
    reactStrictMode: true,
  });
  expect(config).toBeInstanceOf(Object);
});

test('withLogtail(NextApiHandler)', async () => {
  const handler = withLogtail((_req: NextApiRequest, res: NextApiResponse) => {
    res.status(200).end();
  });
  expect(handler).toBeInstanceOf(Function);
});

test('withLogtailNextServerSidePropsHandler', async () => {
  const handler = withLogtailNextServerSidePropsHandler(async (context) => {
    expect(context.log).toBeInstanceOf(Logger);
    return {
      props: {},
    };
  });
  expect(handler).toBeInstanceOf(Function);
});

test('withLogtail(NextMiddleware)', async () => {
  process.env.LAMBDA_TASK_ROOT = 'lol'; // shhh this is AWS Lambda, I promise
  const handler = withLogtail((_req: NextRequest, _ev: NextFetchEvent) => {
    return NextResponse.next();
  });
  expect(handler).toBeInstanceOf(Function);
  // TODO: Make sure we don't have a NextApiHandler
});

test('withLogtail(NextConfig) with fallback rewrites (regression test for #21)', async () => {
  process.env.LOGTAIL_SOURCE_TOKEN = 'http://localhost';

  const rewrites = async () => {
    return {
      fallback: [
        {
          source: '/:bar',
          destination: '/foo/:bar',
        },
      ],
    };
  };

  const config = withLogtail({
    rewrites: rewrites as any,
  });
  if (config.rewrites) await config.rewrites();
});

test('withLogtail(GetServerSideProps)', async () => {
  const getServerSideProps: GetServerSideProps = async (context: GetServerSidePropsContext) => {
    return {
      props: {},
    };
  };
  const handler = withLogtailGetServerSideProps(getServerSideProps);
  expect(handler).toBeInstanceOf(Function);
  // TODO: Make sure we have a LogtailGetServerSideProps
});
