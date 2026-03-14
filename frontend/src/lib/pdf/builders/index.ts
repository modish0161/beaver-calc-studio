// ============================================================================
// BeaverCalc Studio — Report Builders
// Barrel export for calculator-specific data builders
// ============================================================================

// Steel Plate Girder
export {
  buildSteelPlateGirderReport,
  type BuilderOptions,
  type SteelPlateGirderFormData,
  type SteelPlateGirderResults,
} from "./steelPlateGirderBuilder";

// Ground Improvement
export {
  buildGeogridDesignReport,
  type GeogridDesignFormData,
  type GeogridDesignResults,
} from "./geogridDesignBuilder";

export {
  buildGroundMatsReport,
  type GroundMatsFormData,
  type GroundMatsResults,
} from "./groundMatsBuilder";

export {
  buildGRSWallReport,
  type GRSWallFormData,
  type GRSWallResults,
} from "./grsWallBuilder";

// Retaining Structures
export {
  buildLegatoWallReport,
  type LegatoWallFormData,
  type LegatoWallResults,
} from "./legatoWallBuilder";

export {
  buildGravityWallReport,
  type GravityWallFormData,
  type GravityWallResults,
} from "./gravityWallBuilder";

// Foundations
export {
  buildNegativeSkinFrictionReport,
  type NegativeSkinFrictionFormData,
  type NegativeSkinFrictionResults,
} from "./negativeSkinFrictionBuilder";

export {
  buildSlopeStabilityReport,
  type SlopeStabilityFormData,
  type SlopeStabilityResults,
} from "./slopeStabilityBuilder";

export {
  buildStripFootingReport,
  type StripFootingFormData,
  type StripFootingResults,
} from "./stripFootingBuilder";

export {
  buildPileFoundationsReport,
  type PileFoundationsFormData,
  type PileFoundationsResults,
} from "./pileFoundationsBuilder";

// Concrete
export {
  buildRCBeamReport,
  type RCBeamFormData,
  type RCBeamResults,
} from "./rcBeamBuilder";

// Timber
export {
  buildTimberMemberReport,
  type TimberMemberFormData,
  type TimberMemberResults,
} from "./timberMemberBuilder";

// Composite
export {
  buildCompositeBeamReport,
  type BuilderOptions as CompositeBeamBuilderOptions,
} from "./compositeBeamBuilder";

// Steel Connections
export {
  buildBasePlateReport,
  type BasePlateFormData,
  type BasePlateResults,
} from "./basePlateBuilder";

export {
  buildEndPlateReport,
  type EndPlateFormData,
  type EndPlateResults,
} from "./endPlateBuilder";

export {
  buildBoltedConnectionReport,
  type BoltedConnectionFormData,
  type BoltedConnectionResults,
} from "./boltedConnectionBuilder";

export {
  buildWeldSizingReport,
  type WeldSizingFormData,
  type WeldSizingResults,
} from "./weldSizingBuilder";

// Concrete (additional)
export {
  buildPunchingShearReport,
  type PunchingShearFormData,
  type PunchingShearResults,
} from "./punchingShearBuilder";

export {
  buildCrackWidthReport,
  type CrackWidthFormData,
  type CrackWidthResults,
} from "./crackWidthBuilder";

export {
  buildRcColumnReport,
  type RcColumnFormData,
  type RcColumnResults,
} from "./rcColumnBuilder";

// Steel Members
export {
  buildSteelBeamBendingReport,
  type SteelBeamBendingFormData,
  type SteelBeamBendingResults,
} from "./steelBeamBendingBuilder";

// Lifting
export {
  buildLiftLoadSheetReport,
  type LiftLoadSheetFormData,
  type LiftLoadSheetResults,
} from "./liftLoadSheetBuilder";

export {
  buildSlingAngleReport,
  type SlingAngleFormData,
  type SlingAngleResults,
} from "./slingAngleBuilder";

// Foundations (additional)
export { buildPadFootingReport } from "./padFootingBuilder";

// Earthworks
export {
  buildCutFillReport,
  type CutFillFormData,
  type CutFillResults,
} from "./cutFillBuilder";

// Timber (additional)
export {
  buildTimberConnectionsReport,
  type TimberConnectionsFormData,
  type TimberConnectionsResults,
} from "./timberConnectionsBuilder";

// Concrete (more)
export {
  buildRcSlabReport,
  type RcSlabFormData,
  type RcSlabResults,
} from "./rcSlabBuilder";

// RC Slab Bending
export { buildRCSlabBendingReport } from "./rcSlabBendingBuilder";

// Access Ramps
export { buildAccessRampsReport } from "./accessRampsBuilder";

// Excavation Sheet Pile
export { buildExcavationSheetPileReport } from "./excavationSheetPileBuilder";

