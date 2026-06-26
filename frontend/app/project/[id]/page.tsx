'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Database,
  RefreshCw,
  Trash2,
  Send,
  Copy,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Table2,
  Columns3,
  Link2,
  ArrowRight,
  Play,
  Download,
  History as HistoryIcon,
  ChevronRight,
  Sparkles,
  Check,
  Code,
  AlertCircle,
  Terminal,
  HelpCircle,
  RotateCcw
} from 'lucide-react';

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
}

interface ForeignKeyInfo {
  column: string;
  ref_table: string;
  ref_column: string;
}

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  foreign_keys: ForeignKeyInfo[];
}

interface ProjectDetail {
  id: number;
  name: string;
  db_type: 'postgres' | 'mysql';
  schema_summary: string | null;
  relationship_summary: string | null;
  last_synced_at: string | null;
}

interface QueryAlternative {
  sql: string;
  explanation: string;
  estimated_cost?: number;
}

interface QueryResult {
  id: number;
  project_id: number; // Wait, actually project_id: number;
  question: string;
  generated_sql: string;
  query_explanation: string;
  affected_tables: string[];
  estimated_rows: number | null;
  estimated_cost: number | null;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alternatives?: QueryAlternative[];
  optimization_suggestions?: string[];
  executed: boolean;
  execution_time_ms?: number | null;
  rows_returned?: number | null;
  created_at: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = Number(params.id);
  const queryIdParam = searchParams.get('query_id');

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('playground');

  // Query playground state
  const [question, setQuestion] = useState('');
  const [generating, setGenerating] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [editableSQL, setEditableSQL] = useState('');
  const [isEditingSQL, setIsEditingSQL] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [activeAltIndex, setActiveAltIndex] = useState<number>(-1); // -1 = primary

  // Async SQL checks
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [explaining, setExplaining] = useState(false);
  const [explanationResult, setExplanationResult] = useState<any>(null);

  // Execution modal & results
  const [showExecModal, setShowExecModal] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [resultTab, setResultTab] = useState<'results' | 'summary' | 'execution-plan'>('results');
  const [rollingBack, setRollingBack] = useState(false);
  const [rolledBack, setRolledBack] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState(false);

  // Schema state
  const [schemaData, setSchemaData] = useState<any>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');

