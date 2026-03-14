const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Mock database
let projects = [
  { id: 1, name: 'Bridge Project A', description: 'Major bridge construction', client: 'Highways England' }
];

let runs = [];

// Calculator implementations (ported from Python)
const calculators = {
  'steel_beam_bending_v1': {
    name: 'Steel I-Beam Bending Check',
    calculate: (inputs) => {
      const { section, span_m, uniform_load_kN_per_m, lateral_restraint, steel_grade } = inputs;

      // Simplified calculations based on EN 1993
      const M_Ed_kNm = (uniform_load_kN_per_m * span_m * span_m) / 8;
      const V_Ed_kN = (uniform_load_kN_per_m * span_m) / 2;

      // Mock section properties
      const W_pl_y = 3140; // cm³
      const f_y = 355; // N/mm²

      const M_c_Rd_kNm = (W_pl_y * 1000 * f_y / 1000) / (1.0 * 1000000);
      const V_pl_Rd_kN = 500; // Simplified

      const utilisation_bending = M_Ed_kNm / M_c_Rd_kNm;
      const utilisation_shear = V_Ed_kN / V_pl_Rd_kN;

      return {
        M_Ed_kNm: Math.round(M_Ed_kNm * 100) / 100,
        V_Ed_kN: Math.round(V_Ed_kN * 100) / 100,
        W_el_y: 2720,
        W_pl_y: W_pl_y,
        I_y: 40100,
        A: 129,
        f_y: f_y,
        f_u: 470,
        M_c_Rd_kNm: Math.round(M_c_Rd_kNm * 100) / 100,
        V_pl_Rd_kN: V_pl_Rd_kN,
        utilisation_bending: Math.round(utilisation_bending * 1000) / 1000,
        utilisation_shear: Math.round(utilisation_shear * 1000) / 1000,
        utilisation_combined: Math.round((utilisation_bending + utilisation_shear) * 1000) / 1000,
        deflection_mm: Math.round(span_m * 1000 / 360),
        deflection_limit_mm: Math.round(span_m * 1000 / 360),
        deflection_check: true,
        bending_check: utilisation_bending <= 1.0,
        shear_check: utilisation_shear <= 1.0,
        overall_check: utilisation_bending <= 1.0 && utilisation_shear <= 1.0,
        warnings: utilisation_bending > 0.8 ? ["High bending utilization"] : [],
        notes: ["Calculations based on EN 1993-1-1", "Simplified analysis"]
      };
    }
  },

  'rc_slab_bending_v1': {
    name: 'RC Slab One/Two-Way Bending',
    calculate: (inputs) => {
      const { thickness_mm, load_kN_m2 } = inputs;

      const area = 1000 * 1000;
      const total_load = load_kN_m2 * area / 1000;
      const M_Ed_kNm = total_load * 0.125;

      const d = thickness_mm - 30;
      const f_ck = 25;
      const f_yk = 500;

      const K = M_Ed_kNm * 1e6 / (1000 * 1000 * (f_ck / 1.5));
      const z = 0.9 * d;
      const As_req = K > 0.167 ? 0.01 : (M_Ed_kNm * 1e6) / (0.87 * (f_yk / 1.15) * z) / 1e6;

      return {
        M_Ed_kNm: Math.round(M_Ed_kNm * 100) / 100,
        total_load_kN: Math.round(total_load * 100) / 100,
        f_ck_N_mm2: f_ck,
        f_yk_N_mm2: f_yk,
        effective_depth_mm: d,
        As_required_m2: Math.round(As_req * 1000000) / 1000000,
        bending_check: K <= 0.167,
        notes: ["Simplified calculation - consult engineer for detailed design"]
      };
    }
  },

  'crane_pad_design_v1': {
    name: 'Crane Pad/Working Platform Design',
    calculate: (inputs) => {
      const { crane_load_kN, pad_length_m, pad_width_m, ground_bearing_capacity_kN_m2, safety_factor } = inputs;

      const pad_area_m2 = pad_length_m * pad_width_m;
      const design_load_kN = crane_load_kN * safety_factor;
      const design_bearing_pressure_kN_m2 = design_load_kN / pad_area_m2;

      const utilisation = design_bearing_pressure_kN_m2 / ground_bearing_capacity_kN_m2;
      const bearing_check = utilisation <= 1.0;

      const required_thickness_m = Math.max(0.3, design_bearing_pressure_kN_m2 / 1000);

      const overturning_moment = crane_load_kN * (pad_length_m / 2);
      const stabilizing_moment = pad_area_m2 * ground_bearing_capacity_kN_m2 * (pad_length_m / 2);
      const stability_ratio = stabilizing_moment / overturning_moment;
      const stability_check = stability_ratio >= 1.5;

      return {
        design_load_kN: Math.round(design_load_kN * 100) / 100,
        pad_area_m2: Math.round(pad_area_m2 * 100) / 100,
        design_bearing_pressure_kN_m2: Math.round(design_bearing_pressure_kN_m2 * 100) / 100,
        ground_capacity_kN_m2: ground_bearing_capacity_kN_m2,
        utilisation_bearing: Math.round(utilisation * 1000) / 1000,
        bearing_check: bearing_check,
        required_thickness_m: Math.round(required_thickness_m * 100) / 100,
        stability_ratio: Math.round(stability_ratio * 100) / 100,
        stability_check: stability_check,
        overall_check: bearing_check && stability_check,
        notes: ["Simplified design - detailed geotechnical assessment required"]
      };
    }
  },

  'pad_footing_bearing_v1': {
    name: 'Pad Footing Bearing Check',
    calculate: (inputs) => {
      const { footing_length_m, footing_width_m, vertical_load_kN, horizontal_load_kN, moment_kNm, soil_bearing_capacity_kN_m2 } = inputs;

      const footing_area_m2 = footing_length_m * footing_width_m;
      const V_d_kN = vertical_load_kN * 1.4;
      const H_d_kN = horizontal_load_kN * 1.3;

      const sigma_v_kN_m2 = V_d_kN / footing_area_m2;
      const bearing_capacity_kN_m2 = soil_bearing_capacity_kN_m2 / 1.0;
      const utilisation_bearing = sigma_v_kN_m2 / bearing_capacity_kN_m2;
      const bearing_check = utilisation_bearing <= 1.0;

      const friction_coefficient = Math.tan(30 * Math.PI / 180);
      const sliding_resistance_kN = V_d_kN * friction_coefficient;
      const utilisation_sliding = H_d_kN / sliding_resistance_kN;
      const sliding_check = utilisation_sliding <= 1.0;

      return {
        footing_area_m2: Math.round(footing_area_m2 * 100) / 100,
        V_d_kN: Math.round(V_d_kN * 100) / 100,
        H_d_kN: Math.round(H_d_kN * 100) / 100,
        M_d_kNm: Math.round(moment_kNm * 1.3 * 100) / 100,
        sigma_v_kN_m2: Math.round(sigma_v_kN_m2 * 100) / 100,
        bearing_capacity_kN_m2: bearing_capacity_kN_m2,
        utilisation_bearing: Math.round(utilisation_bearing * 1000) / 1000,
        bearing_check: bearing_check,
        sliding_resistance_kN: Math.round(sliding_resistance_kN * 100) / 100,
        utilisation_sliding: Math.round(utilisation_sliding * 1000) / 1000,
        sliding_check: sliding_check,
        overall_check: bearing_check && sliding_check,
        soil_friction_angle_deg: 30,
        notes: ["Simplified analysis - detailed geotechnical investigation required"]
      };
    }
  }
};

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'beaver-calc-mock-api' });
});

