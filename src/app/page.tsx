import dynamic from "next/dynamic";

// Load the app client-side only — pdfjs-dist requires browser APIs (DOMMatrix)
// that don't exist in Node.js serverless environments.
const HomeClient = dynamic(() => import("./HomeClient"), { ssr: false });

export default function HomePage() {
  return <HomeClient />;
}
