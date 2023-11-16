This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, install dependencies:
```bash
npm install
# or
yarn install
```

Then, run the development server with `LOGTAIL_SOURCE_TOKEN` environment variable (replace `yoursourcetoken` by your actual source token):

```bash
LOGTAIL_SOURCE_TOKEN=<source-token> npm run dev
# or
LOGTAIL_SOURCE_TOKEN=<source-token> yarn dev
```

_Don't forget to replace with your actual source token which you can find by going to logs.betterstack.com -> sources -> edit._

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying files in `pages/`.
The pages auto-update as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [/api/hello](http://localhost:3000/api/hello) and [/api/edge](http://localhost:3000/api/edge).
These endpoints can be edited in `pages/api/`.

## Troubleshooting

If you are using port 3000 for some other application, you can use a different port by running e.g.:

```bash
LOGTAIL_SOURCE_TOKEN=<source-token> PORT=3001 npm run dev
# or
LOGTAIL_SOURCE_TOKEN=<source-token> PORT=3001 yarn dev
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
