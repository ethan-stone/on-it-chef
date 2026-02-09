import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChefHat } from "lucide-react";

export default async function LandingPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/recipes");
  }

  return (
    <div className="min-h-screen bg-book-page flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <ChefHat className="w-20 h-20 text-medium-brown" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-dark-brown">On-It Chef</h1>
          <p className="text-lg text-medium-brown">
            AI-powered recipe generation. Describe what you want to cook and get
            personalized recipes tailored to your dietary needs.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/sign-in"
            className="block w-full bg-medium-brown text-book-page py-3 px-6 rounded-xl text-center font-semibold hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="block w-full bg-book-page text-medium-brown py-3 px-6 rounded-xl text-center font-semibold border-2 border-border hover:border-medium-brown transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
