'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Database, Sparkles, Shield, Zap, ArrowRight, MessageSquare } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function LandingPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400 flex items-center justify-center">
              <Database className="w-4 h-4 text-white dark:text-slate-900" />
            </div>
            <span className="font-semibold text-lg tracking-tight">SQL Assist</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-slate-900/30" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Sparkles className="w-3.5 h-3.5" />
              Powered by AI
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
              Talk to your database<br />
              <span className="bg-gradient-to-r from-slate-600 to-slate-400 bg-clip-text text-transparent">
                like a human
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              SQL Assist turns natural language into precise SQL queries. No coding required. 
              Connect your PostgreSQL or MySQL database and start asking questions.
            </p>
            <div className="flex items-center justify-center gap-3 pt-4">
              <Link href="/signup">
                <Button size="lg" className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 gap-2">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Everything you need</h2>
            <p className="text-muted-foreground mt-2">Built for teams that value speed and accuracy</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<MessageSquare className="w-5 h-5" />}
              title="Natural Language Queries"
              description="Ask questions in plain English. Our AI translates them into optimized SQL automatically."
            />
            <FeatureCard
              icon={<Zap className="w-5 h-5" />}
              title="Instant Generation"
              description="Get SQL queries in seconds with syntax highlighting, explanations, and alternatives."
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="Risk Analysis"
              description="Every query is analyzed for risk level. High-risk operations require explicit confirmation."
            />
            <FeatureCard
              icon={<Database className="w-5 h-5" />}
              title="Schema Explorer"
              description="Visualize your database schema, tables, columns, and relationships in a clean interface."
            />
            <FeatureCard
              icon={<Sparkles className="w-5 h-5" />}
              title="Query History"
              description="Access all your past queries. Re-run, export, and share with your team effortlessly."
            />
            <FeatureCard
              icon={<ArrowRight className="w-5 h-5" />}
              title="Export Results"
              description="Download query results as CSV or Excel. Share insights with stakeholders instantly."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Ready to simplify your data workflow?</h2>
          <p className="text-muted-foreground mt-3 mb-8">
            Join thousands of users who query databases faster with SQL Assist.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 gap-2">
              Create Free Account <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">SQL Assist</span>
          </div>
          <span className="text-sm text-muted-foreground">Built for modern teams</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl border border-border/60 bg-card hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-700 dark:text-slate-300">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
