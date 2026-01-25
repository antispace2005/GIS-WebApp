import { DataLayerFactory } from "./generators.js";
import { containsExtent, getIntersection } from "ol/extent";
import GeoJSON from "ol/format/GeoJSON";

const geojsonFormat = new GeoJSON();

export class DynamicHeatmap {
  constructor(map, rawData, weightAttr = "population", maxWeight = null) {
    this.map = map;
    this.rawData = rawData;
    this.weightAttr = weightAttr;

    // Auto-detect maxWeight if not provided
    if (!maxWeight) {
      let detectedMax = 0;
      if (rawData.features) {
        rawData.features.forEach((f) => {
          const value = parseFloat(f.properties?.[weightAttr]) || 0;
          if (value > detectedMax) detectedMax = value;
        });
      }
      // Add 10% buffer to avoid saturation
      this.maxWeight = detectedMax * 1.1;
    } else {
      this.maxWeight = maxWeight;
    }

    // Create initial layer
    const zoom = this.map.getView().getZoom();
    this.currentLayer = DataLayerFactory.createBasicHeatmap(
      rawData,
      weightAttr,
      this.maxWeight,
      this.calculateBlur(zoom),
      this.calculateRadius(zoom),
      0.7,
      false,
    );
    this.map.addLayer(this.currentLayer);

    // Initial style update
    this.updateHeatmapStyle();

    // Update on zoom changes for dynamic radius/blur (without recreating layer)
    this.map.getView().on("change:resolution", () => {
      this.updateHeatmapStyle();
    });

    // Refresh on pan/zoom end to show only visible features
    this.map.getView().on("moveend", () => {
      this.refresh();
    });
  }

  // Calculate zoom-dependent radius and blur
  calculateRadius(zoom) {
    // Low zoom (5-7): small radius, high zoom (15+): large radius
    return Math.max(5, Math.min(50, 5 + (zoom - 5) * 3));
  }

  calculateBlur(zoom) {
    return Math.max(10, Math.min(40, 10 + (zoom - 5) * 2));
  }

  updateHeatmapStyle() {
    if (!this.currentLayer) return;

    const zoom = this.map.getView().getZoom();
    this.currentLayer.setBlur(this.calculateBlur(zoom));
    this.currentLayer.setRadius(this.calculateRadius(zoom));
  }

  refresh() {
    const zoom = this.map.getView().getZoom();
    const viewExtent = this.map.getView().calculateExtent(this.map.getSize());

    // Add buffer to extent (20% on each side) to include nearby points for smooth rendering
    const buffer = [
      (viewExtent[2] - viewExtent[0]) * 0.2,
      (viewExtent[3] - viewExtent[1]) * 0.2,
    ];
    const bufferedExtent = [
      viewExtent[0] - buffer[0],
      viewExtent[1] - buffer[1],
      viewExtent[2] + buffer[0],
      viewExtent[3] + buffer[1],
    ];

    // Filter features to only those in view
    const visibleFeatures = this.rawData.features.filter((feature) => {
      const coords = feature.geometry.coordinates;
      // Handle both Point and Polygon geometries
      if (feature.geometry.type === "Point") {
        const [x, y] = coords;
        return (
          x >= bufferedExtent[0] &&
          x <= bufferedExtent[2] &&
          y >= bufferedExtent[1] &&
          y <= bufferedExtent[3]
        );
      } else if (
        feature.geometry.type === "Polygon" ||
        feature.geometry.type === "MultiPolygon"
      ) {
        // For polygons, check if any part intersects with view
        // Simple bbox check - you could use turf.js for more accuracy
        return true; // For now, include all polygons
      }
      return false;
    });

    const filteredData = {
      type: "FeatureCollection",
      features: visibleFeatures,
    };

    // Update the source instead of removing/adding layer
    const source = this.currentLayer.getSource();
    const newFeatures = geojsonFormat.readFeatures(filteredData, {
      featureProjection: "EPSG:3857",
    });

    // Clear existing features and add new ones
    source.clear();
    source.addFeatures(newFeatures);

    // Update style after changing features
    this.updateHeatmapStyle();
  }
}
