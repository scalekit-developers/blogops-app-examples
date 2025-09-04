"use client";
import dynamic from 'next/dynamic';

// import "swagger-ui-react/swagger-ui.css"; // Moved to global layout
import styles from "./api-docs.module.css";

const SwaggerUI = dynamic(
  () => import('swagger-ui-react'),
  { ssr: false }
);

export default function ApiDocsPage() {
  return (
    <div className={styles.apiDocsWrapper}>
      <div className={styles.apiDocsContainer}>
        <SwaggerUI
          url="/api/swagger.json"
          docExpansion="list"
          defaultModelsExpandDepth={-1}
          displayOperationId={true}
          tryItOutEnabled={true}
          supportedSubmitMethods={["get", "post", "put", "delete", "patch"]}
          showExtensions={false}
        />
        <style>{`
          .swagger-ui .servers {
            display: none !important;
          }
        `}</style>
      </div>
    </div>
  );
}
