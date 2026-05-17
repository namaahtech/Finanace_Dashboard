// app/actions/salary-calculations.ts
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

/**
 * STEP 1: Link employee project submissions to salary calculation
 * When employee updates projects, fetch their latest KPI/KRA/Behavioral scores
 */
export async function linkProjectSubmissionsToSalary(
  employeeId: string,
  month: string // ISO date format: "2026-05-01"
) {
  const supabase = createServerActionClient<Database>({ cookies });

  // Fetch all project submissions for this employee in the month
  const { data: submissions, error: submitError } = await supabase
    .from('employee_project_submissions')
    .select('*')
    .eq('employee_salary_profile_id', employeeId)
    .gte('submission_date', month)
    .lt('submission_date', new Date(new Date(month).getTime() + 32 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  if (submitError) {
    throw new Error(`Failed to fetch project submissions: ${submitError.message}`);
  }

  // Calculate aggregated KPI/KRA/Behavioral scores
  const scores = calculateScoresFromSubmissions(submissions);

  return scores;
}

/**
 * STEP 2: Calculate KPI/KRA/Behavioral scores from project submissions
 */
function calculateScoresFromSubmissions(submissions: any[]) {
  if (!submissions.length) {
    return { kpiScore: 0, kraScore: 0, behavioralScore: 0 };
  }

  // KPI Score = Average achievement percent from sales targets
  const kpiScore = submissions.reduce((sum, sub) => sum + (sub.achievement_percent || 0), 0) / submissions.length;

  // KRA Score = Quality metrics (average from kra_metric_1, kra_metric_2)
  const kraScores = submissions.map(sub => {
    const metrics = [sub.kra_metric_1, sub.kra_metric_2].filter(Boolean).length;
    return metrics > 0 ? 80 : 0; // Simplified: if metrics provided, score 80
  });
  const kraScore = kraScores.length ? kraScores.reduce((a, b) => a + b) / kraScores.length : 0;

  // Behavioral Score = From behavioral_note (admin assessment)
  const behavioralScores = submissions
    .map(sub => {
      if (!sub.behavioral_note) return 0;
      // Parse score from note or use average
      return 75; // Simplified: default 75 if note exists
    });
  const behavioralScore = behavioralScores.length ? behavioralScores.reduce((a, b) => a + b) / behavioralScores.length : 0;

  return {
    kpiScore: Math.min(100, Math.max(0, kpiScore)),
    kraScore: Math.min(100, Math.max(0, kraScore)),
    behavioralScore: Math.min(100, Math.max(0, behavioralScore)),
  };
}

/**
 * STEP 3: Calculate commission earned based on target achievement
 */
export async function calculateCommissionEarned(
  salaryStructureId: string,
  monthlySalesTarget: number,
  actualSales: number
): Promise<number> {
  const supabase = createServerActionClient<Database>({ cookies });

  // Fetch commission slabs
  const { data: slabs, error } = await supabase
    .from('commission_slabs')
    .select('*')
    .eq('salary_structure_id', salaryStructureId)
    .order('min_target_percent', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch commission slabs: ${error.message}`);
  }

  // Calculate achievement percent
  const achievementPercent = (actualSales / monthlySalesTarget) * 100;

  // Find matching slab
  const applicableSlab = slabs?.find(
    slab => achievementPercent >= slab.min_target_percent && achievementPercent <= slab.max_target_percent
  );

  if (!applicableSlab) {
    return 0; // No commission if target not met
  }

  // Calculate commission
  const commission = actualSales * (applicableSlab.commission_percent / 100);
  return commission;
}

/**
 * STEP 4: Main salary computation function
 * Called when payslip is generated or salary is updated
 */
export async function computeMonthlySalary(
  employeeProfileId: string,
  month: string, // ISO date: "2026-05-01"
  actualSalesAchievement?: number // For sales roles
) {
  const supabase = createServerActionClient<Database>({ cookies });

  // Fetch employee profile with salary structure
  const { data: empProfile, error: empError } = await supabase
    .from('employee_salary_profiles')
    .select(`
      *,
      salary_structures (
        *,
        commission_slabs (*),
        salary_components (*),
        performance_linkage (*)
      )
    `)
    .eq('id', employeeProfileId)
    .single();

  if (empError || !empProfile) {
    throw new Error('Failed to fetch employee profile');
  }

  const profile = empProfile as any;
  const structure = profile.salary_structures;

  // ========== SALARY COMPONENTS ==========
  
  // 1. Base salary
  const baseSalary = profile.monthly_base_salary;

  // 2. Commission (if sales role)
  let commissionEarned = 0;
  if (structure.role_type === 'SALES' && profile.monthly_sales_target && actualSalesAchievement) {
    commissionEarned = await calculateCommissionEarned(
      structure.id,
      profile.monthly_sales_target,
      actualSalesAchievement
    );
  }

  // 3. Allowances
  let allowancesTotal = 0;
  structure.salary_components?.forEach((comp: any) => {
    if (comp.component_type === 'ALLOWANCE') {
      allowancesTotal += comp.amount || (baseSalary * comp.percent / 100) || 0;
    }
  });

  // 4. Initial Gross (before bonus adjustment)
  let grossSalary = baseSalary + commissionEarned + allowancesTotal;

  // ========== STATUTORY DEDUCTIONS ==========
  
  // Fetch deduction config
  const { data: dedConfig } = await supabase
    .from('statutory_deductions_config')
    .select('*')
    .single();

  const dedSettings = dedConfig || {
    pf_employee_percent: 12,
    pf_employer_percent: 12,
    esi_employee_percent: 0.75,
    esi_employer_percent: 3.25,
    esi_threshold: 21000,
    tds_enabled: true,
    annual_income_threshold: 250000,
  };

  // PF deduction (12% of basic)
  const pfEmployeeDeduction = baseSalary * (dedSettings.pf_employee_percent / 100);
  const pfEmployerContribution = baseSalary * (dedSettings.pf_employer_percent / 100);

  // ESI deduction (if salary < 21000)
  let esiDeduction = 0;
  let esiEmployerContribution = 0;
  if (grossSalary < dedSettings.esi_threshold) {
    esiDeduction = grossSalary * (dedSettings.esi_employee_percent / 100);
    esiEmployerContribution = grossSalary * (dedSettings.esi_employer_percent / 100);
  }

  // TDS (Income tax) — Simplified calculation
  let tdsDeduction = 0;
  if (dedSettings.tds_enabled) {
    const annualIncome = grossSalary * 12;
    if (annualIncome > dedSettings.annual_income_threshold) {
      // Simplified slab: 5% tax on income > 250k
      const taxableIncome = annualIncome - dedSettings.annual_income_threshold;
      tdsDeduction = (taxableIncome * 0.05) / 12; // Monthly
    }
  }

  // ========== PERFORMANCE BONUS ==========
  
  // Fetch KPI/KRA/Behavioral scores from project submissions
  const scores = await linkProjectSubmissionsToSalary(employeeProfileId, month);
  
  // Get performance linkage weights
  const perfLinkage = structure.performance_linkage?.[0] || {
    kpi_weight: 40,
    kra_weight: 40,
    behavioral_weight: 20,
  };

  // Calculate weighted performance score
  const performanceScore =
    (scores.kpiScore * perfLinkage.kpi_weight / 100) +
    (scores.kraScore * perfLinkage.kra_weight / 100) +
    (scores.behavioralScore * perfLinkage.behavioral_weight / 100);

  // Performance bonus = 10-50% of base salary based on score
  let bonusEarned = 0;
  if (performanceScore >= 80) {
    bonusEarned = baseSalary * 0.50; // 50% bonus for excellent performance
  } else if (performanceScore >= 70) {
    bonusEarned = baseSalary * 0.30; // 30% bonus for good performance
  } else if (performanceScore >= 60) {
    bonusEarned = baseSalary * 0.15; // 15% bonus for average
  }

  // ========== FINAL GROSS SALARY ==========
  const finalGrossSalary = baseSalary + commissionEarned + allowancesTotal + bonusEarned;

  // ========== NET SALARY ==========
  const netSalary = finalGrossSalary - pfEmployeeDeduction - esiDeduction - tdsDeduction;

  // ========== SAVE TO DATABASE ==========
  const { data: computation, error: compError } = await supabase
    .from('monthly_salary_computation')
    .upsert([
      {
        employee_salary_profile_id: employeeProfileId,
        month: month,
        base_salary: baseSalary,
        commission_earned: commissionEarned,
        bonus_earned: bonusEarned,
        allowances_total: allowancesTotal,
        gross_salary: grossSalary,
        pf_employee_deduction: pfEmployeeDeduction,
        pf_employer_contribution: pfEmployerContribution,
        tds_deduction: tdsDeduction,
        esi_deduction: esiDeduction,
        net_salary: netSalary,
        kpi_score: scores.kpiScore,
        kra_score: scores.kraScore,
        behavioral_score: scores.behavioralScore,
        performance_bonus_percent: (bonusEarned / baseSalary) * 100,
        final_gross_salary: finalGrossSalary,
      },
    ])
    .select()
    .single();

  if (compError) {
    throw new Error(`Failed to save salary computation: ${compError.message}`);
  }

  return computation;
}

/**
 * STEP 5: Generate payslip for employee
 */
export async function generatePayslip(
  employeeProfileId: string,
  month: string
) {
  const supabase = createServerActionClient<Database>({ cookies });

  // Fetch computed salary
  const { data: computation, error } = await supabase
    .from('monthly_salary_computation')
    .select(`
      *,
      employee_salary_profiles (
        *,
        salary_structures (*)
      )
    `)
    .eq('employee_salary_profile_id', employeeProfileId)
    .eq('month', month)
    .single();

  if (error || !computation) {
    throw new Error('Salary computation not found');
  }

  // Mark as payslip generated
  const { error: updateError } = await supabase
    .from('monthly_salary_computation')
    .update({ payslip_generated: true })
    .eq('id', computation.id);

  if (updateError) {
    throw new Error('Failed to mark payslip as generated');
  }

  // Return payslip data
  return {
    employeeName: computation.employee_salary_profiles?.user_id, // Get from user table if needed
    month: month,
    baseSalary: computation.base_salary,
    commission: computation.commission_earned,
    bonus: computation.bonus_earned,
    allowances: computation.allowances_total,
    grossSalary: computation.final_gross_salary,
    pfDeduction: computation.pf_employee_deduction,
    tdsDeduction: computation.tds_deduction,
    esiDeduction: computation.esi_deduction,
    netSalary: computation.net_salary,
    kpiScore: computation.kpi_score,
    kraScore: computation.kra_score,
    behavioralScore: computation.behavioral_score,
  };
}
