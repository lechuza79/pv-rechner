"""Official building/terrain tile adapters per federal state for new municipal stages.

Every adapter returns tiles in the shared scene reference ETRS89/UTM32 with
DHHN2016 heights. Brandenburg publishes UTM33; its tiles are converted at intake
(exact datum-identical ETRS89 transformation, heights unchanged) so the shared
preparer, checks and front end keep one reference. Original URLs and hashes of
both the delivered and the derived file are retained.
"""
import hashlib
import io
import math
import re
import zipfile
from pathlib import Path
from urllib.parse import urljoin, urlparse
import xml.etree.ElementTree as E

import requests
from pyproj import Transformer
from shapely.geometry import box

UA = {'User-Agent': 'solar-check-landscape (https://solar-check.io)'}

ADAPTERS = {
    '03': dict(key='niedersachsen', prefix='ni', native=25832,
               buildingLicense='CC BY 4.0 · LGLN', terrainLicense='CC BY 4.0 · LGLN',
               osmPage='https://download.geofabrik.de/europe/germany/niedersachsen.html'),
    '05': dict(key='nordrhein-westfalen', prefix='nw', native=25832,
               buildingLicense='dl-de/zero-2-0 · Geobasis NRW', terrainLicense='dl-de/zero-2-0 · Geobasis NRW',
               osmPage='https://download.geofabrik.de/europe/germany/nordrhein-westfalen.html'),
    '12': dict(key='brandenburg', prefix='bb', native=25833,
               buildingLicense='© GeoBasis-DE/LGB, dl-de/by-2-0 [Daten bearbeitet]',
               terrainLicense='© GeoBasis-DE/LGB, dl-de/by-2-0 [Daten bearbeitet]',
               osmPage='https://download.geofabrik.de/europe/germany/brandenburg.html'),
    '15': dict(key='sachsen-anhalt', prefix='st', native=25832,
               buildingLicense='© GeoBasis-DE / LVermGeo ST, dl-de/by-2-0',
               terrainLicense='© GeoBasis-DE / LVermGeo ST, dl-de/by-2-0',
               osmPage='https://download.geofabrik.de/europe/germany/sachsen-anhalt.html'),
}

NRW_DGM = 'https://www.opengeodata.nrw.de/produkte/geobasis/hm/dgm1_tiff/dgm1_tiff/'
NRW_LOD = 'https://www.opengeodata.nrw.de/produkte/geobasis/3dg/lod2_gml/lod2_gml/'
BB_DGM = 'https://data.geobasis-bb.de/geobasis/daten/dgm/tif/'
BB_LOD = 'https://data.geobasis-bb.de/geobasis/daten/3d_gebaeude/lod2_gml/'


def adapter_for(ags):
    if len(ags) != 8 or not ags.isdigit():
        return None
    return ADAPTERS.get(ags[:2])


def grid_cells(area, crs_from=25832, crs_to=25832, size=1000):
    """1 km cells (south-west corner, km) in the delivery reference touching area."""
    if crs_from != crs_to:
        convert = Transformer.from_crs(crs_from, crs_to, always_xy=True).transform
        from shapely.ops import transform
        area_native = transform(convert, area)
    else:
        area_native = area
    minx, miny, maxx, maxy = area_native.bounds
    cells = []
    for e in range(math.floor(minx/size), math.ceil(maxx/size)):
        for n in range(math.floor(miny/size), math.ceil(maxy/size)):
            if area_native.intersects(box(e*size, n*size, (e+1)*size, (n+1)*size)):
                cells.append((e, n))
    return cells


def _get(url, **kwargs):
    response = requests.get(url, headers=UA, timeout=(20, 120), **kwargs)
    response.raise_for_status()
    return response


def nrw_index(url, fetch=_get):
    root = E.fromstring(fetch(url).content)
    return [(f.get('name'), f.get('timestamp')) for f in root.iter('file')]


