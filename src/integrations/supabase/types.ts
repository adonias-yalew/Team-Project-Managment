export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          username: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          username?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
        };
        Update: {
          full_name?: string;
          username?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          avatar_url: string | null;
          slug: string | null;
          workspace_type: "personal" | "team";
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          avatar_url?: string | null;
          slug?: string | null;
          workspace_type?: "personal" | "team";
          created_by?: string;
        };
        Update: {
          name?: string;
          slug?: string | null;
          description?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          joined_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: "owner" | "admin" | "member";
        };
        Update: { role?: "owner" | "admin" | "member" };
        Relationships: [];
      };
      workspace_invitations: {
        Row: {
          id: string;
          workspace_id: string;
          invited_email: string | null;
          intended_role: "owner" | "admin" | "member";
          token_hash: string;
          expires_at: string;
          revoked_at: string | null;
          max_uses: number;
          delivery_status: "not_applicable" | "pending" | "sent" | "failed";
          sent_at: string | null;
          accepted_at: string | null;
          accepted_by: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          invited_email?: string | null;
          intended_role?: "owner" | "admin" | "member";
          token_hash: string;
          expires_at: string;
          max_uses?: number;
          delivery_status?: "not_applicable" | "pending" | "sent" | "failed";
          sent_at?: string | null;
          created_by?: string;
        };
        Update: never;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string;
          status: "active" | "completed" | "archived";
          due_date: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          description?: string;
          status?: "active" | "completed" | "archived";
          due_date?: string | null;
          created_by?: string;
        };
        Update: {
          name?: string;
          description?: string;
          status?: "active" | "completed" | "archived";
          due_date?: string | null;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          project_id: string;
          workspace_id: string;
          user_id: string;
          added_by: string;
          created_at: string;
        };
        Insert: { project_id: string; workspace_id: string; user_id: string; added_by?: string };
        Update: never;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          workspace_id: string;
          project_id: string | null;
          title: string;
          description: string;
          status: "todo" | "in_progress" | "review" | "done";
          priority: "urgent" | "high" | "medium" | "low";
          due_date: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          project_id?: string | null;
          title: string;
          description?: string;
          status?: "todo" | "in_progress" | "review" | "done";
          priority?: "urgent" | "high" | "medium" | "low";
          due_date?: string | null;
          created_by?: string;
        };
        Update: {
          project_id?: string | null;
          title?: string;
          description?: string;
          status?: "todo" | "in_progress" | "review" | "done";
          priority?: "urgent" | "high" | "medium" | "low";
          due_date?: string | null;
        };
        Relationships: [];
      };
      task_assignees: {
        Row: {
          task_id: string;
          workspace_id: string;
          user_id: string;
          assigned_by: string;
          created_at: string;
        };
        Insert: { task_id: string; workspace_id: string; user_id: string; assigned_by?: string };
        Update: never;
        Relationships: [];
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          workspace_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          workspace_id: string;
          author_id?: string;
          body: string;
        };
        Update: never;
        Relationships: [];
      };
      task_activity: {
        Row: {
          id: number;
          task_id: string;
          workspace_id: string;
          actor_id: string | null;
          event: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_team_workspace: {
        Args: { p_name: string; p_description?: string | null; p_avatar_url?: string | null };
        Returns: string;
      };
      list_workspace_members: {
        Args: { p_workspace_id: string };
        Returns: {
          member_user_id: string;
          full_name: string;
          avatar_url: string | null;
          role: "owner" | "admin" | "member";
          joined_at: string;
        }[];
      };
      change_workspace_member_role: {
        Args: {
          p_workspace_id: string;
          p_target_user_id: string;
          p_new_role: "owner" | "admin" | "member";
        };
        Returns: undefined;
      };
      remove_workspace_member: {
        Args: { p_workspace_id: string; p_target_user_id: string };
        Returns: undefined;
      };
      transfer_workspace_ownership: {
        Args: { p_workspace_id: string; p_new_owner_user_id: string };
        Returns: undefined;
      };
      delete_team_workspace: {
        Args: { p_workspace_id: string; p_confirmation_name: string };
        Returns: undefined;
      };
      revoke_workspace_invitation: {
        Args: { p_invitation_id: string };
        Returns: undefined;
      };
      set_task_assignees: { Args: { p_task_id: string; p_user_ids: string[] }; Returns: undefined };
      create_workspace_task: {
        Args: {
          p_workspace_id: string;
          p_project_id: string | null;
          p_title: string;
          p_description: string;
          p_status: "todo" | "in_progress" | "review" | "done";
          p_priority: "urgent" | "high" | "medium" | "low";
          p_due_date: string | null;
          p_assignee_ids: string[];
        };
        Returns: string;
      };
      list_workspace_invitations: {
        Args: { p_workspace_id: string };
        Returns: {
          id: string;
          workspace_id: string;
          invited_email: string | null;
          intended_role: "owner" | "admin" | "member";
          expires_at: string;
          revoked_at: string | null;
          max_uses: number;
          accepted_count: number;
          declined_count: number;
          status: string;
          delivery_status: "not_applicable" | "pending" | "sent" | "failed";
          created_by: string;
          created_at: string;
        }[];
      };
      list_my_workspace_invitations: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          workspace_id: string;
          workspace_name: string;
          invited_email: string | null;
          intended_role: "owner" | "admin" | "member";
          expires_at: string;
          status: string;
        }[];
      };
    };
    Enums: {
      workspace_type: "personal" | "team";
      workspace_role: "owner" | "admin" | "member";
      workspace_invitation_response: "accepted" | "declined";
      task_status: "todo" | "in_progress" | "review" | "done";
      task_priority: "urgent" | "high" | "medium" | "low";
      project_status: "active" | "completed" | "archived";
    };
    CompositeTypes: Record<string, never>;
  };
}
