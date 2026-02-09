import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-book-page flex items-center justify-center px-6">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-card border border-border shadow-lg",
            headerTitle: "text-dark-brown",
            headerSubtitle: "text-medium-brown",
            formButtonPrimary:
              "bg-medium-brown hover:opacity-90 transition-opacity",
            footerActionLink: "text-medium-brown hover:text-dark-brown",
          },
        }}
      />
    </div>
  );
}
