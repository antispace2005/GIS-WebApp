import * as turf from "@turf/turf";

export const SpatialAnalysis = {
  // 1. Define how big the grid cells are at each zoom level
  getResolutionByZoom: (zoom) => {
    // Returns cell size in Degrees (approx. 0.1 deg = 11km)
    if (zoom < 6) return 0.25; // Zoom out: Big 25km blocks
    if (zoom < 8) return 0.1; // Mid zoom: 11km blocks
    if (zoom < 10) return 0.05; // Close up: 5km blocks
    if (zoom < 12) return 0.01; // Street level: 1km blocks
    return 0; // Return 0 to show raw original data
  },

  // 2. The Snapping Logic
  downsample: (geojson, cellSizeDeg, weightAttr) => {
    // If cell size is 0, just return the raw data (flattened to be safe)
    if (cellSizeDeg <= 0) return turf.flatten(geojson);

    try {
      // Flatten ensures MultiPoints become simple Points
      const flatData = turf.flatten(geojson);
      const features = flatData.features;

      // We use a Map to group points by their grid location
      const grid = new Map();

      for (let i = 0; i < features.length; i++) {
        const f = features[i];
        if (!f.geometry || !f.geometry.coordinates) continue;

        const [lon, lat] = f.geometry.coordinates;
        // Safely get the population number
        const val = Number(f.properties[weightAttr]) || 0;

        // MATH MAGIC: Round the coordinate to the nearest grid line
        const snapLon = Math.floor(lon / cellSizeDeg) * cellSizeDeg;
        const snapLat = Math.floor(lat / cellSizeDeg) * cellSizeDeg;

        // Create a unique ID for this grid cell
        const key = `${snapLon.toFixed(4)}_${snapLat.toFixed(4)}`;

        if (grid.has(key)) {
          // If cell exists, add to its total
          const cell = grid.get(key);
          cell.sum += val;
        } else {
          // If new, start a new cell
          grid.set(key, {
            sum: val,
            // Calculate the center of the cell for display
            lon: snapLon + cellSizeDeg / 2,
            lat: snapLat + cellSizeDeg / 2,
          });
        }
      }

      // Convert the Map back into a GeoJSON list of points
      const resultFeatures = [];
      grid.forEach((cell) => {
        resultFeatures.push({
          type: "Feature",
          properties: {
            [weightAttr]: cell.sum, // This becomes the new "weight"
          },
          geometry: {
            type: "Point",
            coordinates: [cell.lon, cell.lat],
          },
        });
      });

      return turf.featureCollection(resultFeatures);
    } catch (e) {
      console.error("Snapping logic failed:", e);
      return turf.featureCollection([]);
    }
  },

  // Phase 4: Selection & Analysis Functions

  /**
   * Merge multiple polygons into a single union polygon
   * @param {Feature[]} polygonFeatures - Array of polygon features (OL or GeoJSON)
   * @returns {Feature|null} - Union of all polygons or null if empty
   */
  unionPolygons: (polygonFeatures) => {
    if (!polygonFeatures || polygonFeatures.length === 0) return null;
    if (polygonFeatures.length === 1) {
      return SpatialAnalysis._toGeoJSON(polygonFeatures[0]);
    }

    try {
      // Convert OL features to GeoJSON
      const geoFeatures = polygonFeatures.map((f) =>
        SpatialAnalysis._toGeoJSON(f),
      );

      // Use dissolve to merge all polygons together
      const collection = turf.featureCollection(geoFeatures);
      const merged = turf.dissolve(collection);

      // Keep whatever turf returns (Feature or FeatureCollection)
      return merged;
    } catch (e) {
      console.error("Union failed:", e, polygonFeatures);
      return null;
    }
  },

  /**
   * Convert OpenLayers Feature to GeoJSON Feature
   * OL features are in Web Mercator (EPSG:3857), convert to WGS84 for Turf
   * @param {OLFeature|GeoJSONFeature} feature
   * @returns {GeoJSONFeature}
   */
  _toGeoJSON: (feature) => {
    // If it's already GeoJSON, return as-is
    if (feature.type === "Feature") {
      return feature;
    }

    // If it's an OpenLayers feature, convert it
    if (feature.getGeometry) {
      const geometry = feature.getGeometry();
      let coords = geometry.getCoordinates();
      const geomType = geometry.getType();

      // Convert Web Mercator to WGS84 for Turf.js
      if (geomType === "Polygon") {
        coords = coords.map((ring) =>
          ring.map((coord) => SpatialAnalysis._mercatorToWGS84(coord)),
        );
      } else if (geomType === "Point") {
        coords = SpatialAnalysis._mercatorToWGS84(coords);
      }

      return {
        type: "Feature",
        properties: feature.getProperties ? feature.getProperties() : {},
        geometry: {
          type: geomType,
          coordinates: coords,
        },
      };
    }

    return feature;
  },

  /**
   * Convert Web Mercator [x, y] to WGS84 [lon, lat]
   * @param {number[]} coord - [x, y] in Web Mercator
   * @returns {number[]} - [lon, lat] in WGS84
   */
  _mercatorToWGS84: (coord) => {
    const x = coord[0];
    const y = coord[1];
    const lon = (x / 20037508.34) * 180;
    const lat =
      (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 2 - Math.PI / 2) *
      (180 / Math.PI);
    return [lon, lat];
  },

  /**
   * Filter points that fall inside a polygon shape
   * @param {GeoJSON} pointsGeoJSON - GeoJSON with point features (in Web Mercator)
   * @param {Feature} polygon - Polygon feature to test intersection (in WGS84 from Turf)
   * @returns {Feature[]} - Points that are inside the polygon
   */
  filterPointsInShape: (pointsGeoJSON, polygon) => {
    if (!polygon || !pointsGeoJSON || !pointsGeoJSON.features) return [];

    try {
      const geomCounts = pointsGeoJSON.features.reduce((acc, f) => {
        const t = f.geometry?.type || "(none)";
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {});

      // Helper: get first coordinate from any geometry
      const firstCoord = (geom) => {
        if (!geom) return null;
        const t = geom.type;
        const c = geom.coordinates;
        if (!c) return null;
        if (t === "Point") return c;
        if (t === "MultiPoint" || t === "LineString") return c[0];
        if (t === "MultiLineString" || t === "Polygon") return c[0]?.[0];
        if (t === "MultiPolygon") return c[0]?.[0]?.[0];
        return null;
      };

      const first = firstCoord(pointsGeoJSON.features[0]?.geometry);
      const convert = first
        ? Math.abs(first[0]) > 180 || Math.abs(first[1]) > 90
        : false;

      const collected = [];
      pointsGeoJSON.features.forEach((f) => {
        if (!f.geometry) return;
        const t = f.geometry.type;
        if (t === "Point") {
          collected.push({
            type: "Feature",
            properties: f.properties,
            geometry: f.geometry,
          });
        } else if (t === "MultiPoint") {
          (f.geometry.coordinates || []).forEach((c) => {
            collected.push({
              type: "Feature",
              properties: f.properties,
              geometry: { type: "Point", coordinates: c },
            });
          });
        } else if (t === "Polygon" || t === "MultiPolygon") {
          // Convert polygon to centroid point
          try {
            const centroid = turf.centroid(f);
            collected.push({
              type: "Feature",
              properties: f.properties,
              geometry: {
                type: "Point",
                coordinates: centroid.geometry.coordinates,
              },
            });
          } catch (err) {
            console.warn("centroid failed", err);
          }
        }
      });

      console.log("filterPointsInShape:start", {
        totalFeatures: pointsGeoJSON.features.length,
        collectedPoints: collected.length,
        polygonType: polygon.geometry?.type,
        geomCounts,
        convert,
      });
      if (collected.length === 0) return [];

      const convertedPoints = collected.map((pt) => {
        const c = pt.geometry.coordinates;
        const coords = convert ? SpatialAnalysis._mercatorToWGS84(c) : c;
        return {
          type: "Feature",
          properties: pt.properties,
          geometry: { type: "Point", coordinates: coords },
        };
      });

      const fc = turf.featureCollection(convertedPoints);
      const polyList =
        polygon.type === "FeatureCollection" && polygon.features?.length
          ? polygon.features
          : [polygon];

      let collectedHits = [];
      polyList.forEach((poly) => {
        if (!poly?.geometry) return;
        const res = turf.pointsWithinPolygon(fc, poly);
        if (res?.features?.length) {
          collectedHits = collectedHits.concat(res.features);
        }
      });

      console.log("pointsWithinPolygon result", {
        insideCount: collectedHits.length,
        polygonsTested: polyList.length,
      });
      return collectedHits;
    } catch (e) {
      console.error("Filter failed:", e);
      return [];
    }
  },

  /**
   * Sum the population values of features
   * @param {Feature[]} features - Array of point features
   * @param {string} populationAttr - Property name containing population value
   * @returns {number} - Total population sum
   */
  aggregatePopulation: (features, populationAttr = "population") => {
    if (!features || features.length === 0) return 0;

    try {
      return features.reduce((sum, feature) => {
        const val = parseFloat(feature.properties?.[populationAttr]) || 0;
        return sum + val;
      }, 0);
    } catch (e) {
      console.error("Aggregation failed:", e);
      return 0;
    }
  },
};
