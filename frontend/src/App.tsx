import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import './App.css';

// Components
import CalculatorForm from './components/CalculatorForm';
import CalculatorList from './components/CalculatorList';
import ErrorBoundary from './components/ErrorBoundary';
import FeaturedProjects from './components/FeaturedProjects';
import FloatingNav from './components/FloatingNav';
import Hero from './components/Hero';
import Login from './components/Login';
import ResultsView from './components/ResultsView';

// Pages
import Admin from './pages/Admin';
import ChangeLog from './pages/ChangeLog';
import CompareRuns from './pages/CompareRuns';
import Libraries from './pages/Libraries';
import Projects from './pages/Projects';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ToastDemo from './pages/ToastDemo';
import Abutments from './pages/calculators/Abutments';
import AccessRamps from './pages/calculators/AccessRamps';
import BasePlate from './pages/calculators/BasePlate';
import BearingReactions from './pages/calculators/BearingReactions';
import BogMats from './pages/calculators/BogMats';
import BoltPattern from './pages/calculators/BoltPattern';
import Bracing from './pages/calculators/Bracing';
import CombinationBuilder from './pages/calculators/CombinationBuilder';
import CombinedLoading from './pages/calculators/CombinedLoading';
import CompositeBeam from './pages/calculators/CompositeBeam';
import CrackWidth from './pages/calculators/CrackWidth';
import CranePadDesign from './pages/calculators/CranePadDesign';
import CutFillVolumes from './pages/calculators/CutFillVolumes';
import DeckSlab from './pages/calculators/DeckSlab';
import ElastomericBearings from './pages/calculators/ElastomericBearings';
import EndPlate from './pages/calculators/EndPlate';
import ExcavationSheetPile from './pages/calculators/ExcavationSheetPile';
import Falsework from './pages/calculators/Falsework';
import FormworkPressure from './pages/calculators/FormworkPressure';
import GRSWall from './pages/calculators/GRSWall';
import GeogridDesign from './pages/calculators/GeogridDesign';
import GravityWall from './pages/calculators/GravityWall';
import Grillage from './pages/calculators/Grillage';
import GroundMats from './pages/calculators/GroundMats';
import GuardrailChecks from './pages/calculators/GuardrailChecks';
import HaulRoad from './pages/calculators/HaulRoad';
import HerasFence from './pages/calculators/HerasFence';
import Hoarding from './pages/calculators/Hoarding';
import HolePatternDXF from './pages/calculators/HolePatternDXF';
import LTBCheck from './pages/calculators/LTBCheck';
import LegatoWall from './pages/calculators/LegatoWall';
import LoadSpread from './pages/calculators/LoadSpread';
import MemberRatings from './pages/calculators/MemberRatings';
import MovementJoints from './pages/calculators/MovementJoints';
import NeedleBeam from './pages/calculators/NeedleBeam';
import NegativeSkinFriction from './pages/calculators/NegativeSkinFriction';
import PadFootingBearing from './pages/calculators/PadFootingBearing';
import PierDesign from './pages/calculators/PierDesign';
import PileCapacity from './pages/calculators/PileCapacity';
import PileFoundations from './pages/calculators/PileFoundations';
import PunchingShear from './pages/calculators/PunchingShear';
import RCBeam from './pages/calculators/RCBeam';
import RCSlabBending from './pages/calculators/RCSlabBending';
import RakingProps from './pages/calculators/RakingProps';
import Sensitivity from './pages/calculators/Sensitivity';
import SlingAngle from './pages/calculators/SlingAngle';
import SlingChecks from './pages/calculators/SlingChecks';
import SlopeStability from './pages/calculators/SlopeStability';
import SoffitShores from './pages/calculators/SoffitShores';
import SpreadFootings from './pages/calculators/SpreadFootings';
import SpreaderBeam from './pages/calculators/SpreaderBeam';
import SteelBeamBending from './pages/calculators/SteelBeamBending';
import SteelPlateGirder from './pages/calculators/SteelPlateGirder';
import StripFooting from './pages/calculators/StripFooting';
import SweptPath from './pages/calculators/SweptPath';
import TemporaryParapet from './pages/calculators/TemporaryParapet';
import ThermalActions from './pages/calculators/ThermalActions';
import TimberConnection from './pages/calculators/TimberConnection';
import Trackmats from './pages/calculators/Trackmats';
import TrafficActions from './pages/calculators/TrafficActions';
import TransverseMembers from './pages/calculators/TransverseMembers';
import TrenchSupport from './pages/calculators/TrenchSupport';
import TurningPlatform from './pages/calculators/TurningPlatform';
import VerticalProps from './pages/calculators/VerticalProps';
import WindActions from './pages/calculators/WindActions';
import WorkingArea from './pages/calculators/WorkingArea';
import WorkingPlatform from './pages/calculators/WorkingPlatform';

