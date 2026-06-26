"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  CheckCircle,
  Database,
  Plus,
  ArrowRight,
  ChevronRight,
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
  const [username, setUsername] = useState<string>("Developer");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sql_assist_username");
      if (saved) setUsername(saved);
    }

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

  const totalQueries = stats?.total_queries ?? 0;
  const queriesExecuted = stats?.queries_executed ?? 0;
  const executionRate = totalQueries > 0 ? Math.round((queriesExecuted / totalQueries) * 100) : 0;

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (executionRate / 100) * circumference;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, {username}. Here&apos;s your workspace overview.
          </p>
        </div>
        <Link href="/projects">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Create Project
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Connected Databases */}
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connected Databases</span>
              {loading ? (
                <Skeleton className="h-8 w-16 mt-2" />
              ) : (
                <p className="text-2xl font-bold tracking-tight mt-1">{stats?.total_projects ?? 0}</p>
              )}
              <p className="text-[10px] text-muted-foreground/80 mt-2">Active sandboxed configurations</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <Database className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* AI Queries Generated */}
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Queries Generated</span>
              {loading ? (
                <Skeleton className="h-8 w-16 mt-2" />
              ) : (
                <p className="text-2xl font-bold tracking-tight mt-1">{stats?.total_queries ?? 0}</p>
              )}
              <p className="text-[10px] text-muted-foreground/80 mt-2">Powered by Gemini AI generation</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <FolderKanban className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Execution Rate Ring */}
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Execution Rate</span>
              {loading ? (
                <Skeleton className="h-8 w-24 mt-2" />
              ) : (
                <p className="text-2xl font-bold tracking-tight mt-1">
                  {executionRate}% <span className="text-xs text-muted-foreground font-normal">({queriesExecuted}/{totalQueries})</span>
                </p>
              )}
              <p className="text-[10px] text-muted-foreground/80 mt-2">Queries executed on target DBs</p>
            </div>
            <div className="relative flex items-center justify-center w-12 h-12">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 60 60">
                <circle
                  cx="30"
                  cy="30"
                  r="24"
                  className="stroke-muted"
                  strokeWidth="4.5"
                  fill="transparent"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="24"
                  className="stroke-emerald-500 transition-all duration-500 ease-out"
                  strokeWidth="4.5"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={loading ? circumference : strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-[9px] font-bold text-foreground">
                {executionRate}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Connected Databases
          </h2>
          <Link
            href="/projects"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 hover:translate-x-0.5 transition-all"
          >
            Manage Databases <ArrowRight className="w-3 h-3" />
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
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No database connections configured.{" "}
              <Link href="/projects" className="text-primary font-semibold hover:underline">
                Connect your first database
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link key={p.id} href={`/project/${p.id}`} className="group">
                <Card className="hover:shadow-md hover:border-primary/30 hover:bg-muted/5 transition-all cursor-pointer relative overflow-hidden group h-full flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                      {p.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Database className="w-3.5 h-3.5 text-slate-400" />
                        <span className="capitalize font-semibold text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-border/30">
                          {p.db_type}
                        </span>
                      </div>
                      <span className="font-semibold text-muted-foreground/80 group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex items-center gap-0.5">
                        Open <ChevronRight className="w-3.5 h-3.5" />
                      </span>
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
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Recent Analysis
          </h2>
          <Link
            href="/history"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 hover:translate-x-0.5 transition-all"
          >
            Query Log History <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : queries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No queries generated yet. Open a playground above to write SQL with natural language.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {queries.map((q) => (
              <Link
                key={q.id}
                href={`/project/${q.project_id}?query_id=${q.id}`}
                className="group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-muted/10 transition-all cursor-pointer gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {q.question}
                    </p>
                    <code className="text-[11px] text-muted-foreground/80 mt-1.5 block truncate bg-slate-50 dark:bg-slate-900/60 font-mono px-2 py-1 rounded border border-border/30 max-w-fit">
                      {q.generated_sql?.trim() ?? "No SQL generated"}
                    </code>
                  </div>
                  <div className="shrink-0 flex items-center justify-between sm:justify-end gap-3 border-t sm:border-0 pt-2 sm:pt-0 border-border/40">
                    {q.executed ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Executed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Draft
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform hidden sm:block" />
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