// Member Ratings
export { buildMemberRatingsReport } from "./memberRatingsBuilder";

// Sensitivity Analysis
export { buildSensitivityReport } from "./sensitivityBuilder";

// Traffic Actions
export { buildTrafficActionsReport } from "./trafficActionsBuilder";

// Pile Foundations V2
export { buildPileFoundationsReportV2 } from "./pileFoundationsBuilderV2";

// Combination Builder
export { buildCombinationBuilderReport } from "./combinationBuilderBuilder";

// Composite (additional)
export {
  buildShearStudReport,
  type ShearStudFormData,
  type ShearStudResults,
} from "./shearStudBuilder";

// Steel Members (additional)
export {
  buildLtbQuickCheckReport,
  type LtbQuickCheckFormData,
  type LtbQuickCheckResults,
} from "./ltbQuickCheckBuilder";

export {
  buildCombinedLoadingReport,
  type CombinedLoadingFormData,
  type CombinedLoadingResults,
} from "./combinedLoadingBuilder";

// Steel Connections (additional)
export {
  buildAnchorBoltReport,
  type AnchorBoltFormData,
  type AnchorBoltResults,
} from "./anchorBoltBuilder";

export {
  buildFinPlateReport,
  type FinPlateFormData,
  type FinPlateResults,
} from "./finPlateBuilder";

// Retaining Structures (additional)
export {
  buildCantileverWallReport,
  type CantileverWallFormData,
  type CantileverWallResults,
} from "./cantileverWallBuilder";

export {
  buildSheetPileReport,
  type SheetPileFormData,
  type SheetPileResults,
} from "./sheetPileBuilder";

// Ground (additional)
export {
  buildGroundAnchorReport,
  type GroundAnchorFormData,
  type GroundAnchorResults,
} from "./groundAnchorBuilder";

// Loading
export {
  buildWindLoadReport,
  type WindLoadFormData,
  type WindLoadResults,
} from "./windLoadBuilder";

// Crane & Lifting (additional)
export {
  buildCranePadReport,
  type CranePadFormData,
  type CranePadResults,
} from "./cranePadBuilder";

// Load Combinations
export {
  buildLoadCombinationsReport,
  type LoadCombinationsFormData,
  type LoadCombinationsResults,
} from "./loadCombinationsBuilder";

// Retaining Structures (more)
export {
  buildGabionWallReport,
  type GabionWallFormData,
  type GabionWallResults,
} from "./gabionWallBuilder";

export {
  buildSoilNailReport,
  type SoilNailFormData,
  type SoilNailResults,
} from "./soilNailBuilder";

// Steel Members (more)
export {
  buildSteelColumnAxialReport,
  type SteelColumnAxialFormData,
  type SteelColumnAxialResults,
} from "./steelColumnAxialBuilder";

// Falsework Design
export { buildFalseworkReport } from "./falseworkBuilder";

// Spreader Beam Design
export { buildSpreaderBeamReport } from "./spreaderBeamBuilder";

// Sling Checks
export { buildSlingChecksReport } from "./slingChecksBuilder";

// Thermal Actions
export { buildThermalActionsReport } from "./thermalActionsBuilder";

// Wind Actions
export { buildWindActionsReport } from "./windActionsBuilder";

// Formwork Pressure
export { buildFormworkPressureReport } from "./formworkPressureBuilder";

// Soffit Shores
export { buildSoffitShoresReport } from "./soffitShoresBuilder";

// Bracing Design
export { buildBracingReport } from "./bracingBuilder";

// Needle Beam Design
export {
  buildNeedleBeamReport,
  type NeedleBeamFormData,
  type NeedleBeamResults,
} from "./needleBeamBuilder";

// Guardrail Checks
export {
  buildGuardrailChecksReport,
  type GuardrailChecksFormData,
  type GuardrailChecksResults,
} from "./guardrailChecksBuilder";

// Haul Road
export {
  buildHaulRoadReport,
  type HaulRoadFormData,
  type HaulRoadResults,
} from "./haulRoadBuilder";

// Load Spread
export {
  buildLoadSpreadReport,
  type LoadSpreadFormData,
  type LoadSpreadResults,
} from "./loadSpreadBuilder";

// Raking Props
export {
  buildRakingPropsReport,
  type RakingPropsFormData,
  type RakingPropsResults,
} from "./rakingPropsBuilder";

// Spread Footing
export {
  buildSpreadFootingReport,
  type SpreadFootingFormData,
  type SpreadFootingResults,
} from "./spreadFootingBuilder";

// Temporary Parapet
export {
  buildTemporaryParapetReport,
  type TemporaryParapetFormData,
  type TemporaryParapetResults,
} from "./temporaryParapetBuilder";

