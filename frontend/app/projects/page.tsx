'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Plus, Trash2, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  db_type: string;
  last_synced_at: string | null;
  created_at: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Step 1
  const [name, setName] = useState('');
  const [dbType, setDbType] = useState('postgres');
  // Step 2
  const [step, setStep] = useState(1);
  const [host, setHost] = useState('');
  const [port, setPort] = useState('5432');
  const [databaseName, setDatabaseName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const data = await api.projects.list();
      setProjects(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.projects.testConnection({
        db_type: dbType,
        host,
        port: Number(port),
        database_name: databaseName,
        username,
        password,
      });
      setTestResult(res);
      toast.success('Connection successful');
    } catch (err: any) {
      toast.error(err.message || 'Connection failed');
    } finally {
      setTesting(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const project = await api.projects.create({
        name,
        db_type: dbType,
        host,
        port: Number(port),
        database_name: databaseName,
        username,
        password,
      });
      toast.success('Project created');
      setCreateOpen(false);
      resetForm();
      router.push(`/project/${project.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setStep(1);
    setName('');
    setDbType('postgres');
    setHost('');
    setPort('5432');
    setDatabaseName('');
    setUsername('');
    setPassword('');
    setTestResult(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project?')) return;
    try {
      await api.projects.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success('Project deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="p-4 pt-16 sm:p-6 sm:pt-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your database connections</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-4">
            <Database className="w-10 h-10 text-muted-foreground mx-auto" />
            <div>
              <p className="text-muted-foreground">No projects yet.</p>
              <Button variant="link" onClick={() => { resetForm(); setCreateOpen(true); }}>
                Create your first database connection
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Card key={p.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-medium">{p.name}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Database className="w-3.5 h-3.5" />
                  {p.db_type}
                </div>
                <Link href={`/project/${p.id}`}>
                  <Button variant="outline" size="sm" className="w-full gap-1">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              {step === 1 ? 'Enter project information.' : step === 2 ? 'Enter database connection details.' : 'Review and create.'}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Northwind" />
              </div>
              <div className="space-y-2">
                <Label>Database Type</Label>
                <Select value={dbType} onValueChange={setDbType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgres">PostgreSQL</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => setStep(2)} disabled={!name.trim()}>
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Host</Label>
                  <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="localhost" />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="5432" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Database Name</Label>
                <Input value={databaseName} onChange={(e) => setDatabaseName(e.target.value)} placeholder="mydb" />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="postgres" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>

              {testResult && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-md">
                  <CheckCircle className="w-4 h-4" />
                  Connected successfully ({testResult.tables} tables, {testResult.columns} columns)
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button variant="secondary" onClick={handleTestConnection} disabled={testing || !host || !databaseName || !username}>
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test Connection'}
                </Button>
                <Button onClick={() => setStep(3)} disabled={!testResult}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Project</span><span className="font-medium">{name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Database</span><span className="font-medium">{dbType}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Host</span><span className="font-medium">{host}:{port}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Database Name</span><span className="font-medium">{databaseName}</span></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={handleCreate} disabled={creating} className="flex-1">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Project'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
