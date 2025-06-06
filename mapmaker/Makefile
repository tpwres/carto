.SUFFIXES:

# Find a suitable cache dir
ifneq ($(XDG_CACHE_HOME),)
CACHE_DIR := $(XDG_CACHE_HOME)/tilemaker
else
CACHE_DIR := $(HOME)/.cache/tilemaker
endif

# Prefer aria2c which can do multithreaded downloads.
ifeq ($(shell which aria2c),)
DL_COMMAND := curl
else
DL_COMMAND := aria2c
endif

.INTERMEDIATE: COASTLINE URBAN

# Provide your own tilemaker executable: TILEMAKER=/path/to/tilemaker make
TILEMAKER ?= "tilemaker"

all: poland.pmtiles
	@test -f water-polygons-split-4326.zip && echo "You may delete water-polygons-split-4326.zip now."
	@test -f ne_10m_urban_areas.zip && echo "You may delete ne_10m_urban_areas.zip now."
	@echo PMTiles viewer: https://pmtiles.io

poland.osm.pbf:
	@echo "Downloading Poland map export from GeoFabrik"
	$(DL_COMMAND) -o $@ https://download.geofabrik.de/europe/poland-latest.osm.pbf

water-polygons-split-4326.zip:
	@echo "Downloading water polygons shapefiles from OSMData"
	$(DL_COMMAND) -o $@ https://osmdata.openstreetmap.de/download/$@

ne_10m_urban_areas.zip:
	@echo "Downloading landuse shapefiles from Natural Earth"
	$(DL_COMMAND) -o $@ https://naciscdn.org/naturalearth/10m/cultural/$@

# Main entrypoint
# Tilemaker can also make use of ice_shelf and glacier datasets, which we skip
poland.pmtiles: poland.osm.pbf config.json process-openmaptiles.lua COASTLINE URBAN
	mkdir -p $(CACHE_DIR)
	$(TILEMAKER) \
			  poland.osm.pbf $@ \
			  --fast \
			  --config config.json \
			  --process process-openmaptiles.lua \
			  --store $(CACHE_DIR)
	du -h $@

COASTLINE: coastline/water_polygons.shp

coastline/water_polygons.shp coastline/water_polygons.shx &: water-polygons-split-4326.zip
	mkdir -p coastline
	unzip -DD -o -j -d coastline/ $^

URBAN: landcover/ne_10m_urban_areas/ne_10m_urban_areas.shp landcover/ne_10m_urban_areas/ne_10m_urban_areas.shx

landcover/ne_10m_urban_areas/ne_10m_urban_areas.shp landcover/ne_10m_urban_areas/ne_10m_urban_areas.shx &: ne_10m_urban_areas.zip
	mkdir -p landcover/ne_10m_urban_areas
	unzip -DD -o -j -d landcover/ne_10m_urban_areas/ $^ \
        ne_10m_urban_areas.shp \
        ne_10m_urban_areas.shx \
