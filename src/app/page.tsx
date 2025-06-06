// src/app/page.tsx
import MainAppLayout from './(main)/layout';
import MainPage from './(main)/page';

/**
 * This is the root page of the application.
 * It now explicitly renders the MainAppLayout and MainPage content,
 * ensuring that the primary application interface is displayed for the "/" path.
 */
export default function Home() {
  return (
    <MainAppLayout>
      <MainPage />
    </MainAppLayout>
  );
}
