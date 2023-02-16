// @ts-check

/** @type {import('next').NextConfig} */
const { withLogtail } = require('next-logtail');

const nextConfig = withLogtail({
  reactStrictMode: true,
})

module.exports = nextConfig
