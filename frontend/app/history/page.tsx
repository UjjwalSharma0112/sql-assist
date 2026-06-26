"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, History, ArrowRight, Database } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface QueryItem {
  id: string;
  question: string;
  generated_sql: string | null;
  executed: boolean;
  execution_time_ms: number | null;
  rows_returned: number | null;
  created_at: string;
  project_id: string;
}

export default function HistoryPage() {
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const projectsList = await api.projects.list();
        if (projectsList.length > 0) {
          const histories = await Promise.all(
            projectsList.map((p: any) =>
              api.query.history(Number(p.id)).catch(() => [] as QueryItem[]),
            ),
          );
          const merged = histories
            .flat()
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            );
          setQueries(merged as any);
        } else {
          setQueries([]);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Query History</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All your generated and executed queries
        </p>
      </div>
      <div className="">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : queries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-4">
              <History className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">No queries yet.</p>
              <Link href="/projects">
                <Button variant="link">Go to a project to ask questions</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className=" flex flex-col gap-3">
            {queries.map((q) => (
              <Link
                key={q.id}
                href={`/project/${q.project_id}?query_id=${q.id}`}
              >
                <Card className="hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer p-3">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{q.question}</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate font-mono">
                          {q.generated_sql?.slice(0, 100) ?? ""}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{new Date(q.created_at).toLocaleString()}</span>
                          {q.executed && (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle className="w-3 h-3" />{" "}
                              {q.rows_returned ?? 0} rows ·{" "}
                              {q.execution_time_ms ?? 0}ms
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 shrink-0 pointer-events-none"
                      >
                        <ArrowRight className="w-3.5 h-3.5" /> Run Again
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
