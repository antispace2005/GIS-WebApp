import * as turf from "@turf/turf";

export const SpatialAnalysis = {
  /**
   * Extract specific attributes from each feature's properties
   * @param {GeoJSON} geojson - FeatureCollection
   * @param {string[]} attributes - Array of property names
   * @returns {Object[]} - Array of objects with only the requested properties
   */
  extractAttributes: (geojson, attributes) => {
    if (!geojson || !geojson.features || !Array.isArray(attributes)) return [];
    return geojson.features.map((f) => {
      const obj = {};
      attributes.forEach((attr) => {
        obj[attr] = f.properties ? f.properties[attr] : undefined;
      });
      return obj;
    });
  },

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
      // Convert features to GeoJSON (already handles OL features)
      const geoFeatures = polygonFeatures.map((f) =>
        SpatialAnalysis._toGeoJSON(f),
      );

      console.log("unionPolygons - input features", {
        count: geoFeatures.length,
        details: geoFeatures.map((f, i) => ({
          index: i,
          type: f.type,
          geomType: f.geometry?.type,
          hasCoords: !!f.geometry?.coordinates,
          coordLength: f.geometry?.coordinates?.length,
        })),
      });

      // Flatten all MultiPolygons to Polygons for dissolve compatibility
      const flatFeatures = [];
      geoFeatures.forEach((feature, idx) => {
        if (feature.geometry?.type === "MultiPolygon") {
          const flattened = turf.flatten(turf.featureCollection([feature]));
          flatFeatures.push(...flattened.features);
        } else if (feature.geometry?.type === "Polygon") {
          flatFeatures.push(feature);
        } else {
          console.warn(
            "Skipping unsupported geometry type:",
            feature.geometry?.type,
            feature,
          );
        }
      });

      console.log("unionPolygons - after flatten", {
        count: flatFeatures.length,
        details: flatFeatures.map((f, i) => ({
          index: i,
          type: f.type,
          geomType: f.geometry?.type,
          hasCoords: !!f.geometry?.coordinates,
        })),
      });

      if (flatFeatures.length === 0) {
        console.error("No valid polygon features to union");
        return null;
      }

      const fc = turf.featureCollection(flatFeatures);
      console.log("unionPolygons - featureCollection", {
        featureCount: fc.features.length,
      });

      const merged = turf.dissolve(fc);

      console.log("unionPolygons - result", {
        type: merged.type,
        resultGeomType: merged.features
          ? merged.features[0]?.geometry?.type
          : merged.geometry?.type,
      });

      // Keep whatever turf returns (Feature or FeatureCollection)
      return merged;
    } catch (e) {
      console.error("Union failed:", e, {
        message: e.message,
        featureCount: polygonFeatures.length,
      });
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
      } else if (geomType === "MultiPolygon") {
        coords = coords.map((polygon) =>
          polygon.map((ring) =>
            ring.map((coord) => SpatialAnalysis._mercatorToWGS84(coord)),
          ),
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
   * Convert an entire geometry from Web Mercator to WGS84
   * @param {Feature} feature - Feature with geometry to convert
   * @returns {Feature} - Feature with WGS84 coordinates
   */
  _convertGeometryToWGS84: (feature) => {
    const convertCoord = SpatialAnalysis._mercatorToWGS84;
    const geom = feature.geometry;
    if (!geom) return feature;

    const convertCoords = (coords) => {
      if (!Array.isArray(coords)) return coords;
      if (typeof coords[0] === "number") {
        return convertCoord(coords);
      }
      return coords.map(convertCoords);
    };

    const newGeom = {
      ...geom,
      coordinates: convertCoords(geom.coordinates),
    };

    return {
      ...feature,
      geometry: newGeom,
    };
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

      // Check if polygon coordinates need conversion
      const polyFirstCoord = firstCoord(polyList[0]?.geometry);
      const polyNeedsConversion = polyFirstCoord
        ? Math.abs(polyFirstCoord[0]) > 180 || Math.abs(polyFirstCoord[1]) > 90
        : false;

      console.log("filterPointsInShape - polygon check", {
        polyNeedsConversion,
        firstPolyCoord: polyFirstCoord,
      });

      let collectedHits = [];
      polyList.forEach((poly) => {
        if (!poly?.geometry) return;
        try {
          // Convert polygon if needed
          let workingPoly = poly;
          if (polyNeedsConversion) {
            workingPoly = SpatialAnalysis._convertGeometryToWGS84(poly);
          }

          // Handle MultiPolygon by flattening it
          if (workingPoly.geometry.type === "MultiPolygon") {
            const flattened = turf.flatten(
              turf.featureCollection([workingPoly]),
            );
            flattened.features.forEach((flatPoly) => {
              const res = turf.pointsWithinPolygon(fc, flatPoly);
              if (res?.features?.length) {
                collectedHits = collectedHits.concat(res.features);
              }
            });
          } else {
            const res = turf.pointsWithinPolygon(fc, workingPoly);
            if (res?.features?.length) {
              collectedHits = collectedHits.concat(res.features);
            }
          }
        } catch (e) {
          console.warn("pointsWithinPolygon failed for poly:", e);
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
   * Sum values of a single attribute across features
   * @param {Feature[]} features - Array of features
   * @param {string} attribute - Property name to aggregate
   * @returns {number} - Total sum
   */
  aggregateAttribute: (features, attribute) => {
    if (!features || features.length === 0) return 0;
    if (!attribute) return 0;

    try {
      return features.reduce((sum, feature) => {
        const val = parseFloat(feature.properties?.[attribute]) || 0;
        return sum + val;
      }, 0);
    } catch (e) {
      console.error("Aggregation failed:", e);
      return 0;
    }
  },

  /**
   * Sum values of multiple attributes across features
   * @param {Feature[]} features - Array of features
   * @param {string[]} attributes - Array of property names to aggregate
   * @returns {Object} - Object with attribute names as keys and sums as values
   */
  aggregateAttributes: (features, attributes) => {
    if (!features || features.length === 0) return {};
    if (!attributes || attributes.length === 0) return {};

    try {
      const result = {};
      attributes.forEach((attr) => {
        result[attr] = features.reduce((sum, feature) => {
          const val = parseFloat(feature.properties?.[attr]) || 0;
          return sum + val;
        }, 0);
      });
      return result;
    } catch (e) {
      console.error("Multi-attribute aggregation failed:", e);
      return {};
    }
  },

  /**
   * Extract labels and numeric values from a GeoJSON FeatureCollection.
   * @param {GeoJSON} geojson - FeatureCollection
   * @param {string} labelProp - property name to use for labels (default: 'name')
   * @param {string} valueProp - property name to use for numeric values (default: 'population_sum')
   * @returns {{labels: string[], values: number[]}}
   */
  extractLabelsAndValues: (
    geojson,
    labelProp = "name",
    valueProp = "population_sum",
  ) => {
    const labels = [];
    const values = [];
    if (!geojson || !Array.isArray(geojson.features)) return { labels, values };
    try {
      geojson.features.forEach((f) => {
        const props = f.properties || {};
        const lab =
          props[labelProp] !== undefined && props[labelProp] !== null
            ? String(props[labelProp])
            : "";
        const raw = props[valueProp];
        const num = Number(raw);
        labels.push(lab);
        values.push(Number.isFinite(num) ? num : 0);
      });
    } catch (e) {
      console.warn("extractLabelsAndValues failed:", e);
    }
    return { labels, values };
  },

  /**
   * Find features in a polygon FeatureCollection that contain the given point.
   * Returns an array of GeoJSON Features (converted to WGS84) that contain the point.
   * @param {GeoJSON} geojson - FeatureCollection of polygons
   * @param {number[]|Feature} point - [x,y] coordinate (map projection) or GeoJSON Point Feature
   * @returns {Array<Feature>}
   */
  findFeaturesContainingPoint: (geojson, point) => {
    if (!geojson || !Array.isArray(geojson.features) || !point) return [];
    try {
      let ptCoords = null;
      if (Array.isArray(point) && point.length >= 2) {
        ptCoords = point;
      } else if (point.type === "Feature" && point.geometry?.type === "Point") {
        ptCoords = point.geometry.coordinates;
      }
      if (!ptCoords) return [];

      // Detect if point coords are in WebMercator (>180) and convert to WGS84 when needed
      const needsConvert =
        Math.abs(ptCoords[0]) > 180 || Math.abs(ptCoords[1]) > 90;
      const pointWgs = needsConvert
        ? SpatialAnalysis._mercatorToWGS84(ptCoords)
        : ptCoords;

      const hits = [];
      for (let i = 0; i < geojson.features.length; i++) {
        const f = geojson.features[i];
        if (!f || !f.geometry) continue;

        // Convert feature geometry to WGS84 if it appears to be WebMercator
        const firstCoord = (() => {
          const geom = f.geometry;
          if (!geom) return null;
          const t = geom.type;
          const c = geom.coordinates;
          if (!c) return null;
          if (t === "Point") return c;
          if (t === "MultiPoint" || t === "LineString") return c[0];
          if (t === "MultiLineString" || t === "Polygon") return c[0]?.[0];
          if (t === "MultiPolygon") return c[0]?.[0]?.[0];
          return null;
        })();

        const featureNeedsConv =
          firstCoord &&
          (Math.abs(firstCoord[0]) > 180 || Math.abs(firstCoord[1]) > 90);
        let featW = f;
        if (featureNeedsConv) {
          const conv = (coords) => {
            if (typeof coords[0] === "number")
              return SpatialAnalysis._mercatorToWGS84(coords);
            return coords.map(conv);
          };
          featW = {
            type: "Feature",
            properties: f.properties || {},
            geometry: {
              type: f.geometry.type,
              coordinates: conv(f.geometry.coordinates),
            },
          };
        }

        try {
          const pt = turf.point(pointWgs);
          if (turf.booleanPointInPolygon(pt, featW)) hits.push(featW);
        } catch (e) {
          // ignore
        }
      }
      return hits;
    } catch (e) {
      console.error("findFeaturesContainingPoint failed:", e);
      return [];
    }
  },
};
