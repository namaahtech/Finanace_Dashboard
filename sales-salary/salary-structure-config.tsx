// app/admin/settings/salary-structure-config.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';

export default function SalaryStructureConfig() {
  const supabase = createClientComponentClient<Database>();
  const [activeTab, setActiveTab] = useState<'structures' | 'slabs' | 'components' | 'performance'>('structures');
  const [structures, setStructures] = useState<any[]>([]);
  const [selectedStructure, setSelectedStructure] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  // Form state for new structure
  const [newStructure, setNewStructure] = useState({
    name: '',
    roleType: 'SALES',
    salaryType: 'FIXED_MONTHLY',
    baseSalaryAmount: '',
    baseSalaryPercent: 50,
  });

  useEffect(() => {
    fetchStructures();
  }, []);

  const fetchStructures = async () => {
    const { data, error } = await supabase
      .from('salary_structures')
      .select(`
        *,
        commission_slabs (*),
        salary_components (*),
        performance_linkage (*)
      `);

    if (error) {
      console.error('Error fetching structures:', error);
      return;
    }

    setStructures(data as any[]);
  };

  const handleCreateStructure = async () => {
    const { error } = await supabase
      .from('salary_structures')
      .insert([
        {
          name: newStructure.name,
          role_type: newStructure.roleType,
          salary_type: newStructure.salaryType,
          base_salary_amount: parseFloat(newStructure.baseSalaryAmount),
          base_salary_percent: newStructure.baseSalaryPercent,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating structure:', error);
      return;
    }

    setNewStructure({
      name: '',
      roleType: 'SALES',
      salaryType: 'FIXED_MONTHLY',
      baseSalaryAmount: '',
      baseSalaryPercent: 50,
    });
    setShowModal(false);
    fetchStructures();
  };

  return (
    <div className="settings-container">
      <h1>Salary Structure Configuration</h1>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={activeTab === 'structures' ? 'active' : ''}
          onClick={() => setActiveTab('structures')}
        >
          Salary Structures
        </button>
        <button 
          className={activeTab === 'slabs' ? 'active' : ''}
          onClick={() => setActiveTab('slabs')}
        >
          Commission Slabs
        </button>
        <button 
          className={activeTab === 'components' ? 'active' : ''}
          onClick={() => setActiveTab('components')}
        >
          Components
        </button>
        <button 
          className={activeTab === 'performance' ? 'active' : ''}
          onClick={() => setActiveTab('performance')}
        >
          Performance Linkage
        </button>
      </div>

      {/* TAB 1: Salary Structures */}
      {activeTab === 'structures' && (
        <div className="tab-content">
          <div className="toolbar">
            <h2>Role-Based Salary Structures</h2>
            <button 
              className="btn-primary"
              onClick={() => setShowModal(true)}
            >
              + New Structure
            </button>
          </div>

          <div className="structures-grid">
            {structures.map(structure => (
              <div 
                key={structure.id} 
                className="structure-card"
                onClick={() => setSelectedStructure(structure)}
              >
                <h3>{structure.name}</h3>
                <div className="card-info">
                  <div className="info-row">
                    <span>Role Type:</span>
                    <strong>{structure.role_type}</strong>
                  </div>
                  <div className="info-row">
                    <span>Salary Type:</span>
                    <strong>{structure.salary_type}</strong>
                  </div>
                  <div className="info-row">
                    <span>Base Salary:</span>
                    <strong>₹{structure.base_salary_amount.toLocaleString()}</strong>
                  </div>
                  <div className="info-row">
                    <span>Min Base %:</span>
                    <strong>{structure.base_salary_percent}%</strong>
                  </div>
                </div>

                {/* Commission Slabs (if sales) */}
                {structure.commission_slabs?.length > 0 && (
                  <div className="section">
                    <h4>Commission Slabs ({structure.commission_slabs.length})</h4>
                    {structure.commission_slabs.map((slab: any) => (
                      <div key={slab.id} className="slab-item">
                        <span>{slab.min_target_percent}%-{slab.max_target_percent}%</span>
                        <strong>{slab.commission_percent}%</strong>
                      </div>
                    ))}
                  </div>
                )}

                {/* Components (Allowances) */}
                {structure.salary_components?.length > 0 && (
                  <div className="section">
                    <h4>Components ({structure.salary_components.length})</h4>
                    {structure.salary_components.map((comp: any) => (
                      <div key={comp.id} className="component-item">
                        <span>{comp.component_name}</span>
                        <strong>₹{comp.amount || `${comp.percent}%`}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Create Structure Modal */}
          {showModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2>Create Salary Structure</h2>

                <div className="form-group">
                  <label>Structure Name</label>
                  <input 
                    type="text"
                    placeholder="e.g., Sales Representative"
                    value={newStructure.name}
                    onChange={(e) => setNewStructure(prev => ({ ...prev, name: e.target.value }))}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Role Type</label>
                  <select 
                    value={newStructure.roleType}
                    onChange={(e) => setNewStructure(prev => ({ ...prev, roleType: e.target.value }))}
                    className="form-control"
                  >
                    <option value="SALES">Sales</option>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Salary Type</label>
                  <select 
                    value={newStructure.salaryType}
                    onChange={(e) => setNewStructure(prev => ({ ...prev, salaryType: e.target.value }))}
                    className="form-control"
                  >
                    <option value="FIXED_MONTHLY">Fixed Monthly</option>
                    <option value="HOURLY_PAY">Hourly Pay</option>
                    <option value="DAILY_PAY">Daily Pay</option>
                    <option value="STIPEND">Stipend</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Base Salary Amount (₹)</label>
                  <input 
                    type="number"
                    placeholder="e.g., 30000"
                    value={newStructure.baseSalaryAmount}
                    onChange={(e) => setNewStructure(prev => ({ ...prev, baseSalaryAmount: e.target.value }))}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Minimum Base Salary % (Legal requirement: ≥ 50%)</label>
                  <input 
                    type="number"
                    min="50"
                    max="100"
                    value={newStructure.baseSalaryPercent}
                    onChange={(e) => setNewStructure(prev => ({ ...prev, baseSalaryPercent: parseInt(e.target.value) }))}
                    className="form-control"
                  />
                </div>

                <div className="form-actions">
                  <button 
                    className="btn-cancel"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={handleCreateStructure}
                  >
                    Create Structure
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Commission Slabs */}
      {activeTab === 'slabs' && (
        <div className="tab-content">
          <h2>Commission Slabs Configuration</h2>
          <p>Select a sales structure above to configure commission tiers</p>
          
          {selectedStructure && selectedStructure.role_type === 'SALES' && (
            <CommissionSlabsManager structure={selectedStructure} />
          )}
        </div>
      )}

      {/* TAB 3: Salary Components */}
      {activeTab === 'components' && (
        <div className="tab-content">
          <h2>Salary Components (Allowances)</h2>
          <p>Add allowances, deductions, benefits to structures</p>
          
          {selectedStructure && (
            <SalaryComponentsManager structure={selectedStructure} />
          )}
        </div>
      )}

      {/* TAB 4: Performance Linkage */}
      {activeTab === 'performance' && (
        <div className="tab-content">
          <h2>Performance Linkage Settings</h2>
          <p>Configure KPI/KRA/Behavioral weights for performance bonuses</p>
          
          {selectedStructure && (
            <PerformanceLinkageManager structure={selectedStructure} />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Component: Commission Slabs Manager
 */
function CommissionSlabsManager({ structure }: { structure: any }) {
  const supabase = createClientComponentClient<Database>();
  const [slabs, setSlabs] = useState(structure.commission_slabs || []);
  const [newSlab, setNewSlab] = useState({
    minTarget: 0,
    maxTarget: 50,
    commission: 0,
  });

  const handleAddSlab = async () => {
    const { error } = await supabase
      .from('commission_slabs')
      .insert([
        {
          salary_structure_id: structure.id,
          slab_name: `Tier ${slabs.length + 1}`,
          min_target_percent: newSlab.minTarget,
          max_target_percent: newSlab.maxTarget,
          commission_percent: newSlab.commission,
        },
      ]);

    if (error) {
      console.error('Error adding slab:', error);
      return;
    }

    setNewSlab({ minTarget: 0, maxTarget: 50, commission: 0 });
    // Refresh slabs
  };

  return (
    <div className="component-manager">
      <div className="slabs-list">
        {slabs.map((slab: any) => (
          <div key={slab.id} className="slab-card">
            <div className="slab-header">
              <span>{slab.min_target_percent}% - {slab.max_target_percent}%</span>
              <strong>{slab.commission_percent}% Commission</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="form-group">
        <h3>Add New Commission Slab</h3>
        <div className="form-row">
          <input 
            type="number"
            placeholder="Min target %"
            value={newSlab.minTarget}
            onChange={(e) => setNewSlab(prev => ({ ...prev, minTarget: parseInt(e.target.value) }))}
          />
          <input 
            type="number"
            placeholder="Max target %"
            value={newSlab.maxTarget}
            onChange={(e) => setNewSlab(prev => ({ ...prev, maxTarget: parseInt(e.target.value) }))}
          />
          <input 
            type="number"
            placeholder="Commission %"
            step="0.1"
            value={newSlab.commission}
            onChange={(e) => setNewSlab(prev => ({ ...prev, commission: parseFloat(e.target.value) }))}
          />
          <button onClick={handleAddSlab} className="btn-primary">Add Slab</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Component: Salary Components Manager
 */
function SalaryComponentsManager({ structure }: { structure: any }) {
  const supabase = createClientComponentClient<Database>();
  const [components, setComponents] = useState(structure.salary_components || []);
  const [newComponent, setNewComponent] = useState({
    name: '',
    type: 'ALLOWANCE',
    amount: '',
  });

  const handleAddComponent = async () => {
    const { error } = await supabase
      .from('salary_components')
      .insert([
        {
          salary_structure_id: structure.id,
          component_name: newComponent.name,
          component_type: newComponent.type,
          amount: newComponent.amount ? parseFloat(newComponent.amount) : null,
        },
      ]);

    if (error) {
      console.error('Error adding component:', error);
      return;
    }

    setNewComponent({ name: '', type: 'ALLOWANCE', amount: '' });
  };

  return (
    <div className="component-manager">
      <div className="components-list">
        {components.map((comp: any) => (
          <div key={comp.id} className="component-card">
            <div className="comp-header">
              <span>{comp.component_name}</span>
              <strong>{comp.component_type}</strong>
            </div>
            <div className="comp-amount">₹{comp.amount || `${comp.percent}%`}</div>
          </div>
        ))}
      </div>

      <div className="form-group">
        <h3>Add New Component</h3>
        <div className="form-row">
          <input 
            type="text"
            placeholder="Component name (e.g., Travel Allowance)"
            value={newComponent.name}
            onChange={(e) => setNewComponent(prev => ({ ...prev, name: e.target.value }))}
          />
          <select 
            value={newComponent.type}
            onChange={(e) => setNewComponent(prev => ({ ...prev, type: e.target.value }))}
          >
            <option value="ALLOWANCE">Allowance</option>
            <option value="DEDUCTION">Deduction</option>
            <option value="BENEFIT">Benefit</option>
          </select>
          <input 
            type="number"
            placeholder="Amount (₹)"
            value={newComponent.amount}
            onChange={(e) => setNewComponent(prev => ({ ...prev, amount: e.target.value }))}
          />
          <button onClick={handleAddComponent} className="btn-primary">Add Component</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Component: Performance Linkage Manager
 */
function PerformanceLinkageManager({ structure }: { structure: any }) {
  const supabase = createClientComponentClient<Database>();
  const [perfLinkage, setPerfLinkage] = useState(structure.performance_linkage?.[0] || {
    kpi_weight: 40,
    kra_weight: 40,
    behavioral_weight: 20,
  });

  const handleUpdate = async () => {
    const { error } = await supabase
      .from('performance_linkage')
      .upsert([
        {
          salary_structure_id: structure.id,
          kpi_weight: perfLinkage.kpi_weight,
          kra_weight: perfLinkage.kra_weight,
          behavioral_weight: perfLinkage.behavioral_weight,
        },
      ]);

    if (error) {
      console.error('Error updating performance linkage:', error);
      return;
    }

    alert('Performance linkage updated!');
  };

  const total = perfLinkage.kpi_weight + perfLinkage.kra_weight + perfLinkage.behavioral_weight;

  return (
    <div className="performance-manager">
      <div className="weight-controls">
        <div className="weight-slider">
          <label>KPI Weight (%)</label>
          <input 
            type="range"
            min="0"
            max="100"
            value={perfLinkage.kpi_weight}
            onChange={(e) => setPerfLinkage(prev => ({ ...prev, kpi_weight: parseInt(e.target.value) }))}
          />
          <span>{perfLinkage.kpi_weight}%</span>
        </div>

        <div className="weight-slider">
          <label>KRA Weight (%)</label>
          <input 
            type="range"
            min="0"
            max="100"
            value={perfLinkage.kra_weight}
            onChange={(e) => setPerfLinkage(prev => ({ ...prev, kra_weight: parseInt(e.target.value) }))}
          />
          <span>{perfLinkage.kra_weight}%</span>
        </div>

        <div className="weight-slider">
          <label>Behavioral Weight (%)</label>
          <input 
            type="range"
            min="0"
            max="100"
            value={perfLinkage.behavioral_weight}
            onChange={(e) => setPerfLinkage(prev => ({ ...prev, behavioral_weight: parseInt(e.target.value) }))}
          />
          <span>{perfLinkage.behavioral_weight}%</span>
        </div>
      </div>

      <div className={`total-warning ${total !== 100 ? 'error' : 'success'}`}>
        <strong>Total Weight: {total}%</strong> {total !== 100 && '⚠️ Must equal 100%'}
      </div>

      <button 
        onClick={handleUpdate}
        disabled={total !== 100}
        className="btn-primary"
      >
        Save Performance Linkage
      </button>
    </div>
  );
}
