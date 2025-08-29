import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.center}>
        <h1 className={styles.title}>Backend-Only Next.js Passwordless Auth API</h1>
        <p className={styles.description}>
          This project provides backend API endpoints for passwordless authentication.
        </p>
        <p className={styles.description}>
          To test and explore the endpoints, visit{' '}
          <a href="/api-docs" className={styles.link}>Swagger UI</a>.
        </p>
        <p className={styles.description}>No frontend UI is included.</p>
      </div>
    </main>
  );
}
