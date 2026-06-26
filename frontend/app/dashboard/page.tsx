"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  MessageSquare,
  CheckCircle,
  Database,
  Plus,
  ArrowRight,
} from "lucide-react";

interface Stats {
  total_projects: number;
  total_queries: number;
  queries_executed: number;
  databases_connected: number;
}

interface Project {
  id: string;
  name: string;
  db_type: string;
  last_synced_at: string | null;
  created_at: string;
}

interface QueryItem {
  id: string;
  project_id: number;
  question: string;
  generated_sql: string | null;
  executed: boolean;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const pList = await api.projects.list();
        setProjects(pList.slice(0, 3) as any);

        const statsData = await api.stats();
        setStats(statsData);

        if (pList.length > 0) {
          const histories = await Promise.all(
            pList
              .slice(0, 3)
              .map((p: any) => api.query.history(Number(p.id)).catch(() => [])),
          );
          const merged = histories
            .flat()
            .sort(
              (a: any, b: any) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            );
          setQueries(merged.slice(0, 5) as any);
        } else {
          setQueries([]);
        }
      } catch (err: any) {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back. Here&apos;s what&apos;s happening.
          </p>
        </div>
        <Link href="/projects">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Create Project
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FolderKanban className="w-4 h-4" />}
          label="Total Projects"
          value={stats?.total_projects ?? 0}
          loading={loading}
        />
        <StatCard
          icon={<MessageSquare className="w-4 h-4" />}
          label="Total Queries"
          value={stats?.total_queries ?? 0}
          loading={loading}
        />
        <StatCard
          icon={<CheckCircle className="w-4 h-4" />}
          label="Queries Executed"
          value={stats?.queries_executed ?? 0}
          loading={loading}
        />
        <StatCard
          icon={<Database className="w-4 h-4" />}
          label="Databases Connected"
          value={stats?.databases_connected ?? 0}
          loading={loading}
        />
      </div>

      {/* Recent Projects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Recent Projects
          </h2>
          <Link
            href="/projects"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground">
              No projects yet.{" "}
              <Link href="/projects" className="text-primary hover:underline">
                Create your first project
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link key={p.id} href={`/project/${p.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">
                      {p.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Database className="w-3.5 h-3.5" />
                      {p.db_type}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Queries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Recent Queries
          </h2>
          <Link
            href="/history"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : queries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground">
              No queries yet. Ask a question from a project page to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {queries.map((q) => (
              <Link
                key={q.id}
                href={`/project/${q.project_id}?query_id=${q.id}`}
              >
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors cursor-pointer">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{q.question}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {q.generated_sql?.slice(0, 60) ?? "No SQL generated"}
                    </p>
                  </div>
                  <div className="shrink-0 ml-4">
                    {q.executed ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-5 w-10 mt-1" />
            ) : (
              <p className="text-xl font-bold">{value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