// Trench Support
export {
  buildTrenchSupportReport,
  type TrenchSupportFormData,
  type TrenchSupportResults,
} from "./trenchSupportBuilder";

// Turning Platform
export {
  buildTurningPlatformReport,
  type TurningPlatformFormData,
  type TurningPlatformResults,
} from "./turningPlatformBuilder";

// Vertical Props
export {
  buildVerticalPropsReport,
  type VerticalPropsFormData,
  type VerticalPropsResults,
} from "./verticalPropsBuilder";

// Working Platform
export {
  buildWorkingPlatformReport,
  type WorkingPlatformFormData,
  type WorkingPlatformResults,
} from "./workingPlatformBuilder";

// ============================================================================
// Additional Builders (A1 batch)
// ============================================================================

// Abutments
export {
  buildAbutmentsReport,
  type AbutmentsFormData,
  type AbutmentsResults,
} from "./abutmentsBuilder";

// Batters (Slope / Earthworks)
export {
  buildBattersReport,
  type BattersFormData,
  type BattersResults,
} from "./battersBuilder";

// Bearing Reactions
export {
  buildBearingReactionsReport,
  type BearingReactionsFormData,
  type BearingReactionsResults,
} from "./bearingReactionsBuilder";

// Bog Mats
export {
  buildBogMatsReport,
  type BogMatsFormData,
  type BogMatsResults,
} from "./bogMatsBuilder";

// Bolt Pattern
export {
  buildBoltPatternReport,
  type BoltPatternFormData,
  type BoltPatternResults,
} from "./boltPatternBuilder";

// Composite Quick Check
export {
  buildCompositeQuickReport,
  type CompositeQuickFormData,
  type CompositeQuickResults,
} from "./compositeQuickBuilder";

// Deck Slab
export {
  buildDeckSlabReport,
  type BuilderOptions as DeckSlabBuilderOptions,
} from "./deckSlabBuilder";

// Elastomeric Bearings
export {
  buildElastomericBearingsReport,
  type ElastomericBearingsFormData,
  type ElastomericBearingsResults,
} from "./elastomericBearingsBuilder";

// Erection Stages
export {
  buildErectionStagesReport,
  type ErectionStagesFormData,
  type ErectionStagesResults,
} from "./erectionStagesBuilder";

// Grillage
export {
  buildGrillageReport,
  type GrillageFormData,
  type GrillageResults,
} from "./grillageBuilder";

// Heras Fence
export {
  buildHerasFenceReport,
  type HerasFenceFormData,
  type HerasFenceResults,
} from "./herasFenceBuilder";

// Hoarding
export {
  buildHoardingReport,
  type HoardingFormData,
  type HoardingResults,
} from "./hoardingBuilder";

// Hole Pattern DXF
export {
  buildHolePatternDXFReport,
  type HolePatternDXFFormData,
  type HolePatternDXFResults,
} from "./holePatternDXFBuilder";

// Legato Quantity
export {
  buildLegatoQuantityReport,
  type LegatoQuantityFormData,
  type LegatoQuantityResults,
} from "./legatoQuantityBuilder";

// Movement Joints
export {
  buildMovementJointsReport,
  type MovementJointsFormData,
  type MovementJointsResults,
} from "./movementJointsBuilder";

// Notional Wind
export {
  buildNotionalWindReport,
  type NotionalWindFormData,
  type NotionalWindResults,
} from "./notionalWindBuilder";

// Pier Design
export {
  buildPierDesignReport,
  type PierDesignFormData,
  type PierDesignResults,
} from "./pierDesignBuilder";

// Pile Capacity
export {
  buildPileCapacityReport,
  type PileCapacityFormData,
  type PileCapacityResults,
} from "./pileCapacityBuilder";

// 6F2 Quantity
export {
  buildSixF2QuantityReport,
  type SixF2QuantityFormData,
  type SixF2QuantityResults,
} from "./sixF2QuantityBuilder";

// Swept Path
export {
  buildSweptPathReport,
  type SweptPathFormData,
  type SweptPathResults,
} from "./sweptPathBuilder";

// Timber Quantity
export {
  buildTimberQuantityReport,
  type TimberQuantityFormData,
  type TimberQuantityResults,
} from "./timberQuantityBuilder";

// Trackmats
export {
  buildTrackmatsReport,
  type TrackmatsFormData,
  type TrackmatsResults,
} from "./trackmatsBuilder";

// Transverse Members
export {
  buildTransverseMembersReport,
  type BuilderOptions as TransverseMembersBuilderOptions,
} from "./transverseMembersBuilder";

// Working Area
export {
  buildWorkingAreaReport,
  type WorkingAreaFormData,
  type WorkingAreaResults,
} from "./workingAreaBuilder";