// Missing calculator imports
import AnchorBolt from './pages/calculators/AnchorBolt';
import Batters from './pages/calculators/Batters';
import BoltedConnection from './pages/calculators/BoltedConnection';
import CantileverWall from './pages/calculators/CantileverWall';
import CompositeQuick from './pages/calculators/CompositeQuick';
import ErectionStages from './pages/calculators/ErectionStages';
import FinPlate from './pages/calculators/FinPlate';
import GabionWall from './pages/calculators/GabionWall';
import GroundAnchor from './pages/calculators/GroundAnchor';
import LegatoQuantity from './pages/calculators/LegatoQuantity';
import LiftLoadSheet from './pages/calculators/LiftLoadSheet';
import LoadCombinations from './pages/calculators/LoadCombinations';
import NotionalWind from './pages/calculators/NotionalWind';
import RCColumn from './pages/calculators/RCColumn';
import RCSlab from './pages/calculators/RCSlab';
import ShearStuds from './pages/calculators/ShearStuds';
import SheetPile from './pages/calculators/SheetPile';
import SixF2Quantity from './pages/calculators/SixF2Quantity';
import SoilNail from './pages/calculators/SoilNail';
import SteelColumnAxial from './pages/calculators/SteelColumnAxial';
import TimberMember from './pages/calculators/TimberMember';
import TimberQuantity from './pages/calculators/TimberQuantity';
import WeldSizing from './pages/calculators/WeldSizing';
import WindLoad from './pages/calculators/WindLoad';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f]">
            <FloatingNav />
            <main className="relative z-10">
              <Routes>
                <Route
                  path="/"
                  element={
                    <>
                      <Hero
                        title="Engineer with Precision"
                        subtitle="Professional structural calculations with real-time verification to EN standards"
                        showCTA={true}
                      />
                      <FeaturedProjects />
                      <div className="container px-4 py-16 mx-auto">
                        <CalculatorList />
                      </div>
                    </>
                  }
                />
                <Route path="/projects" element={<Projects />} />
                <Route path="/compare" element={<CompareRuns />} />
                <Route path="/libraries/*" element={<Libraries />} />
                <Route path="/calculator/change_log" element={<ChangeLog />} />
                <Route path="/toast-demo" element={<ToastDemo />} />

                {/* Bridges */}
                <Route path="/calculator/abutments" element={<Abutments />} />
                <Route path="/calculator/abutments_v1" element={<Abutments />} />
                <Route path="/calculator/bearing_reactions" element={<BearingReactions />} />
                <Route path="/calculator/composite_beam" element={<CompositeBeam />} />
                <Route path="/calculator/deck_slab" element={<DeckSlab />} />
                <Route path="/calculator/elastomeric_bearings" element={<ElastomericBearings />} />
                <Route path="/calculator/movement_joints" element={<MovementJoints />} />
                <Route path="/calculator/pier_design" element={<PierDesign />} />
                <Route path="/calculator/steel_plate_girder" element={<SteelPlateGirder />} />
                <Route path="/calculator/transverse_members" element={<TransverseMembers />} />

                {/* Structures */}
                <Route path="/calculator/bracing" element={<Bracing />} />
                <Route path="/calculator/member_ratings" element={<MemberRatings />} />
                <Route path="/calculator/rc_slab_bending" element={<RCSlabBending />} />
                <Route path="/calculator/steel_beam_bending" element={<SteelBeamBending />} />
                <Route path="/calculator/grillage" element={<Grillage />} />

                {/* Geotechnics */}
                <Route path="/calculator/pad_footing_bearing" element={<PadFootingBearing />} />
                <Route path="/calculator/pile_foundations" element={<PileFoundations />} />
                <Route path="/calculator/pile_capacity" element={<PileCapacity />} />
                <Route
                  path="/calculator/negative_skin_friction"
                  element={<NegativeSkinFriction />}
                />
                <Route path="/calculator/negative_skin" element={<NegativeSkinFriction />} />
                <Route path="/calculator/spread_footings" element={<SpreadFootings />} />
                <Route path="/calculator/strip_footing" element={<StripFooting />} />
                <Route path="/calculator/load_spread" element={<LoadSpread />} />
                {/* Trench Support is under Temporary Works sometimes, but here maybe Geotechnics? Keeping typical */}

                {/* Temporary Works */}
                <Route path="/calculator/access_ramps" element={<AccessRamps />} />
                <Route path="/calculator/bog_mats" element={<BogMats />} />
                <Route path="/calculator/crane_pad_design" element={<CranePadDesign />} />
                <Route path="/calculator/excavation_sheeting" element={<ExcavationSheetPile />} />
                <Route path="/calculator/load_sheet" element={<LiftLoadSheet />} />
                <Route path="/calculator/falsework" element={<Falsework />} />
                <Route path="/calculator/formwork_pressure" element={<FormworkPressure />} />
                <Route path="/calculator/haul_road" element={<HaulRoad />} />
                <Route path="/calculator/heras_fence" element={<HerasFence />} />
                <Route path="/calculator/hoarding" element={<Hoarding />} />
                <Route path="/calculator/needling" element={<NeedleBeam />} />
                <Route path="/calculator/needle_beam" element={<NeedleBeam />} />
                <Route path="/calculator/raking_props" element={<RakingProps />} />
                <Route path="/calculator/sling_checks" element={<SlingChecks />} />
                <Route path="/calculator/soffit_shores" element={<SoffitShores />} />
                <Route path="/calculator/spreader_beam" element={<SpreaderBeam />} />
                <Route path="/calculator/trackmats" element={<Trackmats />} />
                <Route path="/calculator/trench_support" element={<TrenchSupport />} />
                <Route path="/calculator/turning_platform" element={<TurningPlatform />} />
                <Route path="/calculator/vertical_props" element={<VerticalProps />} />
                <Route path="/calculator/temporary_parapet" element={<TemporaryParapet />} />
                <Route path="/calculator/temp_parapet" element={<TemporaryParapet />} />
                <Route path="/calculator/guardrail" element={<GuardrailChecks />} />
                <Route path="/calculator/guardrail_checks" element={<GuardrailChecks />} />
                <Route path="/calculator/working_platform" element={<WorkingPlatform />} />

                {/* Earthworks */}
                <Route path="/calculator/slope_stability" element={<SlopeStability />} />
                <Route path="/calculator/cut_fill_volumes" element={<CutFillVolumes />} />
                <Route path="/calculator/cut_fill" element={<CutFillVolumes />} />

                {/* Retaining Structures */}
                <Route path="/calculator/legato_wall" element={<LegatoWall />} />
                <Route path="/calculator/gravity_wall" element={<GravityWall />} />
                <Route path="/calculator/grs_wall" element={<GRSWall />} />

                {/* Ground Improvement */}
                <Route path="/calculator/ground_mats" element={<GroundMats />} />
                <Route path="/calculator/geogrid_design" element={<GeogridDesign />} />
                <Route path="/calculator/geogrid" element={<GeogridDesign />} />

                {/* Steel Connections */}
                <Route path="/calculator/base_plate" element={<BasePlate />} />
                <Route path="/calculator/end_plate" element={<EndPlate />} />

                {/* Concrete */}
                <Route path="/calculator/crack_width" element={<CrackWidth />} />
                <Route path="/calculator/rc_beam" element={<RCBeam />} />
                <Route path="/calculator/punching_shear" element={<PunchingShear />} />

                {/* Steel Members */}
                <Route path="/calculator/ltb_check" element={<LTBCheck />} />
                <Route path="/calculator/combined_loading" element={<CombinedLoading />} />
                <Route path="/calculator/plate_girder" element={<SteelPlateGirder />} />

                {/* Timber */}
                <Route path="/calculator/timber_connection" element={<TimberConnection />} />

                {/* Construction Logistics */}
                <Route path="/calculator/swept_path" element={<SweptPath />} />
                <Route path="/calculator/working_area" element={<WorkingArea />} />
                <Route path="/calculator/sling_angle" element={<SlingAngle />} />

                {/* Site Tools */}
                <Route path="/calculator/bolt_pattern" element={<BoltPattern />} />
                <Route path="/calculator/hole_pattern_dxf" element={<HolePatternDXF />} />

                {/* Loads & Analysis */}
                <Route path="/calculator/combination_builder" element={<CombinationBuilder />} />
                <Route path="/calculator/sensitivity" element={<Sensitivity />} />
                <Route path="/calculator/thermal_actions" element={<ThermalActions />} />
                <Route path="/calculator/traffic_actions" element={<TrafficActions />} />
                <Route path="/calculator/wind_actions" element={<WindActions />} />

                {/* Additional Calculators */}
                <Route path="/calculator/anchor_bolt" element={<AnchorBolt />} />
                <Route path="/calculator/batters" element={<Batters />} />
                <Route path="/calculator/bolted_connection" element={<BoltedConnection />} />
                <Route path="/calculator/cantilever_wall" element={<CantileverWall />} />
                <Route path="/calculator/composite_quick" element={<CompositeQuick />} />
                <Route path="/calculator/erection_stages" element={<ErectionStages />} />
                <Route path="/calculator/fin_plate" element={<FinPlate />} />
                <Route path="/calculator/gabion_wall" element={<GabionWall />} />
                <Route path="/calculator/ground_anchor" element={<GroundAnchor />} />
                <Route path="/calculator/legato_quantity" element={<LegatoQuantity />} />
                <Route path="/calculator/lift_load_sheet" element={<LiftLoadSheet />} />
                <Route path="/calculator/load_combinations" element={<LoadCombinations />} />
                <Route path="/calculator/notional_wind" element={<NotionalWind />} />
                <Route path="/calculator/rc_column" element={<RCColumn />} />
                <Route path="/calculator/rc_slab" element={<RCSlab />} />
                <Route path="/calculator/shear_studs" element={<ShearStuds />} />
                <Route path="/calculator/sheet_pile" element={<SheetPile />} />
                <Route path="/calculator/6f2_quantity" element={<SixF2Quantity />} />
                <Route path="/calculator/six_f2_quantity" element={<SixF2Quantity />} />
                <Route path="/calculator/soil_nail" element={<SoilNail />} />
                <Route path="/calculator/steel_column_axial" element={<SteelColumnAxial />} />
                <Route path="/calculator/timber_member" element={<TimberMember />} />
                <Route path="/calculator/timber_quantity" element={<TimberQuantity />} />
                <Route path="/calculator/weld_sizing" element={<WeldSizing />} />
                <Route path="/calculator/wind_load" element={<WindLoad />} />

                <Route
                  path="/calculator/:key"
                  element={
                    <div className="container px-4 py-32 mx-auto">
                      <CalculatorForm />
                    </div>
                  }
                />
                <Route
                  path="/results/:runId"
                  element={
                    <div className="container px-4 py-32 mx-auto">
                      <ResultsView />
                    </div>
                  }
                />
                <Route path="/admin/*" element={<Admin />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route
                  path="/login"
                  element={
                    <div className="container px-4 py-32 mx-auto">
                      <Login />
                    </div>
                  }
                />
              </Routes>
            </main>

            {/* Toast Notifications */}
            <Toaster
              position="bottom-right"
              expand={true}
              richColors
              closeButton
              theme="dark"
              toastOptions={{
                style: {
                  background: 'rgba(10, 10, 15, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                },
              }}
            />
          </div>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
