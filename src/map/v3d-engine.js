import OLCesium from "ol-cesium";
import * as Cesium from "cesium";
import { transform } from "ol/proj";

// Make Cesium available globally for ol-cesium
window.Cesium = Cesium;

/**
 * 3D Engine Manager
 * Handles CesiumJS integration with OpenLayers for 3D visualization
 */
export class V3DEngine {
  constructor(map) {
    this.map = map;
    this.cesiumInstance = null;
    this.is3DEnabled = false;
    this.scene = null;
    this.camera = null;

    // Initialize Cesium Ion access token (you'll need to replace this with your own)
    // Get free token at: https://cesium.com/ion/signup
    Cesium.Ion.defaultAccessToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0NGI4ZGMyMC1jMmNlLTQ0NjYtODBiNC1iMTMwMDM1ZGNiZWQiLCJpZCI6MzgyOTMwLCJpYXQiOjE3NjkyNjEwNjh9.G_eYUe2Cdxwo36lDHfeYpDRMUwQoNed4UUKVLSpCLec";
  }

  /**
   * Initialize the OLCesium instance
   */
  init() {
    if (this.cesiumInstance) return;

    console.log("Initializing 3D Engine...");

    // Create OLCesium instance with minimal synchronization
    this.cesiumInstance = new OLCesium({
      map: this.map,
      createWorldImagery: false, // We'll add our own imagery
      stopOpenLayersEventsPropagation: true,
    });

    // Disable automatic layer synchronization temporarily to see the globe
    this.cesiumInstance.setBlockCesiumRendering(false);

    // Get Cesium scene and camera references
    const scene = this.cesiumInstance.getCesiumScene();
    this.scene = scene;
    this.camera = scene.camera;

    console.log("Scene:", scene);
    console.log("Camera:", this.camera);

    // Wait a bit for scene to initialize
    setTimeout(() => {
      // Configure scene settings
      this.configureScene();

      // Add terrain provider
      this.addTerrainProvider();

      // Setup lighting
      this.configureLighting();

      console.log("3D Engine initialized");
      console.log("Imagery layers:", scene.imageryLayers.length);
    }, 100);
  }

  /**
   * Configure Cesium scene settings
   */
  configureScene() {
    if (!this.scene) return;

    const scene = this.scene;

    console.log("Configuring scene...");
    console.log("Initial imagery layers:", scene.imageryLayers.length);

    // Basic scene setup with safety checks
    if (scene.globe) {
      scene.globe.show = true;
      scene.globe.enableLighting = false;
      scene.globe.depthTestAgainstTerrain = false;
      scene.globe.showGroundAtmosphere = true;
      scene.globe.baseColor = Cesium.Color.BLUE; // Visible blue if imagery fails
      scene.globe.tileCacheSize = 100;
      console.log("Globe configured with base color");
    }

    if (scene.skyBox) scene.skyBox.show = true;
    if (scene.sun) scene.sun.show = false; // Hide sun for cleaner view
    if (scene.moon) scene.moon.show = false; // Hide moon
    if (scene.skyAtmosphere) scene.skyAtmosphere.show = true;
    if (scene.fog) scene.fog.enabled = false;

    // Anti-aliasing
    scene.fxaa = true;

    // Set background color to blue for testing
    scene.backgroundColor = Cesium.Color.fromCssColorString("#1e90ff");

    // Add imagery after scene is configured
    this.addImagery();

    console.log("Scene background color set to blue");
    console.log("Globe show:", scene.globe.show);
    console.log("Globe base color:", scene.globe.baseColor);
  }

