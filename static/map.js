// import * as L from '/leaflet-src.esm.js';

const P = (options) => new protomapsL.PolygonSymbolizer(options);
const Ln = (options) => new protomapsL.LineSymbolizer(options);
const Tl = (options) => new protomapsL.TextSymbolizer(options);
const Ts = (options) => new protomapsL.ShieldSymbolizer(options);
const Tc = (options) => new protomapsL.CenteredTextSymbolizer(options);

class MapController {
  map_attribution =
    '&copy; <a href="//www.openstreetmap.org/copyright>OpenStreetMap</a>';
  marker_size = [36, 36];
  vector_tiles_url = "https://m.tpwres.pl/poland.pmtiles";
  iconsForKind = {
    venue: "map-pin",
    "historical-venue": "map-pin-x-inside",
    "important-venue": "map-pin-check-inside",
  };

  constructor(root) {
    this.style = getComputedStyle(document.body);
    this.map = L.map(root, {
      minZoom: 7,
      maxZoom: 12,
    });
    this.setupLayers();
    const objects_url = root.dataset.objectsList;
    this.loadObjects(objects_url);
    this.map.setView([52.0693, 19.4803], 7);
    this.map.setMaxBounds([
      [13.99, 48.986],
      [24.161, 55.2282],
    ]);
  }

  loadOSMLayer() {
    return L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 16,
      attribution: this.map_attribution,
    });
  }

  loadPMVectorLayers() {
    const vector_layer = protomapsL.leafletLayer({
      url: this.vector_tiles_url,
      paintRules: this.paint_rules(),
      labelRules: this.label_rules(),
      backgroundColor: this.style.getPropertyValue("--bg"),
    });
    return vector_layer;
  }

  setupLayers() {
    const osm = this.loadOSMLayer();
    const vec = this.loadPMVectorLayers();
    this.map.addLayer(vec);
    const layerControl = L.control.layers();
    layerControl.addBaseLayer(vec, "Base map");
    layerControl.addBaseLayer(osm, "OpenStreetMap");
    layerControl.addTo(this.map);
  }

  loadObjects(url) {
    fetch(url)
      .then((response) => response.json())
      .then((data) => this.addFeatures(data));
  }

  addFeatures(geojson) {
    for (const feature of geojson) {
      const kind = feature.properties.type;
      L.geoJSON(feature, {
        pointToLayer: (point, latlng) =>
          this.createMarker(kind, latlng, feature),
      }).addTo(this.map);
    }
  }

  createMarker(kind, latlng, feature) {
    const sprite = "/lucide-sprite.svg";
    const orgs = feature.properties.orgs || [];
    const single_org_style = orgs.length == 1 ? `orgpin-${orgs[0]}` : "";
    const [w, h] = this.marker_size;

    const html = `<svg class="feather-nowidth" viewBox="0 0 24 24" width="${w}" height="${h}">
            <use href="${sprite}#${this.iconsForKind[kind]}"/>
        </svg>`;
    const icon = L.divIcon({
      html: html,
      className: `no-bg-icon ${single_org_style}`,
      iconSize: this.marker_size,
    });
    return L.marker(latlng, {
      icon: icon,
      title: feature.properties.name,
    }).bindPopup((layer) => this.popupContent(feature));
  }

  popupContent(feature) {
    const el = document.createElement("div");
    el.style.fontSize = "1rem";
    el.innerHTML = feature.properties.description;
    for (const org of feature.properties.orgs || []) {
      el.append(this.badge(org));
    }
    return el;
  }

  brand_colors(org) {
    switch (org) {
      case "ppw":
        return { fg: "#c7c7c7", bg: "#5b007e" };
      case "mzw":
        return { fg: "#ffffff", bg: "#208315" };
      case "kpw":
        return { fg: "#ffffff", bg: "#133762" };
      default:
        return { fg: "#ffffff", bg: "#000000" };
    }
  }

  badge(org) {
    const a = document.createElement("a");
    a.textContent = org.toUpperCase();
    a.classList.add("org-badge", "nu");
    const brandcolor = this.brand_colors(org).bg;
    const css = `
            background: url(${org}-badge.svg) no-repeat 0 0 / cover, ${brandcolor};
            background-position: center;
            color: transparent;
            font-size: 1.25rem
        `;
    a.style.cssText = css;
    return a;
  }

  paint_rules() {
    const style = this.style;
    const accent = style.getPropertyValue("--accent");
    const lightGray = style.getPropertyValue("--light-gray");
    const darkRed = style.getPropertyValue("--dark-red");
    return [
      // Water bodies
      {
        dataLayer: "water",
        symbolizer: P({ fill: "#a8d5f5", opacity: 0.8 }),
      },

      // Land/background
      {
        dataLayer: "landuse",
        symbolizer: P({ fill: "#f8f6f1", opacity: 1.0 }),
      },
      {
        dataLayer: "landcover",
        symbolizer: P({ fill: "#f8f6f1", opacity: 1.0 }),
      },

      // Natural areas (parks, forests)
      {
        dataLayer: "park",
        symbolizer: P({
          fill: "#d4e7c5",
          opacity: 0.7,
        }),
      },

      // Buildings
      {
        dataLayer: "building",
        symbolizer: {
          type: "fill",
          fill: "#e8e8e8",
          stroke: "#d0d0d0",
          width: 0.5,
          opacity: 0.8,
        },
      },

      // Major roads/highways
      {
        dataLayer: "transportation",
        symbolizer: Ln({
          color: accent,
          width: 2,
          opacity: 0.8,
        }),
      },

      // Administrative boundaries
      {
        dataLayer: "boundary",
        symbolizer: Ln({
          color: lightGray,
          width: 2,
          opacity: 0.6,
          dash: [5, 5],
        }),
      },
    ];
  }

  label_rules() {
    const style = this.style;
    const textColor = style.getPropertyValue("--text");
    return [
      {
        dataLayer: "place",
        symbolizer: Tc({
          labelProps: ["name:latin"],
          fill: textColor,
          stroke: "#00000",
          font: "400 0.8rem sans-serif",
        }),
        filter: (zoom, feature) => {
          return feature.props.class == "town";
        },
      },
      {
        dataLayer: "place",
        symbolizer: Tc({
          labelProps: ["name:latin"],
          fill: textColor,
          stroke: "#00000",
          font: "400 1rem sans-serif",
        }),
        filter: (zoom, feature) => {
          return feature.props.class === "city";
        },
      },
    ];
  }
}

new MapController(document.querySelector("#map"));
