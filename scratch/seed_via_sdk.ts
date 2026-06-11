import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !serviceKey) {
  console.error("Missing URL or Service Key!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const newUsers = [
  {
    email: "deptlead@namaah.io",
    password: "Namaah@1234",
    name: "Department Lead User",
    employee_id: "EMP_DL_001",
    role: "dept_lead",
    employment_type: "full_time",
    salary_structure: "fixed_monthly",
    base_salary: 95000,
  },
  {
    email: "teamlead@namaah.io",
    password: "Namaah@1234",
    name: "Team Lead User",
    employee_id: "EMP_TL_002",
    role: "team_lead",
    employment_type: "full_time",
    salary_structure: "fixed_monthly",
    base_salary: 75000,
  },
  {
    email: "employee@namaah.io",
    password: "Namaah@1234",
    name: "Employee User",
    employee_id: "EMP_EM_003",
    role: "employee",
    employment_type: "full_time",
    salary_structure: "fixed_monthly",
    base_salary: 55000,
  },
  {
    email: "intern@namaah.io",
    password: "Namaah@1234",
    name: "Intern User",
    employee_id: "EMP_IN_004",
    role: "intern",
    employment_type: "internship",
    salary_structure: "stipend",
    base_salary: 25000,
  },
];

async function seed() {
  console.log("Starting SDK Seeding...");

  for (const u of newUsers) {
    console.log(`\n--------------------------------------------`);
    console.log(`Processing: ${u.email}`);

    // 1. Delete from public.employees first to handle constraints
    console.log(`1. Deleting profile from employees...`);
    const { error: delEmpErr } = await supabase
      .from("employees")
      .delete()
      .eq("email", u.email);
    if (delEmpErr) {
      console.log(`Warning deleting employee ${u.email}:`, delEmpErr);
    }

    // 2. Find if user exists in auth
    console.log(`2. Checking for existing auth user...`);
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
      console.error("Error listing users:", listErr);
      return;
    }

    const existingAuth = users.find(x => x.email === u.email);
    if (existingAuth) {
      console.log(`3. Deleting existing auth user for: ${u.email}`);
      const { error: delAuthErr } = await supabase.auth.admin.deleteUser(existingAuth.id);
      if (delAuthErr) {
        console.error(`Error deleting auth user ${u.email}:`, delAuthErr);
      }
    }

    // 4. Create fresh auth user via admin SDK
    console.log(`4. Creating fresh auth user...`);
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { role: u.role },
    });

    if (createErr || !created.user) {
      console.error(`❌ Failed to create auth user for ${u.email}:`, createErr);
      continue;
    }

    console.log(`✅ Auth user created successfully. ID: ${created.user.id}`);

    // 5. Create matching employee profile in public.employees
    console.log(`5. Creating employee profile...`);
    const { error: insertErr } = await supabase
      .from("employees")
      .insert({
        id: created.user.id,
        name: u.name,
        email: u.email,
        employee_id: u.employee_id,
        role: u.role,
        is_active: true,
        employment_type: u.employment_type,
        salary_structure: u.salary_structure,
        base_salary: u.base_salary,
        joining_date: new Date().toISOString().split("T")[0],
      });

    if (insertErr) {
      console.error(`❌ Failed to create employee profile for ${u.email}:`, insertErr);
    } else {
      console.log(`🎉 Successfully provisioned and mapped: ${u.email}`);
    }
  }

  console.log("\n--------------------------------------------");
  console.log("SDK Seeding finished!");
}

seed();
