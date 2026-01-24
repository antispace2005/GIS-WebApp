/**
 * Data Registry Module
 * A central, non-reactive store for raw GeoJSON data.
 * This allows multiple widgets (Heatmaps, Intersections, Pop-counts)
 * to access the same source data without re-fetching or duplicating memory.
 */

const store = new Map();

export const DataRegistry = {
  /**
   * Store GeoJSON data in the registry.
   * @param {string} id - Unique identifier (e.g., the layer name or filename).
   * @param {Object} data - The standardized GeoJSON FeatureCollection.
   */
  set: (id, data) => {
    store.set(id, data);
    console.log(`Registry: Layer "${id}" stored.`);
  },

  /**
   * Retrieve raw GeoJSON data by its ID.
   * @param {string} id
   * @returns {Object|null} - The GeoJSON object or null if not found.
   */
  get: (id) => {
    return store.get(id) || null;
  },

  /**
   * Remove a layer from the registry to free up memory.
   * @param {string} id
   */
  remove: (id) => {
    if (store.has(id)) {
      store.delete(id);
      console.log(`Registry: Layer "${id}" removed.`);
    }
  },

  /**
   * Check if a specific layer is currently cached.
   * @param {string} id
   * @returns {boolean}
   */
  has: (id) => {
    return store.has(id);
  },

  /**
   * Optional: Get all currently registered IDs.
   * Useful for building dynamic dropdowns for analysis tools.
   */
  getAllIds: () => {
    return Array.from(store.keys());
  },
};
