# Better Stack Next.js Logger Example

This example demonstrates how to integrate Better Stack logging into a Next.js application.

## Setup

### Environment Variables

Copy `.env-example` to `.env` and fill in your Better Stack credentials:

```bash
cp .env-example .env
```

Then edit `.env`:

```bash
# Your Better Stack source token
NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN="your_source_token_here"

# Your Better Stack ingesting URL
NEXT_PUBLIC_BETTER_STACK_INGESTING_URL="https://your-cluster.betterstackdata.com"

# Log level (optional - debug/info/warn/error/off)
NEXT_PUBLIC_BETTER_STACK_LOG_LEVEL="info"
```

You can create your source in  Better Stack -> Telemetry -> [Sources](https://telemetry.betterstack.com/team/0/sources).

### Run the Example

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the demo.

Click the buttons to generate logs and see them appear in your Better Stack dashboard in real-time.

## Need Help?

- Check the [Better Stack Next.js documentation](https://betterstack.com/docs/logs/javascript/nextjs/)
- Visit the [Better Stack dashboard](https://telemetry.betterstack.com/team/0/tail) to view your logs
