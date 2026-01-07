import { Logger } from '@logtail/next';
import Link from 'next/link';
import styles from './rsc.module.css';

async function BetterStackLoggerPage() {
  const logger = new Logger();
  logger.info('RSC page visited', { 
    page: 'rsc',
    timestamp: new Date().toISOString(),
    renderType: 'server'
  });

  await logger.flush();

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <h1>🔧 React Server Component</h1>
        <p className={styles.description}>
          This page is rendered on the server using React Server Components.
          The logger instance is created server-side and logs are sent during server rendering.
        </p>
        
        <div className={styles.card}>
          <h3>✓ Server-side logging complete</h3>
          <p>Check your Better Stack dashboard to see the server-side log entry.</p>
        </div>

        <div className={styles.links}>
          <Link href="/" className={styles.link}>← Back to Home</Link>
          <Link href="/worker" className={styles.link}>Web Worker →</Link>
        </div>
      </div>
    </main>
  );
}

export default BetterStackLoggerPage;
