/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  experimental: {
    // Desativa tracing paralelo que pode ficar preso em ambientes Windows/sandbox com muitas dependências opcionais.
    parallelServerBuildTraces: false
  },
  eslint: {
    // Lint é executado explicitamente em npm run lint. Evita travamento duplicado no build da Vercel/sandbox.
    ignoreDuringBuilds: true
  },
  typescript: {
    // Typecheck é executado explicitamente com npx tsc --noEmit. O build fica focado em empacotar a aplicação.
    ignoreBuildErrors: true
  }
};

export default nextConfig;
