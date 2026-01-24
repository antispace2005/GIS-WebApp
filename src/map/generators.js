import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import TileWMS from "ol/source/TileWMS";
import { Vector as VectorLayer, Heatmap as HeatmapLayer } from "ol/layer";
import Cluster from "ol/source/Cluster";
import WebGLPointsLayer from "ol/layer/WebGLPoints";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { getCenter } from "ol/extent";
import Point from "ol/geom/Point";

// Single instance of the format reader for efficiency
const geojsonFormat = new GeoJSON();

/**
 * BASE MAP FACTORY
 * Logic for background layers
 */
export const BaseMapFactory = {
  createOSM: () => {
    return new TileLayer({
      source: new OSM(),
      properties: { type: "base" },
    });
  },

  createWMS: (url, layerName) => {
    return new TileLayer({
      source: new TileWMS({
        url: url,
        params: { LAYERS: layerName, TILED: true },
        serverType: "geoserver",
      }),
      properties: { type: "base" },
    });
  },
};

export const DataLayerFactory = {
  /**
   * Creates a standard Vector Layer (Points/Polygons)
   * Useful for intersection results or general data display.
   */
  createVector: (geojsonData) => {
    const source = new VectorSource({
      features: geojsonFormat.readFeatures(geojsonData, {
        featureProjection: "EPSG:3857", // Transform to Map Projection
      }),
    });

    const layer = new VectorLayer({ source });

    return {
      instance: layer,
      toggle: (visible) => layer.setVisible(visible),
      setOpacity: (val) => layer.setOpacity(parseFloat(val)),
    };
  },

  /**
   * Creates a Heatmap Layer
   * @param {Object} geojsonData - The raw GeoJSON from the Registry
   * @param {string} weightAttr - The property to use for intensity (default: 'weight')
   */

  createBasicHeatmap: (
    geojsonData,
    weightAttr = "population",
    maxWeight = null,
    blur = 15,
    radius = 10,
    opacity = 0.7,
    forceNoCluster = false,
  ) => {
    // For large datasets, we'll use clustering to reduce rendering load

    // Auto-detect maxWeight from raw GeoJSON if not provided
    if (!maxWeight && geojsonData.features) {
      maxWeight = 0;
      geojsonData.features.forEach((f) => {
        const value = parseFloat(f.properties?.[weightAttr]) || 0;
        if (value > maxWeight) maxWeight = value;
      });
      // Add 10% buffer to avoid saturation
      maxWeight = maxWeight * 1.1;
    }

    const features = new GeoJSON().readFeatures(geojsonData, {
      featureProjection: "EPSG:3857",
    });

    // Convert Polygons to Points at their centroids (only if needed)
    const pointFeatures = features
      .map((feature) => {
        const geometry = feature.getGeometry();
        const geomType = geometry.getType();

        if (geomType === "Point") {
          return feature;
        } else if (geomType === "Polygon" || geomType === "MultiPolygon") {
          const extent = geometry.getExtent();
          const center = getCenter(extent);
          const pointGeom = new Point(center);
          const pointFeature = feature.clone();
          pointFeature.setGeometry(pointGeom);
          return pointFeature;
        }
        return null;
      })
      .filter((f) => f !== null);

    const vectorSource = new VectorSource({
      features: pointFeatures,
    });

    // Use clustering for large datasets (>1000 points) to improve performance
    // Unless forceNoCluster is true
    const useCluster = !forceNoCluster && pointFeatures.length > 1000;

    const source = useCluster
      ? new Cluster({
          distance: 10, // Pixels - Reduced to double cluster count (was 40)
          minDistance: 5, // Minimum distance between clusters
          source: vectorSource,
        })
      : vectorSource;

    const layer = new HeatmapLayer({
      source: source,
      blur: blur,
      radius: radius,
      opacity: opacity,
      renderMode: "image", // CRITICAL: Render as static image - much faster!
      weight: useCluster
        ? (feature) => {
            // For clustered features, sum up all the weight values
            const features = feature.get("features");
            if (features && features.length > 0) {
              const total = features.reduce((sum, f) => {
                const value = parseFloat(f.get(weightAttr)) || 0;
                return sum + value;
              }, 0);

              // If no weight found, use cluster size as fallback
              if (total === 0) {
                return Math.min(features.length / 50, 1);
              }

              // Normalize by max weight
              return Math.min(total / maxWeight, 1);
            }
            return 0.1;
          }
        : (feature) => {
            const val = parseFloat(feature.get(weightAttr)) || 0;
            return Math.min(val / (maxWeight / 20), 1);
          },
    });

    return layer;
  },
};