def nrw_tiles(terrain, buildings, fetch=_get):
    dgm, lod = {}, {}
    for name, stamp in nrw_index(NRW_DGM, fetch):
        match = re.fullmatch(r'dgm1_32_(\d+)_(\d+)_1_nw_(\d{4})\.tif', name or '')
        if match:
            cell = (int(match[1]), int(match[2]))
            # Newest acquisition year per cell, never the first listed.
            if cell not in dgm or (match[3], name) > dgm[cell][0]:
                dgm[cell] = ((match[3], name), name)
    for name, stamp in nrw_index(NRW_LOD, fetch):
        match = re.fullmatch(r'LoD2_32_(\d+)_(\d+)_1_NW\.gml', name or '')
        if match:
            lod[(int(match[1]), int(match[2]))] = name
    jobs = []
    for cell in grid_cells(terrain):
        # Cells across the state/national border have no tile; the preparer
        # trims or rejects the resulting edge, it is never filled in.
        if cell in dgm:
            jobs.append(('dgm', NRW_DGM+dgm[cell][1]))
    # Cells without buildings are legitimately absent from the LoD2 index.
    jobs += [('lod', NRW_LOD+lod[cell]) for cell in grid_cells(buildings) if cell in lod]
    return jobs


def bb_index(url, fetch=_get):
    return set(re.findall(r'href="([a-z0-9]+_33\d+-\d+\.zip)"', fetch(url).text))


BB_WCS = 'https://isk.geobasis-bb.de/ows/dgm_wcs'


def bb_terrain_url(terrain, resolution=5):
    """One WCS 2.0.1 request for the official DGM1 (served resampled to 5 m) over the terrain box.

    The download portal throttles 1 km tiles to a few per minute; the coverage
    service returns the same model in one response (spot checks agree within
    ~0.15 m with the 1 m tiles). The scene grid is 20 m.
    """
    from shapely.ops import transform
    native = transform(Transformer.from_crs(25832, 25833, always_xy=True).transform, terrain).bounds
    step = 100
    minx, miny = math.floor(native[0]/step)*step-step, math.floor(native[1]/step)*step-step
    maxx, maxy = math.ceil(native[2]/step)*step+step, math.ceil(native[3]/step)*step+step
    return (BB_WCS+'?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=bb_dgm&FORMAT=image/tiff'
            '&SUBSET=x(%d,%d)&SUBSET=y(%d,%d)&SCALEFACTOR=%s' % (minx, maxx, miny, maxy, 1/resolution))


def bb_tiles(terrain, buildings, fetch=_get):
    lod = bb_index(BB_LOD, fetch)
    jobs = [('dgm', bb_terrain_url(terrain))]
    for e, n in grid_cells(buildings, 25832, 25833):
        name = 'lod2_33%d-%d.zip' % (e, n)
        if name in lod:
            jobs.append(('lod', BB_LOD+name))
    return jobs


def utm33_to_32():
    return Transformer.from_crs(25833, 25832, always_xy=True)


def convert_gml(text, transformer=None):
    """Rewrite every 3D coordinate list from UTM33 to UTM32; heights untouched."""
    transformer = transformer or utm33_to_32()
    if 'UTM32' in text and 'UTM33' not in text:
        raise ValueError('GML already in UTM32; refusing double conversion')

    def triples(values):
        numbers = [float(v) for v in values.split()]
        if len(numbers) % 3:
            raise ValueError('Coordinate list is not three-dimensional')
        xs, ys = transformer.transform(numbers[0::3], numbers[1::3])
        if any(not math.isfinite(v) for v in list(xs)+list(ys)):
            raise ValueError('Non-finite converted coordinate')
        return ' '.join('%.3f %.3f %s' % (x, y, z) for x, y, z in zip(xs, ys, values.split()[2::3]))

    text, count = re.subn(r'(<gml:(?:posList|pos|lowerCorner|upperCorner)\b[^>]*>)([^<]+)(<)',
                          lambda m: m[1]+triples(m[2])+m[3], text)
    if not count:
        raise ValueError('No coordinates found in GML')
    return text.replace('ETRS89_UTM33', 'ETRS89_UTM32')


