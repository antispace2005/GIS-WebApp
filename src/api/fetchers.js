/**
 * API Fetchers Module
 * Handles the retrieval of spatial data from external and local sources.
 */

export const Fetchers = {
  /**
   * Fetches data from a GeoServer WFS service.
   * @param {string} baseUrl - The base URL of the GeoServer (e.g., 'http://localhost:8080/geoserver/wfs')
   * @param {string} typeName - The workspace:layerName (e.g., 'gis:population_points')
   * @returns {Promise<Object>} - Resolves to GeoJSON
   */
  fetchWFS: async (baseUrl, typeName, options = { useCache: true }) => {
    const { useCache = true } = options;
    const cacheKey = `${baseUrl}|${typeName}`;

    // 1) Try IndexedDB cache first
    if (useCache && typeof indexedDB !== "undefined") {
      try {
        const cached = await getFromCache(cacheKey);
        if (cached?.data) {
          return cached.data;
        }
      } catch (err) {
        console.warn("WFS cache read failed", err);
      }
    }

    const url = new URL(baseUrl, window.location.origin);
    const params = {
      service: "WFS",
      version: "1.1.0",
      request: "GetFeature",
      typeName: typeName,
      outputFormat: "application/json",
      srsName: "EPSG:4326",
    };

    Object.keys(params).forEach((key) =>
      url.searchParams.append(key, params[key]),
    );

    console.log("Fetching WFS from:", url.toString());

    const response = await fetch(url);

    // Check response status
    if (!response.ok) {
      throw new Error(`WFS request failed with status ${response.status}`);
    }

    // Check if the content type is actually JSON
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const json = await response.json();

      // 2) Write to cache
      if (useCache && typeof indexedDB !== "undefined") {
        try {
          await putInCache(cacheKey, { data: json, ts: Date.now() });
        } catch (err) {
          console.warn("WFS cache write failed", err);
        }
      }

      return json;
    } else {
      // If GeoServer sends XML instead of JSON, it's an error message
      const errorText = await response.text();
      console.error(
        "GeoServer returned XML instead of JSON. Full Error:",
        errorText,
      );
      throw new Error("GeoServer error: Check console for XML details.");
    }
  },

  /**
   * Reads a local GeoJSON file provided by an <input type="file"> or Drag & Drop.
   * @param {File} file - The file object from the browser.
   * @returns {Promise<Object>} - Resolves to GeoJSON
   */
  readLocalFile: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target.result);
          resolve(json);
        } catch (error) {
          reject(new Error("Invalid JSON format in local file."));
        }
      };

      reader.onerror = () => reject(new Error("File reading failed."));
      reader.readAsText(file);
    });
  },
};

// --- IndexedDB helpers for WFS cache ---
const DB_NAME = "gis-cache";
const DB_VERSION = 1;
const STORE = "wfs";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getFromCache(key) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const store = tx.objectStore(STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

function putInCache(key, value) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
}