  /**
   * Add imagery to the globe
   */
  addImagery() {
    if (!this.scene || !this.scene.imageryLayers) return;

    const scene = this.scene;

    console.log("Adding imagery to globe...");
    console.log(
      "Current imagery layers before adding:",
      scene.imageryLayers.length,
    );

    // Use OSM directly - it's more reliable
    try {
      const osmProvider = new Cesium.OpenStreetMapImageryProvider({
        url: "https://tile.openstreetmap.org/",
      });

      const layer = scene.imageryLayers.addImageryProvider(osmProvider);
      layer.alpha = 1.0;
      layer.brightness = 1.0;
      layer.contrast = 1.0;
      layer.show = true;

      console.log("OSM imagery provider added");
      console.log("Layer properties:", {
        show: layer.show,
        alpha: layer.alpha,
        brightness: layer.brightness,
        contrast: layer.contrast,
      });
      console.log("Total imagery layers:", scene.imageryLayers.length);

      // Check provider readiness
      if (osmProvider.ready) {
        console.log("Provider is ready immediately");
      } else {
        console.log("Provider not ready yet, will check...");
        setTimeout(() => {
          console.log("Checking imagery after 2 seconds...");
          console.log("Provider ready:", osmProvider.ready);
          console.log("Layer show:", layer.show);
          console.log("Imagery layers count:", scene.imageryLayers.length);
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to add OSM imagery:", error);
    }
  }

  /**
   * Add terrain provider for elevation data
   */
  addTerrainProvider() {
    if (!this.scene) return;

    try {
      // Use Cesium World Terrain - newer API
      this.scene.terrainProvider = Cesium.CesiumTerrainProvider.fromIonAssetId(
        1,
        {
          requestWaterMask: true, // Show water bodies
          requestVertexNormals: true, // Better lighting
        },
      );

      console.log("Terrain provider added");
    } catch (error) {
      console.warn("Failed to load terrain provider:", error);
    }
  }

  /**
   * Configure scene lighting
   */
  configureLighting() {
    if (!this.scene) return;

    // Enable sun lighting
    this.scene.globe.enableLighting = true;

    // Configure shadows (optional, can impact performance)
    this.scene.shadowMap.enabled = false; // Disable by default for performance
  }

  /**
   * Toggle between 2D and 3D view
   */
  toggle() {
    if (!this.cesiumInstance) {
      this.init();
    }

    this.is3DEnabled = !this.is3DEnabled;
    this.cesiumInstance.setEnabled(this.is3DEnabled);

    if (this.is3DEnabled) {
      this.onEnable3D();
    } else {
      this.onDisable3D();
    }

    return this.is3DEnabled;
  }

  /**
   * Actions when 3D mode is enabled
   */
  onEnable3D() {
    console.log("3D Mode Enabled");

    // Adjust camera to Egypt's location (no tilt)
    if (this.camera && this.scene) {
      // Make sure globe is rendering
      this.scene.globe.show = true;

      // Egypt coordinates: approximately 26°N, 30°E
      setTimeout(() => {
        this.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            30.0, // Longitude (Egypt center)
            26.0, // Latitude (Egypt center)
            2000000, // Height in meters (2000 km for country view)
          ),
          orientation: {
            heading: 0.0,
            pitch: Cesium.Math.toRadians(-89), // Almost straight down but not exactly
            roll: 0.0,
          },
          duration: 2.0, // 2 second animation
        });
        console.log("Camera flying to Egypt");
      }, 500);
    }
  }

  /**
   * Actions when 3D mode is disabled
   */
  onDisable3D() {
    console.log("3D Mode Disabled");
  }

  /**
   * Convert OpenLayers coordinates to Cesium Cartographic
   */
  olCoordsToCesiumCartographic(coords) {
    // Convert from EPSG:3857 to EPSG:4326
    const lonLat = transform(coords, "EPSG:3857", "EPSG:4326");
    return {
      longitude: lonLat[0],
      latitude: lonLat[1],
    };
  }

  /**
   * Create 3D extrusion entities for population data
   * @param {Array} features - GeoJSON features with population data
   * @param {string} weightAttr - Population attribute name
   */
  createPopulationExtrusions(features, weightAttr = "population") {
    if (!this.scene || !this.is3DEnabled) return;

    const entities = [];

    features.forEach((feature) => {
      const coords = feature.geometry.coordinates;
      const population = parseFloat(feature.properties[weightAttr]) || 0;

      // Skip if no population data
      if (population === 0) return;

      // Calculate height based on population (scale as needed)
      const height = Math.min(population * 10, 500000); // Max 500km height

      // Create position
      const position = Cesium.Cartesian3.fromDegrees(
        coords[0],
        coords[1],
        height / 2, // Position at half height for cylinder center
      );

      // Add cylinder entity
      const entity = this.cesiumInstance.getDataSources().add({
        position: position,
        cylinder: {
          length: height,
          topRadius: 5000, // 5km radius
          bottomRadius: 5000,
          material: Cesium.Color.RED.withAlpha(0.7),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        properties: {
          population: population,
        },
      });

      entities.push(entity);
    });

    console.log(`Created ${entities.length} 3D extrusions`);
    return entities;
  }

  /**
   * Tilt camera view
   * @param {number} degrees - Tilt angle in degrees (negative = looking down)
   */
  tiltCamera(degrees) {
    if (!this.camera) return;

    this.camera.setView({
      orientation: {
        heading: this.camera.heading,
        pitch: Cesium.Math.toRadians(degrees),
        roll: this.camera.roll,
      },
    });
  }

  /**
   * Rotate camera view
   * @param {number} degrees - Rotation angle in degrees
   */
  rotateCamera(degrees) {
    if (!this.camera) return;

    this.camera.setView({
      orientation: {
        heading: Cesium.Math.toRadians(degrees),
        pitch: this.camera.pitch,
        roll: this.camera.roll,
      },
    });
  }

  /**
   * Get current 3D state
   */
  isEnabled() {
    return this.is3DEnabled;
  }

  /**
   * Get Cesium scene
   */
  getScene() {
    return this.scene;
  }

  /**
   * Get Cesium camera
   */
  getCamera() {
    return this.camera;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.cesiumInstance) {
      this.cesiumInstance.setEnabled(false);
      this.cesiumInstance = null;
    }
  }
}