def convert_dgm_mosaic(native, destination, resolution=5):
    """Mosaic UTM33 DGM1 tiles natively, then reproject once to UTM32.

    Warping tile by tile leaves nodata seams along every rotated tile edge; one
    warp of the mosaic does not. 5 m output is still finer than the 20 m scene grid.
    """
    import numpy as np
    import rasterio
    from rasterio.crs import CRS
    from rasterio.merge import merge
    from rasterio.warp import Resampling, calculate_default_transform, reproject
    sources = [rasterio.open(path) for path in native]
    try:
        for source in sources:
            # Delivered as UTM33 (+ DHHN2016, the product's only height system; a few
            # tiles omit the vertical tag). Any other declared vertical datum is refused.
            wkt = source.crs.to_wkt() if source.crs else ''
            if 'UTM zone 33N' not in wkt:
                raise ValueError('Brandenburg terrain not in UTM zone 33N: '+Path(source.name).name)
            if 'VERT_CS' in wkt and 'DHHN2016' not in wkt:
                raise ValueError('Brandenburg terrain declares an unexpected height system')
        horizontal = CRS.from_epsg(25833)
        nodata = sources[0].nodata if sources[0].nodata is not None else -9999.0
        # Tiles differ only in whether they tag the vertical datum; mosaic on the
        # common horizontal reference instead of letting merge reject the mix.
        memories = []
        for source in sources:
            memory = rasterio.MemoryFile()
            profile = dict(source.profile, crs=horizontal, driver='GTiff')
            with memory.open(**profile) as copy:
                copy.write(source.read())
            memories.append(memory)
        opened = [memory.open() for memory in memories]
        try:
            data, affine = merge(opened, nodata=nodata)
        finally:
            for dataset in opened:
                dataset.close()
            for memory in memories:
                memory.close()
    finally:
        for source in sources:
            source.close()
    target = CRS.from_epsg(25832)
    height, width = data.shape[1:]
    left, top = affine.c, affine.f
    right, bottom = left+width*affine.a, top+height*affine.e
    transform, out_width, out_height = calculate_default_transform(horizontal, target, width, height, left, bottom, right, top,
                                                                   resolution=resolution)
    result = np.full((out_height, out_width), nodata, dtype='float32')
    reproject(data[0], result, src_transform=affine, src_crs=horizontal, src_nodata=nodata,
              dst_transform=transform, dst_crs=target, dst_nodata=nodata, resampling=Resampling.bilinear)
    profile = dict(driver='GTiff', width=out_width, height=out_height, count=1, dtype='float32', crs=target,
                   transform=transform, nodata=nodata, compress='deflate', tiled=True)
    with rasterio.open(destination, 'w', **profile) as output:
        output.write(result, 1)


def bb_wcs_terrain(raw, destination):
    """Tag the WCS response (requested in EPSG:25833, returned without CRS) with its reference."""
    import rasterio
    from rasterio.crs import CRS
    with rasterio.open(raw) as source:
        if source.crs is not None and 'UTM zone 33N' not in source.crs.to_wkt():
            raise ValueError('Unexpected WCS terrain reference')
        if abs(source.transform.a-5) > 1e-6 or abs(source.transform.e+5) > 1e-6:
            raise ValueError('Unexpected WCS terrain resolution')
        data = source.read()
        if data.size == 0 or (data[0] == -9999).all():
            raise ValueError('WCS terrain empty')
        profile = dict(source.profile, driver='GTiff', crs=CRS.from_epsg(25833), nodata=-9999.0)
    with rasterio.open(destination, 'w', **profile) as output:
        output.write(data)


