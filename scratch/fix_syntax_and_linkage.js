const fs = require('fs');
const path = 'd:/Finanace_Dashboard/src/app/admin/users/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the syntax error (double brackets) and improve logic
content = content.replace(/}\s*}\s*catch\s*\(err:\s*any\)\s*{/g, '} catch (err: any) {');

// Now let's inject the smart linkage detection into handleDelete
const oldDeleteLogic = /await\s*axios\.delete\(`\/api\/users\/\${deleteConfirm\.id}`\);[\s\S]*?showToast\(`Account for "\${deleteConfirm\.name}" has been decommissioned\.`, "success"\);[\s\S]*?setDeleteConfirm\(null\);[\s\S]*?await load\(\);/g;

const newDeleteLogic = `try {
        await axios.delete(\`/api/users/\${deleteConfirm.id}\`);
        showToast(\`Account for "\${deleteConfirm.name}" has been decommissioned.\`, "success");
        setDeleteConfirm(null);
        await load();
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || err.message;
        
        // Check for specific linkage errors
        if (errorMsg.includes("attendance_logs")) {
          showToast("Linking Error: This employee has Attendance Logs. Remove logs or unassign them first.", "error");
        } else if (errorMsg.includes("project_members")) {
          showToast("Linking Error: This employee is a member of one or more Projects. Remove them from projects first.", "error");
        } else if (errorMsg.includes("projects_team_lead_id_fkey")) {
          showToast("Linking Error: This employee is the Lead for a Project. Assign a new lead to that project first.", "error");
        } else if (errorMsg.includes("teams_parent_id_fkey")) {
          showToast("Linking Error: This employee is managing a Team. Unassign them from the team first.", "error");
        } else if (errorMsg.includes("updated_at") || errorMsg.includes("42703")) {
          showToast("Database Sync Error: Please ensure you ran the SQL fix in Supabase. It allows leads to be deleted safely.", "error");
        } else {
          showToast("Unable to delete: " + errorMsg, "error");
        }
      }`;

// This is complex, I will just rewrite the whole handleDelete function to be safe
const fullHandleDeleteRegex = /async function handleDelete\(\) \{[\s\S]*?finally \{[\s\S]*?setSubmitting\(false\);[\s\S]*?\}[\s\S]*?\}/;

const finalHandleDelete = `async function handleDelete() {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      await axios.delete(\`/api/users/\${deleteConfirm.id}\`);
      showToast(\`Account for "\${deleteConfirm.name}" has been decommissioned.\`, "success");
      setDeleteConfirm(null);
      await load();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      
      // Plain English linkage detection
      if (errorMsg.includes("attendance_logs")) {
        showToast("Cannot Delete: Employee has Attendance records. You must clear their logs first.", "error");
      } else if (errorMsg.includes("project_members")) {
        showToast("Cannot Delete: Employee is still assigned to a Project. Remove them from the project team first.", "error");
      } else if (errorMsg.includes("projects_team_lead_id_fkey")) {
        showToast("Cannot Delete: Employee is a Project Lead. Assign a new Lead to their projects first.", "error");
      } else if (errorMsg.includes("updated_at") || errorMsg.includes("42703")) {
        showToast("System Error: Database script mismatch. Please verify the SQL patch was run in Supabase.", "error");
      } else {
        showToast("Security Block: " + errorMsg, "error");
      }
    } finally {
      setSubmitting(false);
    }
  }`;

content = content.replace(fullHandleDeleteRegex, finalHandleDelete);

fs.writeFileSync(path, content);
console.log("Successfully fixed syntax and added smart linkage detection.");
