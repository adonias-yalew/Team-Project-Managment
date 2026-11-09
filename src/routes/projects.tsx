import { useState } from "react";
import { FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore, type WorkspaceProject } from "@/lib/store";
import { useAuth } from "@/modules/auth/auth-context";

const emptyForm = {
  name: "",
  description: "",
  dueDate: "",
  status: "active" as WorkspaceProject["status"],
};

export function ProjectsPage() {
  const {
    projects,
    tasks,
    members,
    loading,
    error,
    addProject,
    updateProject,
    deleteProject,
    activeWorkspaceId,
  } = useStore();
  const { user } = useAuth();
  const [editing, setEditing] = useState<WorkspaceProject | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const myRole = members.find((member) => member.id === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  function beginEdit(project?: WorkspaceProject) {
    setEditing(project ?? null);
    setForm(
      project
        ? {
            name: project.name,
            description: project.description,
            dueDate: project.dueDate ?? "",
            status: project.status,
          }
        : emptyForm,
    );
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: form.name,
        description: form.description,
        dueDate: form.dueDate || null,
        status: form.status,
      };
      if (editing) await updateProject(editing.id, data);
      else await addProject(data);
      toast.success(editing ? "Project updated" : "Project created");
      setEditing(null);
      setForm(emptyForm);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Project could not be saved.");
    } finally {
      setSaving(false);
    }
  }
  async function remove(project: WorkspaceProject) {
    if (!window.confirm(`Delete “${project.name}” and its tasks? This cannot be undone.`)) return;
    try {
      await deleteProject(project.id);
      toast.success("Project deleted");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Project could not be deleted.");
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Projects"
        subtitle="Create and track delivery across the active workspace."
        actions={
          canManage ? (
            <Button onClick={() => beginEdit()}>
              <Plus className="mr-2 size-4" />
              New project
            </Button>
          ) : undefined
        }
      />
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {canManage && (
        <form
          onSubmit={(event) => void submit(event)}
          className="mb-6 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <h2 className="font-semibold">{editing ? "Edit project" : "New project"}</h2>
          </div>
          <Input
            aria-label="Project name"
            required
            maxLength={120}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Project name"
          />
          <Input
            aria-label="Project due date"
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
          />
          <Textarea
            aria-label="Project description"
            maxLength={5000}
            rows={3}
            className="sm:col-span-2"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="What will this project deliver?"
          />
          {editing && (
            <select
              aria-label="Project status"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as WorkspaceProject["status"] })
              }
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button disabled={saving || !activeWorkspaceId}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create project"}
            </Button>
            {editing && (
              <Button type="button" variant="ghost" onClick={() => beginEdit()}>
                Cancel edit
              </Button>
            )}
          </div>
        </form>
      )}
      {loading ? (
        <div role="status" className="surface p-10 text-center text-sm text-muted-foreground">
          Loading projects…
        </div>
      ) : projects.length === 0 ? (
        <div className="surface p-12 text-center">
          <FolderKanban className="mx-auto size-9 text-muted-foreground/50" />
          <h2 className="mt-3 font-semibold">No projects yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {canManage
              ? "Create a project to give workspace tasks a shared home."
              : "A workspace manager can create the first project."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const projectTasks = tasks.filter((task) => task.projectId === project.id);
            const done = projectTasks.filter((task) => task.status === "done").length;
            const progress = projectTasks.length
              ? Math.round((done / projectTasks.length) * 100)
              : 0;
            return (
              <article key={project.id} className="surface flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium capitalize text-primary">
                      {project.status}
                    </span>
                    <h2 className="mt-3 text-lg font-semibold">{project.name}</h2>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <button
                        aria-label={`Edit ${project.name}`}
                        onClick={() => beginEdit(project)}
                        className="rounded p-2 text-muted-foreground hover:bg-muted"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        aria-label={`Delete ${project.name}`}
                        onClick={() => void remove(project)}
                        className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-2 min-h-10 whitespace-pre-wrap text-sm text-muted-foreground">
                  {project.description || "No description."}
                </p>
                <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {projectTasks.length} {projectTasks.length === 1 ? "task" : "tasks"}
                  </span>
                  <span>{done} complete</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                  Due{" "}
                  {project.dueDate
                    ? new Date(`${project.dueDate}T00:00:00`).toLocaleDateString()
                    : "date not set"}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