def bb_intake(raw, kind, destination):
    """Extract the single data member of a Brandenburg zip; buildings are converted here."""
    if kind == 'dgm' and not zipfile.is_zipfile(raw):
        return bb_wcs_terrain(raw, destination)
    with zipfile.ZipFile(raw) as archive:
        wanted = '.tif' if kind == 'dgm' else '_geb.gml'
        members = [n for n in archive.namelist() if n.endswith(wanted)]
        if len(members) != 1:
            raise ValueError('Expected exactly one %s member in %s' % (wanted, raw.name))
        data = archive.read(members[0])
    if kind == 'dgm':
        destination.write_bytes(data)  # native UTM33; mosaicked and reprojected once later
    else:
        destination.write_text(convert_gml(data.decode('utf-8')), encoding='utf-8')


# Sachsen-Anhalt: the open-data map downloader lists 2 km tiles (label = 32 + east km + north km)
# with an item id; 'prepare' returns a one-off archive link holding the GeoTIFF or CityGML.
ST_PAGES = {'dgm': 'https://www.lvermgeo.sachsen-anhalt.de/de/gdp-dgm5.html',
            'lod': 'https://www.lvermgeo.sachsen-anhalt.de/de/gdp-download-lod2.html'}
ST_PREPARE = re.compile(r"https://www\.lvermgeo\.sachsen-anhalt\.de/de/mod/[0-9,]+/ajax/1/prepare/\?")


def st_index(page, fetch=_get):
    """(east km, north km) -> item id, plus the prepare endpoint, read from the download page."""
    import json
    html = fetch(page).text
    found = re.search(r"MapDownloadSelector\(\s*'mapdownloader_content',\s*'(\{.*?\})',\s*'EPSG:4647'", html, re.S)
    prepare = ST_PREPARE.search(html)
    if not found or not prepare:
        raise ValueError('Sachsen-Anhalt tile index not readable: '+page)
    tiles = {}
    for feature in json.loads(found.group(1))['features']:
        label = feature['properties']['label']
        if not re.fullmatch(r'32\d{7}', label):
            raise ValueError('Unexpected Sachsen-Anhalt tile label '+label)
        tiles[(int(label[2:5]), int(label[5:9]))] = feature['properties']['id']
    return tiles, prepare.group(0)


def st_tiles(terrain, buildings, fetch=_get):
    jobs = []
    for kind, area in (('dgm', terrain), ('lod', buildings)):
        tiles, prepare = st_index(ST_PAGES[kind], fetch)
        for e, n in grid_cells(area, size=2000):
            # Cells outside the state have no tile; the preparer trims, never fills.
            item = tiles.get((e*2, n*2))
            if item:
                jobs.append((kind, prepare+'items='+item+'&format=zip'))
    return jobs


def st_member(data, kind):
    """The single GeoTIFF or CityGML inside a Sachsen-Anhalt archive."""
    archive = zipfile.ZipFile(io.BytesIO(data))
    suffix = '.tif' if kind == 'dgm' else '.gml'
    names = [n for n in archive.namelist() if n.lower().endswith(suffix)]
    if len(names) != 1:
        raise ValueError('Expected one '+suffix+' in Sachsen-Anhalt archive, got '+str(names))
    member = archive.read(names[0])
    if kind == 'lod' and b'ETRS89_UTM32*DE_DHHN2016_NH' not in member[:4000]:
        raise ValueError('Sachsen-Anhalt LoD2 not in ETRS89/UTM32 + DHHN2016')
    return names[0], member


def tile_jobs(adapter, terrain, buildings, stac=None):
    if adapter['key'] == 'sachsen-anhalt':
        return st_tiles(terrain, buildings)
    if adapter['key'] == 'nordrhein-westfalen':
        return nrw_tiles(terrain, buildings)
    if adapter['key'] == 'brandenburg':
        return bb_tiles(terrain, buildings)
    return stac(terrain, buildings)


def osm_page(adapter, osm_file):
    # Regional sub-extracts (e.g. Regierungsbezirke) keep their real page.
    stem = re.sub(r'-\d{6}\.osm\.pbf$', '', Path(osm_file).name)
    if adapter['key'] == 'nordrhein-westfalen' and stem.endswith('-regbez'):
        return 'https://download.geofabrik.de/europe/germany/nordrhein-westfalen/'+stem+'.html'
    return adapter['osmPage']
