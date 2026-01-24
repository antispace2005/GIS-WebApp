import "./style.css";
import { initLayout } from "./ui/layout.js";
import { initMap, registerBaseMap } from "./map/core.js";
import { BaseMapFactory, DataLayerFactory } from "./map/generators.js";
import { DynamicHeatmap } from "./map/dynamic-layer.js";
import { Fetchers } from "./api/fetchers.js";
import { LayerSwitcher } from "./ui/widgets/layer-switch.js";
import { ToolsPanel } from "./ui/widgets/tools-panel.js";
import { AnalysisBox } from "./ui/widgets/analysis-box.js";
import { DrawingTool } from "./map/interactions.js";
import { SpatialAnalysis } from "./spatial/analysis.js";
import govsLocal from "./data/gov_with_pop.geojson";

// Expose AnalysisBox for quick console testing
if (typeof window !== "undefined") {
  window.AnalysisBox = AnalysisBox;
}
// 1. Setup Map
const { mapSlot } = initLayout();
const map = initMap(mapSlot);

// 2. Add Base Map
const osm = BaseMapFactory.createOSM();
registerBaseMap(map, "OSM", osm, true);

// 3. The Simple Test
// src/index.js

// ... imports ...

async function start() {
  try {
    const data = await Fetchers.fetchWFS(
      "http://localhost:8080/geoserver/wfs",
      "OSM:Egypt_Population",
    );

    // Fetch the governorate GeoJSON
    const govesResponse = await fetch(govsLocal);
    const govesData = await govesResponse.json();

    // 1. Initialize Logic (Phase 2)
    const dynamicManager = DataLayerFactory.createBasicHeatmap(
      data,
      "population",
      null,
      15,
      10,
      1,
      false,
    );

    // Create a vector layer for governorates
    const govesLayer = DataLayerFactory.createVector(govesData);
    map.addLayer(dynamicManager);
    map.addLayer(govesLayer.instance);

    map.getView().setCenter([3473147.67, 3115456.46]);
    map.getView().setZoom(6);

    // 2. Initialize UI (Phase 3)
    const layerUI = new LayerSwitcher(map);
    layerUI.addLayer("Egypt Population (WFS)", dynamicManager);
    layerUI.addLayer("Governorates", govesLayer);
    layerUI.mount();

    // 3. Initialize Tools Panel (Phase 4)
    const toolsPanel = new ToolsPanel();
    const drawingTool = new DrawingTool(map);
    const analysisBox = new AnalysisBox();

    toolsPanel.addTool("Draw Mode", drawingTool);
    toolsPanel.addClearButton(drawingTool);
    toolsPanel.addAnalyzeButton(() => {
      // Get drawn shapes
      const drawnFeatures = drawingTool.getDrawnShapes();
      if (!drawnFeatures || drawnFeatures.length === 0) {
        alert("No shapes drawn. Please draw a polygon first.");
        return;
      }

      console.log("Drawn features:", drawnFeatures);

      // Union all polygons
      const mergedShape = SpatialAnalysis.unionPolygons(drawnFeatures);
      if (!mergedShape) {
        alert("Failed to process drawn shapes.");
        return;
      }

      console.log("Merged shape:", mergedShape);
      console.log("Merged shape geometry type:", mergedShape.geometry?.type);

      // Filter points inside the shape
      const pointsInside = SpatialAnalysis.filterPointsInShape(
        data,
        mergedShape,
      );
      console.log("Points inside:", pointsInside.length);

      // Aggregate population
      const totalPopulation = SpatialAnalysis.aggregatePopulation(
        pointsInside,
        "population",
      );

      // Show results
      analysisBox.showResults({
        pointCount: pointsInside.length,
        totalPopulation: totalPopulation,
        clearCallback: () => {
          drawingTool.clearShapes();
          analysisBox.hide();
        },
      });
    });

    toolsPanel.mount();
    analysisBox.mount();

    console.log("System Online: Logic + UI + Tools + Analysis connected.");
  } catch (e) {
    console.error("Error:", e);
  }
} // Phase 3: UI Setup

start();
