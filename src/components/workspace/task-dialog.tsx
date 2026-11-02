import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { CURRENT_USER_ID, iso, members, priorityLabel, projects, statusLabel, type Priority, type Status } from "@/lib/data";
import { cn } from "@/lib/utils";

export function TaskDialog() {
  const { creating, setCreating, addTask } = useStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<Status>("todo");
  const [projectId, setProjectId] = useState(projects[0].id);
  const [due, setDue] = useState(iso(3));
  const [assignees, setAssignees] = useState<string[]>([CURRENT_USER_ID]);

  const reset = () => {
    setTitle(""); setDescription(""); setPriority("medium"); setStatus("todo"); setAssignees([CURRENT_USER_ID]); setDue(iso(3));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({ title: title.trim(), description, priority, status, projectId, due, assignees });
    toast.success("Task created", { description: title });
    reset();
    setCreating(false);
  };

  return (
    <Dialog open={creating} onOpenChange={setCreating}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Title</Label>
            <Input id="t-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea id="t-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-due">Due date</Label>
              <Input id="t-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(priorityLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assignees</Label>
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => {
                const on = assignees.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setAssignees((a) => (on ? a.filter((x) => x !== m.id) : [...a, m.id]))}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      on ? "border-primary bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {m.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit" disabled={!title.trim()}>Create task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
