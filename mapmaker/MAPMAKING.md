Install `tilemaker`, from package or from source.

Fetch the coastlines zip, look at https://github.com/systemed/tilemaker/blob/master/get-coastline.sh. It must unpack to the coastline/ dir here.

Run the following:

```sh
tilemaker --no-compress-nodes INPUT_OSM_FILE OUTPUT.pmtiles --config config.json --process process-openmaptiles.lua --store STORE_DIR
```

* INPUT_OSM_FILE is a Poland export downloaded from Geofabrik.
* STORE_DIR is a tempdir on a fast drive that tilemaker will use as temporary storage. It likes to exhaust RAM.