  // History state
  const [history, setHistory] = useState<QueryResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchSchema();
      fetchHistory();
    }
  }, [projectId]);

  useEffect(() => {
    if (queryIdParam) {
      const qId = Number(queryIdParam);
      if (!isNaN(qId)) {
        api.query.get(qId)
          .then((q) => {
            if (q) {
              setQuestion(q.question);
              setActiveTab('playground');
              setQueryResult(q as any);
              setEditableSQL(q.generated_sql);
              setActiveAltIndex(-1);
              setIsEditingSQL(false);
              runSqlChecks(q.generated_sql);
              
              if (q.executed && q.result_summary) {
                try {
                  const summary = JSON.parse(q.result_summary);
                  if (summary && summary.execution_data) {
                    setExecutionResult(summary.execution_data);
                  }
                } catch (e) {
                  // Fallback
                }
              } else {
                setExecutionResult(null);
              }
              setRolledBack(false);
              setCommitted(false);
            }
          })
          .catch((err) => {
            console.error('Failed to load query from url:', err);
          });
      }
    }
  }, [queryIdParam]);

  async function fetchProject() {
    setLoading(true);
    try {
      const p = await api.projects.get(projectId);
      setProject(p as any);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load project info');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSchema() {
    setSchemaLoading(true);
    try {
      const s = await api.projects.schema(projectId);
      setSchemaData(s);
      const tables = s.schema_json?.tables || [];
      if (tables.length > 0) {
        setSelectedTable(tables[0].name);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load database schema');
    } finally {
      setSchemaLoading(false);
    }
  }

  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const h = await api.query.history(projectId);
      setHistory(h as any);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load query history');
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await api.projects.sync(projectId);
      toast.success('Schema synced successfully!');
      fetchProject();
      fetchSchema();
    } catch (err: any) {
      toast.error(err.message || 'Schema sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this project permanently? This will remove connection logs and history.')) return;
    try {
      await api.projects.delete(projectId);
      toast.success('Project deleted successfully');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete project');
    }
  }

  async function handleGenerate() {
    if (!question.trim()) return;
    setGenerating(true);
    setQueryResult(null);
    setExecutionResult(null);
    setActiveAltIndex(-1);
    setIsEditingSQL(false);
    setValidationResult(null);
    setAnalysisResult(null);
    setExplanationResult(null);
    setRolledBack(false);

    try {
      const res = await api.query.generate({ project_id: projectId, question });
      setQueryResult(res as any);
      setEditableSQL(res.generated_sql);
      
      // Auto trigger validations and explain
      runSqlChecks(res.generated_sql);
      
      // Reload history tab in background
      fetchHistory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate query');
    } finally {
      setGenerating(false);
    }
  }

  const runSqlChecks = async (sql: string) => {
    setValidating(true);
    setAnalyzing(true);
    setExplaining(true);

    api.query.validate({ project_id: projectId, sql })
      .then(res => setValidationResult(res))
      .catch(() => {})
      .finally(() => setValidating(false));

    api.query.analyze({ project_id: projectId, sql })
      .then(res => setAnalysisResult(res))
      .catch(() => {})
      .finally(() => setAnalyzing(false));

    api.query.explain({ project_id: projectId, sql })
      .then(res => setExplanationResult(res))
      .catch(() => {})
      .finally(() => setExplaining(false));
  };

  const selectAlternative = (alt: QueryAlternative, index: number) => {
    setActiveAltIndex(index);
    setEditableSQL(alt.sql);
    setIsEditingSQL(false);
    runSqlChecks(alt.sql);
  };

  const handleSaveSQL = () => {
    setIsEditingSQL(false);
    runSqlChecks(editableSQL);
    toast.success('SQL query updated');
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(editableSQL);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    toast.success('SQL copied to clipboard');
  };

  const handleExecute = async () => {
    if (!queryResult) return;
    setShowExecModal(false);
    setExecuting(true);
    setExecutionResult(null);
    setResultTab('results');
    setRolledBack(false);
    setCommitted(false);

    try {
      // Execute query checks
      const res = await api.query.execute({ query_id: queryResult.id });
      setExecutionResult(res);
      if (res.success) {
        toast.success('Query executed successfully');
      } else {
        toast.error('Query executed with errors');
      }
      
      // Fetch updated history
      fetchHistory();
      
      // Scroll into view
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (err: any) {
      toast.error(err.message || 'Failed to execute query');
    } finally {
      setExecuting(false);
    }
  };

  const handleRollback = async () => {
    if (!queryResult) return;
    setRollingBack(true);
    try {
      const res = await api.query.rollback({ query_id: queryResult.id });
      if (res.success) {
        setRolledBack(true);
        toast.success("Transaction changes successfully rolled back!");
      } else {
        toast.error(res.message || "Failed to rollback changes");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to rollback changes");
    } finally {
      setRollingBack(false);
    }
  };

  const handleCommit = async () => {
    if (!queryResult) return;
    setCommitting(true);
    try {
      const res = await api.query.commit({ query_id: queryResult.id });
      if (res.success) {
        setCommitted(true);
        toast.success("Transaction changes successfully committed!");
      } else {
        toast.error(res.message || "Failed to commit changes");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to commit changes");
    } finally {
      setCommitting(false);
    }
  };

  const handleReuseHistory = (q: QueryResult) => {
    setQuestion(q.question);
    setActiveTab('playground');
    setQueryResult(q);
    setEditableSQL(q.generated_sql);
    setActiveAltIndex(-1);
    setIsEditingSQL(false);
    runSqlChecks(q.generated_sql);
    setRolledBack(false);
  };

  function getRiskBadgeColor(risk: string | null) {
    switch (risk?.toUpperCase()) {
      case 'LOW': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'MEDIUM': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'CRITICAL': return 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  }

  const tables: TableInfo[] = schemaData?.schema_json?.tables ?? [];
  const filteredTables = tables.filter(t => t.name.toLowerCase().includes(tableSearch.toLowerCase()));
  const currentTable = tables.find(t => t.name === selectedTable);

  return (
    <div className="p-4 pt-16 sm:p-6 sm:pt-6 lg:p-8 space-y-6">
      
      {/* Execution Confirmation Modal */}
      {showExecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border rounded-2xl shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Play className="w-4.5 h-4.5 text-emerald-500" />
                Execute Query?
              </h3>
              <button onClick={() => setShowExecModal(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="py-4 space-y-4">
              <pre className="p-3 bg-muted text-foreground font-mono text-xs rounded-xl overflow-x-auto border leading-relaxed max-h-40">
                {editableSQL}
              </pre>

              <div className="p-3 bg-muted/40 border rounded-xl flex items-center justify-between">
                <div className="text-xs text-muted-foreground font-semibold uppercase">Risk Level</div>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getRiskBadgeColor(analysisResult?.risk_level || queryResult?.risk_level || 'LOW')}`}>
                  {analysisResult?.risk_level || queryResult?.risk_level || 'LOW'}
                </span>
              </div>

              {((analysisResult?.risk_level || queryResult?.risk_level) === 'HIGH' || (analysisResult?.risk_level || queryResult?.risk_level) === 'CRITICAL') && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex gap-2.5 items-start text-xs leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Warning:</span> High risk statements modify database rows. Run with extreme caution.
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setShowExecModal(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={handleExecute}>Execute</Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !project ? (
        <div className="text-center py-20 text-muted-foreground">Project not found</div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                <Badge variant="secondary" className="capitalize">{project.db_type}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Last synced: {project.last_synced_at ? new Date(project.last_synced_at).toLocaleString() : 'Never'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-2">
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Sync Schema
              </Button>
              <Button variant="outline" size="sm" onClick={handleDelete} className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="w-3.5 h-3.5" />
                Delete Project
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="playground">Query Playground</TabsTrigger>
              <TabsTrigger value="schema">Schema</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* QUERY PLAYGROUND TAB */}
            <TabsContent value="playground" className="space-y-6 mt-6">
              
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="relative">
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask your database anything..."
                      className="w-full min-h-[100px] resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerate();
                        }
                      }}
                    />
                    <div className="flex justify-end mt-2">
                      <Button onClick={handleGenerate} disabled={generating || !question.trim()} className="gap-2">
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Generate SQL
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {generating && (
                <div className="p-12 border border-dashed rounded-2xl flex flex-col items-center justify-center space-y-3 text-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <div>
                    <p className="font-semibold text-sm">Generating SQL statement...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Using AI to analyze database schema summaries.</p>
                  </div>
                </div>
              )}

              {queryResult && (
                <div className="space-y-6">
                  
                  {/* Alternatives Tabs */}
                  {queryResult.alternatives && queryResult.alternatives.length > 0 && (
                    <div className="flex items-center gap-2 border-b pb-2">
                      <button
                        onClick={() => {
                          setActiveAltIndex(-1);
                          setEditableSQL(queryResult.generated_sql);
                          setIsEditingSQL(false);
                          runSqlChecks(queryResult.generated_sql);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                          activeAltIndex === -1 ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                      >
                        Option A (Primary)
                      </button>
                      {queryResult.alternatives.map((alt, index) => (
                        <button
                          key={index}
                          onClick={() => selectAlternative(alt, index)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            activeAltIndex === index ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          }`}
                        >
                          Option {String.fromCharCode(66 + index)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* NL Question Card */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Question</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium">"{queryResult.question}"</p>
                    </CardContent>
                  </Card>

                  {/* SQL Card */}
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Generated SQL</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => setIsEditingSQL(!isEditingSQL)}>
                          {isEditingSQL ? 'Cancel' : 'Edit'}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={handleCopySQL}>
                          {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          Copy
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isEditingSQL ? (
                        <div className="space-y-3">
                          <textarea
                            value={editableSQL}
                            onChange={(e) => setEditableSQL(e.target.value)}
                            className="w-full min-h-36 p-3 border rounded-xl font-mono text-sm bg-background focus:outline-none"
                          />
                          <div className="flex justify-end">
                            <Button size="sm" onClick={handleSaveSQL}>
                              Save & Re-validate
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <pre className="text-sm bg-muted text-foreground p-4 rounded-xl overflow-x-auto font-mono border leading-relaxed">
                          {editableSQL}
                        </pre>
                      )}
                    </CardContent>
                  </Card>

                  {/* Explanation & Analytics Cards */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    
                    {/* Explanation */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> Explanation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {explaining ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed text-foreground">
                            {explanationResult?.summary || queryResult.query_explanation}
                          </p>
                        )}
                        {explanationResult?.clauses && Object.keys(explanationResult.clauses).length > 0 && (
                          <div className="mt-3 pt-3 border-t space-y-1.5">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase">Clauses</div>
                            {Object.entries(explanationResult.clauses).map(([k, v]) => (
                              <div key={k} className="text-xs font-mono flex items-start gap-1">
                                <span className="text-muted-foreground font-semibold capitalize">{k}:</span>
                                <span className="text-foreground truncate">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Risk & Warnings */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Risk & Warnings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Risk Level</span>
                          <Badge className={getRiskBadgeColor(analysisResult?.risk_level || queryResult.risk_level)}>
                            {analysisResult?.risk_level || queryResult.risk_level}
                          </Badge>
                        </div>

                        {/* Warnings */}
                        <div className="pt-2 border-t space-y-1">
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase">Validation Warnings</div>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {validationResult?.warnings && validationResult.warnings.length > 0 ? (
                              validationResult.warnings.map((w: string, idx: number) => (
                                <div key={idx} className="text-xs text-amber-500 flex gap-1.5 items-start">
                                  <span>⚠</span>
                                  <span>{w}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-emerald-500">✓ No critical validation warnings found.</div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  {/* Affected Tables Card */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Affected Tables</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const tables = explanationResult?.affected_tables || queryResult.affected_tables || [];
                          const list = Array.isArray(tables)
                            ? tables
                            : typeof tables === 'string'
                              ? tables.split(',').map((s: string) => s.trim()).filter(Boolean)
                              : [];
                          return list.map((t: string) => (
                            <Badge key={t} variant="outline" className="capitalize">{t}</Badge>
                          ));
                        })()}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Execute Button */}
                  <div className="flex items-center justify-between p-4 bg-muted/20 border rounded-2xl">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-sky-400" />
                      Verify SQL before execution. Action will run against database.
                    </div>
                    <Button onClick={() => setShowExecModal(true)} disabled={executing || (validationResult && !validationResult.valid)} className="gap-2 shadow">
                      {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Execute Query
                    </Button>
                  </div>

                </div>
              )}

              {/* Execution Results View */}
              {executionResult && (
                <div ref={resultsRef} className="space-y-4 pt-6 border-t animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold flex items-center gap-1.5">
                      <Terminal className="w-5 h-5 text-emerald-500" />
                      Execution Results
                    </h3>

                    {executionResult.success && (
                      <div className="flex items-center gap-2">
                        {executionResult.transactional && (
                          <>
                            {!rolledBack && !committed ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleRollback}
                                  disabled={rollingBack || committing}
                                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 gap-1.5"
                                >
                                  {rollingBack ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                  Rollback Changes
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={handleCommit}
                                  disabled={rollingBack || committing}
                                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                                >
                                  {committing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  Commit Changes
                                </Button>
                              </>
                            ) : rolledBack ? (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 py-1 font-semibold gap-1">
                                <RotateCcw className="w-3 h-3" />
                                Changes Rolled Back
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-1 font-semibold gap-1">
                                <Check className="w-3 h-3" />
                                Changes Committed
                              </Badge>
                            )}
                          </>
                        )}
                        <a
                          href={api.query.downloadUrl(queryResult!.id, 'csv')}
                          className="px-3.5 py-1.5 border rounded-xl text-xs font-semibold hover:bg-muted flex items-center gap-1.5 transition-colors shadow-sm"
                          download
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export CSV
                        </a>
                      </div>
                    )}
                  </div>

                  <Card className="overflow-hidden flex flex-col min-h-[300px]">
                    <div className="bg-muted/40 border-b flex items-center">
                      <button
                        onClick={() => setResultTab('results')}
                        className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
                          resultTab === 'results' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Results Table
                      </button>
                      <button
                        onClick={() => setResultTab('summary')}
                        className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
                          resultTab === 'summary' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Summary
                      </button>
                      <button
                        onClick={() => setResultTab('execution-plan')}
                        className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
                          resultTab === 'execution-plan' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Execution Metrics
                      </button>
                    </div>

                    <CardContent className="p-4 flex-1 overflow-y-auto">
                      {resultTab === 'results' && (
                        <div>
                          {!executionResult.success ? (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm flex gap-2">
                              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-bold">Error:</span> {executionResult.error || 'Syntax exception or connection timeout.'}
                              </div>
                            </div>
                          ) : !executionResult.data || executionResult.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                              {executionResult.transactional || executionResult.rows_returned > 0 ? (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-sm flex gap-2.5 items-center">
                                  <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                                  <div>
                                    Query executed successfully. <span className="font-bold">{executionResult.rows_returned}</span> row(s) affected.
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center">No rows matched this query.</p>
                              )}
                            </div>
                          ) : (
                            <div className="overflow-x-auto border rounded-xl bg-background max-h-[350px]">
                              <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                  <tr className="bg-muted border-b">
                                    {executionResult.columns?.map((col: string) => (
                                      <th key={col} className="p-2 px-3 font-semibold text-muted-foreground uppercase">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y font-mono">
                                  {executionResult.data.map((row: any, rIdx: number) => (
                                    <tr key={rIdx} className="hover:bg-muted/10">
                                      {executionResult.columns.map((col: string) => (
                                        <td key={col} className="p-2 px-3 text-foreground truncate max-w-[200px]" title={String(row[col] ?? '')}>
                                          {row[col] === null ? <span className="text-muted-foreground/35">null</span> : String(row[col])}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {resultTab === 'summary' && (
                        <div className="p-3 bg-muted/30 border rounded-xl text-sm leading-relaxed">
                          {executionResult.success ? (
                            <p>
                              Query returned {executionResult.rows_returned} row(s) in {executionResult.execution_time_ms}ms. 
                              The statement was parsed and validated successfully.
                            </p>
                          ) : (
                            <p className="text-red-500">Query execution failed. Review syntax errors in the Results tab.</p>
                          )}
                        </div>
                      )}

                      {resultTab === 'execution-plan' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                          <div className="p-3 border rounded-xl bg-muted/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Execution Time</span>
                            <div className="text-lg font-bold mt-0.5">{executionResult.execution_time_ms} ms</div>
                          </div>
                          <div className="p-3 border rounded-xl bg-muted/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Rows Returned</span>
                            <div className="text-lg font-bold mt-0.5">{executionResult.rows_returned}</div>
                          </div>
                          <div className="p-3 border rounded-xl bg-muted/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Estimated Rows</span>
                            <div className="text-lg font-bold mt-0.5">{executionResult.estimated_rows ?? 'N/A'}</div>
                          </div>
                          <div className="p-3 border rounded-xl bg-muted/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Plan Cost</span>
                            <div className="text-lg font-bold mt-0.5">{executionResult.estimated_cost ?? 'N/A'}</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

            </TabsContent>

            {/* SCHEMA TAB */}
            <TabsContent value="schema" className="mt-6">
              <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] min-h-[400px]">
                
                {/* Left: tables list */}
                <Card className="lg:col-span-1 flex flex-col">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold">Tables</CardTitle>
                      <span className="text-xs text-muted-foreground">{tables.length} total</span>
                    </div>
                    <Input
                      placeholder="Search tables..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="mt-2"
                    />
                  </CardHeader>
                  
                  <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full px-4 py-3">
                      <div className="space-y-1">
                        {filteredTables.map((t) => (
                          <button
                            key={t.name}
                            onClick={() => setSelectedTable(t.name)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left ${
                              selectedTable === t.name ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'hover:bg-muted text-foreground'
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <Table2 className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{t.name}</span>
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                              selectedTable === t.name ? 'bg-primary-foreground/20 border-transparent text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                              {t.columns?.length || 0}
                            </span>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Right: Selected table columns & details */}
                <Card className="lg:col-span-2 flex flex-col">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base font-bold flex items-center gap-1.5 capitalize">
                      <Database className="w-4 h-4 text-primary" />
                      {currentTable?.name ?? 'Select a table'}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex-1 overflow-hidden">
                    {currentTable ? (
                      <ScrollArea className="h-full py-4">
                        <div className="space-y-6">
                          
                          {/* Columns table */}
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                              <Columns3 className="w-4 h-4" />
                              Columns
                            </h4>

                            <div className="rounded-xl border bg-card overflow-hidden">
                              <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                  <tr className="border-b bg-muted/40">
                                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Column</th>
                                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Type</th>
                                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Key</th>
                                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Nullable</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {currentTable.columns?.map((col) => (
                                    <tr key={col.name} className="border-b last:border-0 hover:bg-muted/10">
                                      <td className="py-2.5 px-3 font-mono font-medium">{col.name}</td>
                                      <td className="py-2.5 px-3 font-mono text-muted-foreground text-[11px]">{col.type}</td>
                                      <td className="py-2.5 px-3">
                                        {col.primary_key && (
                                          <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold">PK</Badge>
                                        )}
                                        {currentTable.foreign_keys?.some(fk => fk.column === col.name) && (
                                          <Badge className="ml-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold">FK</Badge>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-muted-foreground">{col.nullable ? 'Yes' : 'No'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Relationships */}
                          {currentTable.foreign_keys && currentTable.foreign_keys.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                                <Link2 className="w-4 h-4" />
                                Relationships
                              </h4>
                              <div className="grid md:grid-cols-2 gap-4">
                                {currentTable.foreign_keys.map((fk, i) => (
                                  <div key={i} className="flex items-center justify-between p-3 border rounded-xl bg-muted/15 shadow-sm text-xs">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Source</span>
                                      <span className="font-mono mt-0.5">{fk.column}</span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-sky-400 shrink-0" />
                                    <div className="flex flex-col text-right">
                                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Target</span>
                                      <span className="font-mono text-sky-400 mt-0.5">{fk.ref_table}({fk.ref_column})</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Schema Summary */}
                          <div className="p-4 bg-muted/30 border rounded-2xl space-y-2">
                            <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              AI Schema Summary
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {schemaData?.schema_summary || 'No project summary available.'}
                            </p>
                          </div>

                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm space-y-2">
                        <Database className="w-12 h-12 text-muted-foreground/35" />
                        <p className="font-semibold text-xs">Select a table to view details</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            </TabsContent>

            {/* HISTORY TAB */}
            <TabsContent value="history" className="mt-6 space-y-4">
              {historyLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-2xl" />
                  <Skeleton className="h-20 w-full rounded-2xl" />
                </div>
              ) : history.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-16 text-center text-muted-foreground">
                    No query history available. Generate a query to get started.
                  </CardContent>
                </Card>
              ) : (
                history.map((q) => (
                  <Card key={q.id} className="hover:border-primary/30 transition-all cursor-pointer" onClick={() => handleReuseHistory(q)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-semibold">"{q.question}"</p>
                          <pre className="text-[11px] text-foreground truncate font-mono bg-muted p-2 border rounded-lg max-h-16 overflow-y-auto leading-relaxed pointer-events-none">
                            {q.generated_sql}
                          </pre>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                            <span>{new Date(q.created_at).toLocaleString()}</span>
                            {q.executed && (
                              <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Executed ({q.execution_time_ms} ms)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2 pointer-events-none">
                          <Button variant="ghost" size="sm" className="h-8 gap-1">
                            <HistoryIcon className="w-3.5 h-3.5" /> Reuse
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

    </div>
  );
}

// Minimal Icons replacement helper to compile easily
function XIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
