// @ts-check

/** @type {import('next').NextConfig} */
const { withLogtail } = require('@logtail/next');

const nextConfig = withLogtail({
  reactStrictMode: true,
})

module.exports = nextConfig
