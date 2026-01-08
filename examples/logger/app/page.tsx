'use client';

import styles from './page.module.css';
import Link from 'next/link';
import { useLogger } from '@logtail/next/hooks';
import { useEffect } from 'react';

function Home() {
  const logger = useLogger();

  // Next.js best practice: avoid side-effects during render.
  useEffect(() => {
    logger.info('Page loaded', { page: 'home' });
  }, [logger]);

  const logInfo = () => {
    logger.info('Info log from button click', {
      action: 'button_click',
      button: 'info',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  };

  const logDebug = () => {
    logger.debug('Debug log from button click', {
      action: 'button_click',
      button: 'debug',
      debugInfo: {
        memory: (performance as any).memory
          ? {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            }
          : 'unavailable',
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        connection: (navigator as any).connection
          ? {
              effectiveType: (navigator as any).connection.effectiveType,
              downlink: (navigator as any).connection.downlink,
            }
          : 'unavailable',
      },
      timestamp: new Date().toISOString(),
    });
  };

  const logError = () => {
    logger.error('Error log from button click', {
      action: 'button_click',
      button: 'error',
      error: 'Simulated error for demo',
      stack: new Error('Demo error').stack,
      timestamp: new Date().toISOString(),
    });
  };

  const logWithContext = () => {
    const userContext = {
      userId: 'demo-user-123',
      sessionId: 'session-' + Date.now(),
      preferences: { theme: 'dark', language: 'en' },
    };

    logger.info('Complex log with user context', {
      action: 'context_demo',
      context: userContext,
      metadata: {
        source: 'demo_app',
        version: '1.0.0',
        environment: 'development',
      },
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Better Stack Next.js Demo</h1>
        <p className={styles.subtitle}>
          Send a log and verify it shows up in{' '}
          <Link
            href="https://telemetry.betterstack.com/team/0/tail"
            target="_blank"
            rel="noopener noreferrer"
          >
            Better Stack
          </Link>
          .
        </p>
      </header>

      <section className={styles.grid} aria-label="Examples">
        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Info log</h2>
          <p className={styles.cardBody}>
            Send a basic structured log from the browser.
          </p>
          <div className={styles.buttonRow}>
            <button type="button" onClick={logInfo} className={styles.button}>
              Send info
            </button>
          </div>
        </article>

        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Error log</h2>
          <p className={styles.cardBody}>
            Send an error log including a stack trace.
          </p>
          <div className={styles.buttonRow}>
            <button
              type="button"
              onClick={logError}
              className={`${styles.button} ${styles.danger}`}
            >
              Send error
            </button>
          </div>
        </article>

        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Structured context</h2>
          <p className={styles.cardBody}>
            Send a richer log with a nested context object.
          </p>
          <div className={styles.buttonRow}>
            <button
              type="button"
              onClick={logWithContext}
              className={`${styles.button} ${styles.success}`}
            >
              Send structured log
            </button>
          </div>
        </article>

        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Debug log</h2>
          <p className={styles.cardBody}>
            Set{' '}
            <span className={styles.code}>
              NEXT_PUBLIC_BETTER_STACK_LOG_LEVEL
            </span>{' '}
            to <span className={styles.code}>debug</span> to ensure debug logs
            will be forwarded.
          </p>
          <div className={styles.buttonRow}>
            <button
              type="button"
              onClick={logDebug}
              className={`${styles.button} ${styles.debug}`}
            >
              Send debug
            </button>
          </div>
        </article>

        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Other pages</h2>
          <p className={styles.cardBody}>Try logging in different contexts.</p>
          <div className={styles.buttonRow}>
            <Link href="/rsc" className={styles.linkButton}>
              RSC page
            </Link>
            <Link href="/worker" className={styles.linkButton}>
              Worker page
            </Link>
          </div>
        </article>
      </section>

      <section className={styles.instructions} aria-label="Setup">
        <h2 className={styles.instructionsTitle}>Setup</h2>
        <ol className={styles.list}>
          <li>
            Create a source in your{' '}
            <Link
              href="https://telemetry.betterstack.com/team/0/sources"
              className={styles.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Better Stack dashboard
            </Link>
            .
          </li>
          <li>
            Copy the <span className={styles.code}>.env-example</span> template
            to <span className={styles.code}>.env</span>.
          </li>
          <li>
            Fill in the ingesting URL and source token in{' '}
            <span className={styles.code}>.env</span>.
          </li>
        </ol>
      </section>
    </main>
  );
}

export default Home;
