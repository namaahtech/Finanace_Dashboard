import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json(
        { success: true, data: [], count: 0 }
      );
    }

    // Get projects assigned to this employee
    const { data: projectMembers, error: memberError } = await supabase
      .from("project_members")
      .select(`
        id,
        project_id,
        role,
        assigned_at,
        projects(
          id,
          name,
          description,
          progress,
          phase,
          due_date,
          budget
        )
      `)
      .eq("employee_id", employeeId)
      .not("projects", "is", null);

    if (memberError) {
      console.error("Project members error:", memberError);
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    if (!projectMembers || projectMembers.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    // Get task counts for each project
    const projectIds = projectMembers
      .map((pm: any) => pm.project_id)
      .filter(Boolean);

    let taskStats: any[] = [];
    if (projectIds.length > 0) {
      const { data: tasks, error: taskError } = await supabase
        .from("project_tasks")
        .select("project_id, status")
        .in("project_id", projectIds);

      if (!taskError && tasks) {
        taskStats = tasks;
      }
    }

    // Calculate task statistics per project
    const taskStatsByProject: Record<string, any> = {};
    taskStats.forEach((task: any) => {
      if (!taskStatsByProject[task.project_id]) {
        taskStatsByProject[task.project_id] = {
          total: 0,
          completed: 0,
          inProgress: 0,
          todo: 0,
        };
      }
      taskStatsByProject[task.project_id].total += 1;
      if (task.status === "COMPLETED") taskStatsByProject[task.project_id].completed += 1;
      if (task.status === "IN_PROGRESS") taskStatsByProject[task.project_id].inProgress += 1;
      if (task.status === "TODO") taskStatsByProject[task.project_id].todo += 1;
    });

    // Combine data - handle both array and object responses
    const projects = projectMembers
      .filter((pm: any) => pm.projects)
      .map((pm: any) => {
        const proj = Array.isArray(pm.projects) ? pm.projects[0] : pm.projects;
        return {
          id: proj.id,
          name: proj.name,
          description: proj.description,
          progress: proj.progress || 0,
          phase: proj.phase,
          dueDate: proj.due_date,
          budget: proj.budget,
          role: pm.role,
          assignedAt: pm.assigned_at,
          tasks: taskStatsByProject[proj.id] || { total: 0, completed: 0, inProgress: 0, todo: 0 },
        };
      });

    return NextResponse.json({
      success: true,
      data: projects,
      count: projects.length,
    });
  } catch (err: any) {
    console.error("Assigned projects fetch error:", err);
    return NextResponse.json(
      { success: true, data: [], count: 0 },
      { status: 200 }
    );
  }
}
