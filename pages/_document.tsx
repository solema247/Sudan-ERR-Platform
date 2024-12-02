//pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Link the manifest.json */}
        <link rel="manifest" href="/manifest.json" />
        {/* Set the theme color */}
        <meta name="theme-color" content="#128c7e" />
        {/* Set the app description */}
        <meta name="description" content="A bot to support the Sudan Emergency Response Rooms." />
        {/* Link the favicon */}
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
