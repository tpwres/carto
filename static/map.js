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
    this.root = root;
    document.addEventListener("themechanged", this.on_theme_changed.bind(this));
    this.init_map();
  }

  init_map() {
    const objects_url = this.root.dataset.objectsList;
    this.map = L.map(this.root, {
      zoomSnap: 0.25,
      zoomDelta: 0.25,
    });
    this.setup_layers();
    this.load_objects(objects_url);
    const bounds = [
      [48.986, 13.99],
      [55.228, 24.161],
    ];
    this.map.setMaxBounds(bounds);
    this.map.fitBounds(bounds);
  }

  on_theme_changed(event) {
    const old_vec = this.vector_layer;
    const vec = this.loadPMVectorLayers();
    this.vector_layer = vec;
    this.map.addLayer(vec);
    this.map.removeLayer(old_vec);
    this.layer_control.remove();
    this.setup_controls(this.osm_layer, vec);
  }

  loadOSMLayer() {
    return L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: this.map_attribution,
    });
  }

  loadPMVectorLayers() {
    const vector_layer = protomapsL.leafletLayer({
      url: this.vector_tiles_url,
      minZoom: 6.5,
      maxZoom: 13,
      paintRules: this.paint_rules(),
      labelRules: this.label_rules(),
      backgroundColor: this.style.getPropertyValue("--bg"),
    });
    return vector_layer;
  }

  setup_layers() {
    const osm = this.loadOSMLayer();
    const vec = this.loadPMVectorLayers();
    this.vector_layer = vec;
    this.osm_layer = osm;
    this.map.addLayer(vec);
    this.setup_controls(osm, vec);
  }

  setup_controls(osm, vec) {
    const layerControl = L.control.layers();
    this.layer_control = layerControl;
    layerControl.addBaseLayer(vec, "Base map");
    layerControl.addBaseLayer(osm, "OpenStreetMap");
    layerControl.addTo(this.map);
  }

  load_objects(url) {
    fetch(url)
      .then((response) => response.json())
      .then((data) => this.add_features(data));
  }

  add_features(geojson) {
    for (const feature of geojson) {
      const kind = feature.properties.type;
      L.geoJSON(feature, {
        pointToLayer: (point, latlng) =>
          this.create_marker(kind, latlng, feature),
      }).addTo(this.map);
    }
  }

  create_marker(kind, latlng, feature) {
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
      iconAnchor: [w / 2, h],
    });
    return L.marker(latlng, {
      icon: icon,
      title: feature.properties.name,
    }).bindPopup((layer) => this.popup_content(feature));
  }

  popup_content(feature) {
    const el = document.createElement("div");
    el.style.fontSize = "1rem";
    el.innerHTML = feature.properties.description;
    for (const org of feature.properties.orgs || []) {
      el.append(this.badge(org));
        el.append(' ');
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
      case "dfw":
        return { fg: "#fbf1c7", bg: "#a9100b" };
      default:
        return { fg: "#ffffff", bg: "#000000" };
    }
  }

  has_logo_badge(org) {
      return ['ddw', 'dfw', 'kpw', 'low', 'mcw', 'mzw', 'piwg', 'ppw', 'ptw', 'pxw', 'tbw', 'wwe'].indexOf(org) != -1;
  }

  badge(org) {
    const a = document.createElement("a");
    a.textContent = org.toUpperCase();
    a.classList.add("org-badge", "nu");
    const brandcolor = this.brand_colors(org);
    const has_logo = this.has_logo_badge(org);
    const css = `
      background: url(${org}-badge.svg) no-repeat 0 0 / cover, ${brandcolor.bg};
      background-position: center;
      color: ${has_logo ? 'transparent' : '#fff'};
      font-size: 1.25rem;
      font-family: monospace;
      padding: 0 0.5rem;
    `;
    a.style.cssText = css;
    return a;
  }

  paint_rules() {
    const style = this.style;
    const fg = style.getPropertyValue("--fg");
    const accent = style.getPropertyValue("--accent") || fg;
    const lightGray = style.getPropertyValue("--light-gray") || fg;
    const darkGray = style.getPropertyValue("--dark-gray") || fg;
    return [
      // Water bodies
      { dataLayer: "water", symbolizer: P({ fill: "#a8d5f5", opacity: 0.8 }) },

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
      { dataLayer: "park", symbolizer: P({ fill: "#d4e7c5", opacity: 0.7 }) },

      // Buildings
      {
        dataLayer: "building",
        symbolizer: P({
          type: "fill",
          fill: accent,
          stroke: "black",
          width: 0.5,
          opacity: 0.8,
        }),
      },

      // Major roads/highways
      {
        dataLayer: "transportation",
        symbolizer: Ln({ color: accent, width: 1.2, opacity: 0.8 }),
        filter: (zoom, feature) => feature.props.class != "rail",
      },
      // Rail
      {
        dataLayer: "transportation",
        symbolizer: Ln({
          color: fg,
          width: 3,
          opacity: 0.5,
          dash: [10, 10],
        }),
        filter: (zoom, feature) => feature.props.class == "rail",
      },

      // Administrative boundaries
      {
        dataLayer: "boundary",
        symbolizer: Ln({
          color: darkGray,
          width: 5,
          opacity: 0.9,
        }),
        filter: (zoom, feature) => feature.props.admin_level == 2,
      },
      {
        dataLayer: "boundary",
        symbolizer: Ln({
          color: lightGray,
          width: 2,
          opacity: 0.3,
          dash: [5, 5],
        }),
        filter: (zoom, feature) => {
          if ("admin_level" in feature.props) {
            const level = feature.props.admin_level;
            if (level > 8) return false;
            if (level < 4) return false;
          }
          return true;
        },
      },
    ];
  }

  label_rules() {
    const style = this.style;
    const textColor =
      style.getPropertyValue("--text") || style.getPropertyValue("--fg");
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