app.get('/api/projects', (req, res) => {
  res.json({ projects });
});

app.post('/api/projects', (req, res) => {
  const project = {
    id: projects.length + 1,
    ...req.body,
    created_at: new Date().toISOString()
  };
  projects.push(project);
  res.json({ message: 'Project created successfully', project });
});

app.get('/api/calculators', (req, res) => {
  const calculatorList = Object.keys(calculators).map(key => ({
    key,
    name: calculators[key].name,
    version: '1.0.0',
    description: `${calculators[key].name} calculator`,
    category: key.includes('steel') ? 'structural' :
              key.includes('rc') ? 'structural' :
              key.includes('crane') ? 'temporary_works' : 'geotechnical'
  }));
  res.json({ calculators: calculatorList });
});

app.get('/api/calculators/:key', (req, res) => {
  const { key } = req.params;
  if (!calculators[key]) {
    return res.status(404).json({ error: 'Calculator not found' });
  }

  res.json({
    calculator: {
      key,
      name: calculators[key].name,
      version: '1.0.0',
      description: `${calculators[key].name} calculator`,
      category: key.includes('steel') ? 'structural' :
                key.includes('rc') ? 'structural' :
                key.includes('crane') ? 'temporary_works' : 'geotechnical',
      input_schema: {},
      output_schema: {},
      reference_text: 'EN/BS Standards'
    }
  });
});

app.post('/api/runs', (req, res) => {
  const { calculator, project_id, inputs } = req.body;

  if (!calculators[calculator]) {
    return res.status(404).json({ error: 'Calculator not found' });
  }

  try {
    const results = calculators[calculator].calculate(inputs);
    const run = {
      id: runs.length + 1,
      run_id: `run_${Date.now()}`,
      project_id,
      calculator_key: calculator,
      status: 'completed',
      inputs,
      results,
      created_at: new Date().toISOString()
    };

    runs.push(run);
    res.json({
      message: 'Run completed successfully',
      run: {
        id: run.id,
        run_id: run.run_id,
        status: run.status,
        created_at: run.created_at
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Calculation failed',
      message: error.message
    });
  }
});

app.get('/api/runs/:runId', (req, res) => {
  const { runId } = req.params;
  const run = runs.find(r => r.run_id === runId);

  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }

  res.json({ run });
});

app.get('/api/runs', (req, res) => {
  res.json({
    runs: runs.map(run => ({
      id: run.id,
      run_id: run.run_id,
      project_id: run.project_id,
      calculator_key: run.calculator_key,
      status: run.status,
      created_at: run.created_at
    })),
    total: runs.length
  });
});

app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
  console.log('Available calculators:', Object.keys(calculators));
});
