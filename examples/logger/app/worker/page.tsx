'use client';
import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from './worker.module.css';

export default function WorkerPage() {
  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../worker.ts', import.meta.url));
    workerRef.current.onmessage = (event: MessageEvent<number>) => {
      console.log('WebWorker Response:', event.data);
      alert(
        `WebWorker completed and logged ${event.data} iterations to Better Stack!`,
      );
    };
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleWork = useCallback(async () => {
    workerRef.current?.postMessage(100000);
  }, []);

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <h1>⚙️ Web Worker Logging</h1>
        <p className={styles.description}>
          This page demonstrates logging from a Web Worker. Click the button
          below to start a computation in a background thread and send logs to
          Better Stack.
        </p>

        <div className={styles.card}>
          <h3>🚀 Start Background Task</h3>
          <p>The worker will process 100,000 iterations and log the results.</p>
          <button onClick={handleWork} className={styles.button}>
            Send Logs from Web Worker
          </button>
        </div>

        <div className={styles.links}>
          <Link href="/" className={styles.link}>
            ← Back to Home
          </Link>
          <Link href="/rsc" className={styles.link}>
            Server Component →
          </Link>
        </div>
      </div>
    </main>
  );
}
