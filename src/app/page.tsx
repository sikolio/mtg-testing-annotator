import { SessionCreateForm } from "@/components/SessionCreateForm";

export default function HomePage() {
  return (
    <main className="page-shell">
      <header className="page-header">
        <h1>MTG Testing Annotator</h1>
        <p>Create a private video review session for your testing team.</p>
      </header>
      <SessionCreateForm />
    </main>
  );
}
