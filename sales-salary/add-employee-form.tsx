// app/admin/employees/add-employee.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';

interface SalaryStructure extends Database['public']['Tables']['salary_structures']['Row'] {
  commission_slabs: Database['public']['Tables']['commission_slabs']['Row'][];
  salary_components: Database['public']['Tables']['salary_components']['Row'][];
  performance_linkage: Database['public']['Tables']['performance_linkage']['Row'][];
}

export default function AddEmployeeModal() {
  const supabase = createClientComponentClient<Database>();
  
  const [formData, setFormData] = useState({
    accessLevel: 'EMPLOYEE',
    employmentType: 'FULL_TIME',
    leaveEntitlement: '1 Day / Month',
    salaryStructure: '', // Will auto-populate based on role
    monthlyBaseSalary: '',
    monthlySalesTarget: '',
    commencementDate: new Date().toISOString().split('T')[0],
  });

  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [showPerformanceSettings, setShowPerformanceSettings] = useState(false);
  const [performanceSettings, setPerformanceSettings] = useState({
    kpiWeight: 40,
    kraWeight: 40,
    behavioralWeight: 20,
  });

  // STEP 1: Fetch salary structures on mount
  useEffect(() => {
    const fetchStructures = async () => {
      const { data, error } = await supabase
        .from('salary_structures')
        .select(`
          *,
          commission_slabs (*),
          salary_components (*),
          performance_linkage (*)
        `)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching salary structures:', error);
        return;
      }
      setSalaryStructures(data as SalaryStructure[]);
    };

    fetchStructures();
  }, [supabase]);

  // STEP 2: When access level changes, auto-select matching salary structure
  const handleAccessLevelChange = (level: string) => {
    setFormData(prev => ({ ...prev, accessLevel: level }));

    // Map access level to role type
    const roleTypeMap: Record<string, string> = {
      'EMPLOYEE': 'EMPLOYEE',
      'ADMIN': 'ADMIN',
      'MANAGER': 'MANAGER',
      'DEPARTMENT_LEAD': 'SALES', // For dept leads in sales
    };

    const matchingRole = roleTypeMap[level] || level;
    const structure = salaryStructures.find(s => s.role_type === matchingRole);
    
    if (structure) {
      setSelectedStructure(structure);
      setFormData(prev => ({ 
        ...prev, 
        salaryStructure: structure.id,
        monthlyBaseSalary: structure.base_salary_amount.toString(),
      }));

      // If it's a sales role, show performance linkage
      if (structure.role_type === 'SALES' || level === 'DEPARTMENT_LEAD') {
        setShowPerformanceSettings(true);
        if (structure.performance_linkage?.[0]) {
          const perf = structure.performance_linkage[0];
          setPerformanceSettings({
            kpiWeight: perf.kpi_weight,
            kraWeight: perf.kra_weight,
            behavioralWeight: perf.behavioral_weight,
          });
        }
      } else {
        setShowPerformanceSettings(false);
      }
    }
  };

  // STEP 3: Validate base salary >= 50% of gross
  const validateBaseSalary = (baseSalary: number, gross: number) => {
    const percent = (baseSalary / gross) * 100;
    if (percent < 50) {
      return `Base salary must be ≥ 50% of gross. Current: ${percent.toFixed(1)}%`;
    }
    return null;
  };

  // STEP 4: Calculate gross salary with commission slabs
  const calculateGrossSalary = () => {
    if (!selectedStructure || !formData.monthlyBaseSalary) return 0;

    const base = parseFloat(formData.monthlyBaseSalary);
    let total = base;

    // Add allowances
    selectedStructure.salary_components?.forEach(comp => {
      if (comp.component_type === 'ALLOWANCE') {
        total += comp.amount || (base * comp.percent! / 100) || 0;
      }
    });

    // Add commission (if applicable)
    if (selectedStructure.role_type === 'SALES' && formData.monthlySalesTarget) {
      const target = parseFloat(formData.monthlySalesTarget);
      const maxCommission = selectedStructure.commission_slabs
        ?.reduce((max, slab) => Math.max(max, slab.commission_percent || 0), 0) || 0;
      
      // Assume 100% target achievement for now (user can adjust later)
      total += (target * maxCommission) / 100;
    }

    return total;
  };

  // STEP 5: Handle salary structure change (admin override)
  const handleSalaryStructureChange = (structureId: string) => {
    const structure = salaryStructures.find(s => s.id === structureId);
    if (structure) {
      setSelectedStructure(structure);
      setFormData(prev => ({ 
        ...prev, 
        salaryStructure: structureId,
        monthlyBaseSalary: structure.base_salary_amount.toString(),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const grossSalary = calculateGrossSalary();
    const baseSalary = parseFloat(formData.monthlyBaseSalary);
    const validationError = validateBaseSalary(baseSalary, grossSalary);

    if (validationError) {
      alert(validationError);
      return;
    }

    // Create employee salary profile
    const { data: empData, error: empError } = await supabase
      .from('employee_salary_profiles')
      .insert([
        {
          salary_structure_id: formData.salaryStructure,
          access_level: formData.accessLevel,
          employment_type: formData.employmentType,
          leave_entitlement: formData.leaveEntitlement,
          monthly_base_salary: baseSalary,
          monthly_sales_target: formData.monthlySalesTarget ? parseFloat(formData.monthlySalesTarget) : null,
          commencement_date: formData.commencementDate,
        },
      ])
      .select();

    if (empError) {
      console.error('Error creating employee profile:', empError);
      alert('Failed to add employee');
      return;
    }

    alert('Employee added successfully!');
    // Reset form or close modal
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add Personnel</h2>
        <p className="subtitle">Human Capital Records System</p>

        <form onSubmit={handleSubmit}>
          {/* Access Level (triggers structure auto-select) */}
          <div className="form-group">
            <label>Access Level</label>
            <select 
              value={formData.accessLevel}
              onChange={(e) => handleAccessLevelChange(e.target.value)}
              className="form-control"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="DEPARTMENT_LEAD">Department Lead</option>
            </select>
          </div>

          {/* Employment Type */}
          <div className="form-group">
            <label>Employment Type</label>
            <select 
              value={formData.employmentType}
              onChange={(e) => setFormData(prev => ({ ...prev, employmentType: e.target.value }))}
              className="form-control"
            >
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="INTERNSHIP">Internship</option>
            </select>
            {/* Dropdown menu shown above */}
          </div>

          {/* Leave Entitlement */}
          <div className="form-group">
            <label>Leave Entitlement</label>
            <select 
              value={formData.leaveEntitlement}
              onChange={(e) => setFormData(prev => ({ ...prev, leaveEntitlement: e.target.value }))}
              className="form-control"
            >
              <option value="1 Day / Month">1 Day / Month</option>
              <option value="2 Days / Month">2 Days / Month</option>
              <option value="12 Days / Year">12 Days / Year (Standard)</option>
              <option value="20 Days / Year">20 Days / Year</option>
            </select>
          </div>

          {/* ============================================================================ */}
          {/* SALARY STRUCTURE SECTION */}
          {/* ============================================================================ */}
          <div className="section-divider">
            <h3>Salary Structure</h3>
          </div>

          {/* Salary Structure Dropdown (auto-populated, can override) */}
          <div className="form-group">
            <label>Salary Structure Template</label>
            <select 
              value={formData.salaryStructure}
              onChange={(e) => handleSalaryStructureChange(e.target.value)}
              className="form-control"
            >
              <option value="">Select Structure</option>
              {salaryStructures.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role_type})
                </option>
              ))}
            </select>
            {/* Dropdown showing FIXED MONTHLY, HOURLY PAY, etc. */}
          </div>

          {/* Monthly Base Salary */}
          <div className="form-group">
            <label>Monthly Base Salary (₹)</label>
            <input 
              type="number"
              placeholder="e.g., 50000"
              value={formData.monthlyBaseSalary}
              onChange={(e) => setFormData(prev => ({ ...prev, monthlyBaseSalary: e.target.value }))}
              className="form-control"
            />
            <small>Fixed monthly salary amount</small>
          </div>

          {/* Commission Slabs (Only for Sales roles) */}
          {selectedStructure?.role_type === 'SALES' && (
            <>
              <div className="commission-section">
                <h4>Commission Slabs</h4>
                {selectedStructure.commission_slabs?.length ? (
                  <div className="commission-table">
                    <div className="table-header">
                      <span>Target Range</span>
                      <span>Commission %</span>
                      <span>Select</span>
                    </div>
                    {selectedStructure.commission_slabs.map(slab => (
                      <div key={slab.id} className="table-row">
                        <span>{slab.min_target_percent}% - {slab.max_target_percent}%</span>
                        <span>{slab.commission_percent}%</span>
                        <input type="radio" name="commission-slab" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="info-text">No commission slabs configured. Admin must set them up.</p>
                )}
              </div>

              {/* Monthly Sales Target */}
              <div className="form-group">
                <label>Monthly Sales Target (₹)</label>
                <input 
                  type="number"
                  placeholder="e.g., 500000"
                  value={formData.monthlySalesTarget}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthlySalesTarget: e.target.value }))}
                  className="form-control"
                />
                <small>Target sales amount for commission calculation</small>
              </div>
            </>
          )}

          {/* ============================================================================ */}
          {/* PERFORMANCE LINKAGE SECTION (Sales roles only) */}
          {/* ============================================================================ */}
          {showPerformanceSettings && (
            <div className="section-divider">
              <h3>Performance Linkage Settings</h3>
              
              <div className="kpi-controls">
                <div className="weight-slider">
                  <label>KPI Weight (%)</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={performanceSettings.kpiWeight}
                    onChange={(e) => {
                      const newKpi = parseInt(e.target.value);
                      setPerformanceSettings(prev => ({
                        ...prev,
                        kpiWeight: newKpi,
                      }));
                    }}
                  />
                  <span>{performanceSettings.kpiWeight}%</span>
                </div>

                <div className="weight-slider">
                  <label>KRA Weight (%)</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={performanceSettings.kraWeight}
                    onChange={(e) => {
                      const newKra = parseInt(e.target.value);
                      setPerformanceSettings(prev => ({
                        ...prev,
                        kraWeight: newKra,
                      }));
                    }}
                  />
                  <span>{performanceSettings.kraWeight}%</span>
                </div>

                <div className="weight-slider">
                  <label>Behavioral Weight (%)</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={performanceSettings.behavioralWeight}
                    onChange={(e) => {
                      const newBehavioral = parseInt(e.target.value);
                      setPerformanceSettings(prev => ({
                        ...prev,
                        behavioralWeight: newBehavioral,
                      }));
                    }}
                  />
                  <span>{performanceSettings.behavioralWeight}%</span>
                </div>
              </div>

              <div className="warning">
                ⚠️ Weights must sum to 100%. Current: {performanceSettings.kpiWeight + performanceSettings.kraWeight + performanceSettings.behavioralWeight}%
              </div>

              <p className="help-text">
                <strong>KPI (40%):</strong> Key Performance Indicators tied to sales targets and project achievements<br/>
                <strong>KRA (40%):</strong> Key Result Areas measuring work quality and delivery<br/>
                <strong>Behavioral (20%):</strong> Team collaboration, communication, attitude
              </p>
            </div>
          )}

          {/* Commencement Date */}
          <div className="form-group">
            <label>Commencement Date</label>
            <input 
              type="date"
              value={formData.commencementDate}
              onChange={(e) => setFormData(prev => ({ ...prev, commencementDate: e.target.value }))}
              className="form-control"
            />
          </div>

          {/* Gross Salary Display */}
          <div className="gross-salary-display">
            <strong>Expected Gross Monthly Salary:</strong> ₹{calculateGrossSalary().toLocaleString()}
            {selectedStructure && formData.monthlyBaseSalary && (
              <small>
                Base: {((parseFloat(formData.monthlyBaseSalary) / calculateGrossSalary()) * 100).toFixed(1)}% 
                (Must be ≥ 50%)
              </small>
            )}
          </div>

          {/* Buttons */}
          <div className="form-actions">
            <button type="button" className="btn-cancel">Cancel</button>
            <button type="submit" className="btn-primary">Create Profile</button>
          </div>
        </form>
      </div>
    </div>
  );
}
