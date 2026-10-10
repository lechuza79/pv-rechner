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
    '02': dict(key='hamburg', prefix='hh', native=25832, grid=True,
               buildingLicense='Freie und Hansestadt Hamburg, Landesbetrieb Geoinformation und Vermessung (LGV), dl-de/by-2-0 [Daten bearbeitet]',
               terrainLicense='Freie und Hansestadt Hamburg, Landesbetrieb Geoinformation und Vermessung (LGV), dl-de/by-2-0 [Daten bearbeitet]',
               osmPage='https://download.geofabrik.de/europe/germany/hamburg.html'),
    '04': dict(key='bremen', prefix='hb', native=25832, grid=True,
               buildingLicense='Landesamt GeoInformation Bremen, CC BY 4.0 [Daten bearbeitet]',
               terrainLicense='Landesamt GeoInformation Bremen, CC BY 4.0 [Daten bearbeitet]',
               osmPage='https://download.geofabrik.de/europe/germany/bremen.html'),
    '10': dict(key='saarland', prefix='sl', native=25832, grid=True,
               buildingLicense='© GeoBasis DE/LVGL-SL (2026), dl-de/by-2-0 [Daten bearbeitet]',
               terrainLicense='© GeoBasis DE/LVGL-SL (2025), dl-de/by-2-0 [Daten bearbeitet]',
               osmPage='https://download.geofabrik.de/europe/germany/saarland.html'),
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
    '09': dict(key='bayern', prefix='by', native=25832, grid=True,
               buildingLicense='Bayerische Vermessungsverwaltung – www.geodaten.bayern.de, CC BY 4.0 [Daten bearbeitet]',
               terrainLicense='Bayerische Vermessungsverwaltung – www.geodaten.bayern.de, CC BY 4.0 [Daten bearbeitet]',
               osmPage='https://download.geofabrik.de/europe/germany/bayern.html'),
    '14': dict(key='sachsen', prefix='sn', native=25833, grid=True,
               buildingLicense='Quelle: GeoSN, dl-de/by-2-0 [Daten bearbeitet]',
               terrainLicense='Quelle: GeoSN, dl-de/by-2-0 [Daten bearbeitet]',
               osmPage='https://download.geofabrik.de/europe/germany/sachsen.html'),
    '16': dict(key='thueringen', prefix='th', native=25832, grid=True,
               buildingLicense='© GDI-Th, CC BY 4.0 [Daten bearbeitet]',
               terrainLicense='© GDI-Th, dl-de/by-2-0 [Daten bearbeitet]',
               osmPage='https://download.geofabrik.de/europe/germany/thueringen.html'),
    '01': dict(key='schleswig-holstein', prefix='sh', native=25832, grid=True,
               buildingLicense='©GeoBasis-DE/LVermGeo SH/CC BY 4.0 (Quelle verändert)',
               terrainLicense='©GeoBasis-DE/LVermGeo SH/CC BY 4.0 (Quelle verändert)',
               osmPage='https://download.geofabrik.de/europe/germany/schleswig-holstein.html'),
    '06': dict(key='hessen', prefix='he', native=25832, grid=True,
               buildingLicense='HVBG Hessen, Datenlizenz Deutschland – Zero (§ 18 HVGG) [Daten bearbeitet]',
               terrainLicense='HVBG Hessen, dl-de/zero-2-0 [Daten bearbeitet]',
               osmPage='https://download.geofabrik.de/europe/germany/hessen.html'),
    '07': dict(key='rheinland-pfalz', prefix='rp', native=25832, grid=True,
               buildingLicense='©GeoBasis-DE / LVermGeoRP2026, dl-de/by-2-0, www.lvermgeo.rlp.de [Daten bearbeitet]',
               terrainLicense='©GeoBasis-DE / LVermGeoRP2026, dl-de/by-2-0, www.lvermgeo.rlp.de [Daten bearbeitet]',
               osmPage='https://download.geofabrik.de/europe/germany/rheinland-pfalz.html'),
    '08': dict(key='baden-wuerttemberg', prefix='bw', native=25832, grid=True,
               buildingLicense='Datenquelle: LGL, www.lgl-bw.de, dl-de/by-2-0 [Daten bearbeitet]',
               terrainLicense='Datenquelle: LGL, www.lgl-bw.de, dl-de/by-2-0 [Daten bearbeitet]',
               osmPage='https://download.geofabrik.de/europe/germany/baden-wuerttemberg.html'),
    '13': dict(key='mecklenburg-vorpommern', prefix='mv', native=25833, grid=True,
               buildingLicense='© GeoBasis-DE/M-V 2026, CC BY 4.0 [Daten bearbeitet]',
               terrainLicense='© GeoBasis-DE/M-V 2026, CC BY 4.0 [Daten bearbeitet]',
               osmPage='https://download.geofabrik.de/europe/germany/mecklenburg-vorpommern.html'),
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


def wcs_terrain_url(base, coverage, terrain, native=25833, resolution=5, x='x', y='y', fmt='image/tiff'):
    """One WCS 2.0.1 GetCoverage over the terrain box, served resampled to `resolution` metres."""
    from shapely.ops import transform
    box_native = transform(Transformer.from_crs(25832, native, always_xy=True).transform, terrain).bounds
    step = 100
    minx, miny = math.floor(box_native[0]/step)*step-step, math.floor(box_native[1]/step)*step-step
    maxx, maxy = math.ceil(box_native[2]/step)*step+step, math.ceil(box_native[3]/step)*step+step
    return (base+'?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=%s&FORMAT=%s'
            '&SUBSET=%s(%d,%d)&SUBSET=%s(%d,%d)&SCALEFACTOR=%s' % (coverage, fmt, x, minx, maxx, y, miny, maxy, 1/resolution))


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
    return text.replace('ETRS89_UTM33', 'ETRS89_UTM32').replace('EPSG:6.12:25833', 'EPSG:6.12:25832')


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


# Terrain of a NEIGHBOURING state fills the part of a border scene's terrain box that
# the place's own state does not publish. Buildings are not filled: the town window
# lies inside the municipality, and the border scene masks nothing it claims to show.
SN_DGM = 'https://geocloud.landesvermessung.sachsen.de/public.php/dav/files/JCcXyifaNdLDnxZ/'
TH_DGM = 'https://geoportal.geoportal-th.de/hoehendaten/DGM/'
NEIGHBOUR_TERRAIN = {
    '14': dict(key='sachsen', native=25833, size=2000, credit='© GeoBasis-DE / GeoSN, dl-de/by-2-0'),
    '16': dict(key='thueringen', native=25832, size=1000, credit='© GDI-Th, dl-de/by-2-0'),
}


def neighbour_terrain_urls(code, area):
    """Candidate tile URLs (newest epoch first per cell) for the part of area (UTM32) in that state."""
    spec = NEIGHBOUR_TERRAIN[code]
    cells = grid_cells(area, 25832, spec['native'], spec['size'])
    if code == '14':
        return [[SN_DGM+'dgm1_33%03d_%d_2_sn_tiff.zip' % (e*2, n*2)] for e, n in cells]
    return [[TH_DGM+'dgm_2020-2025/dgm1_32_%d_%d_1_th_2020-2025.zip' % (e, n),
             TH_DGM+'dgm_2014-2019/dgm1_%d_%d_1_th_2014-2019.zip' % (e, n)] for e, n in cells]


def neighbour_member(data):
    """The single GeoTIFF of a neighbour terrain archive."""
    archive = zipfile.ZipFile(io.BytesIO(data))
    names = [n for n in archive.namelist() if n.lower().endswith('.tif')]
    if len(names) != 1:
        raise ValueError('Expected one GeoTIFF in neighbour terrain archive, got '+str(names))
    return names[0], archive.read(names[0])


# Grid states: tiles have a predictable name per (east km, north km) cell; a cell
# the state does not publish answers 404 and is skipped. Alternatives (older
# acquisition epochs) are separated by ' || ' and tried in order.
SN_LOD = 'https://geocloud.landesvermessung.sachsen.de/public.php/dav/files/AyJqXpJAZJXomCb/'
SL_SHARE = 'https://www.shop.lvgl.saarland.de/cloud/public.php/dav/files/NK8ndP55qAqGEZD/'
GRID = {
    'bayern': dict(dgm=(1000, lambda e, n: ['https://download1.bayernwolke.de/a/dgm/dgm1/%d_%d.tif' % (e, n)]),
                   lod=(2000, lambda e, n: ['https://download1.bayernwolke.de/a/lod2/citygml/%d_%d.gml' % (e, n)])),
    'sachsen': dict(dgm=(2000, lambda e, n: [SN_DGM+'dgm1_33%03d_%d_2_sn_tiff.zip' % (e, n)]),
                    lod=(2000, lambda e, n: [SN_LOD+'lod2_33%03d_%d_2_sn_citygml.zip' % (e, n)])),
    'thueringen': dict(dgm=(1000, lambda e, n: [TH_DGM+'dgm_2020-2025/dgm1_32_%d_%d_1_th_2020-2025.zip' % (e, n),
                                                 TH_DGM+'dgm_2014-2019/dgm1_%d_%d_1_th_2014-2019.zip' % (e, n)]),
                       lod=(2000, lambda e, n: ['https://geoportal.geoportal-th.de/3dgebaeude/LoD2/LoD2_32_%d_%d_2_TH.zip' % (e, n)])),
    # Archive states publish whole-state/district ZIPs; single 1-2 km members are read by
    # HTTP range (see RangeFile). Member names are matched per cell in the archive listing.
    'hamburg': dict(archives=dict(
        dgm=(['https://www.daten-hamburg.de/opendata/fernerkundung_hoehenmodelle/dgm/dgm1_hh_2022-04-30.zip'], 1000, r'(?i)dgm1_32_%d_%d_1_hh_\d{4}\.tif$'),
        lod=(['https://www.daten-hamburg.de/opendata/3d_stadtmodell_lod2/LoD2-DE_HH_2023-04-01.zip'], 1000, r'LoD2_32_%d_%d_1_HH\.xml$'))),
    'bremen': dict(archives=dict(
        dgm=(['https://gdi2.geo.bremen.de/inspire/download/DGM/data/Gitternetz_DGM1_2017_HB_ASCII_XYZ.zip',
              'https://gdi2.geo.bremen.de/inspire/download/DGM/data/Gitternetz_DGM1_2015_BHV_ASCII_XYZ.zip'], 1000, r'dgm1_32_?%d_+%d_1_hb\.xyz$'),
        lod=(['https://gdi2.geo.bremen.de/inspire/download/LoD/data/LOD2_CITYGML_HB.zip',
              'https://gdi2.geo.bremen.de/inspire/download/LoD/data/LOD2_CITYGML_BHV.zip'], 2000, r'LoD2_32_%d_%d_2_HB\.gml$'))),
    'saarland': dict(archives=dict(
        dgm=('webdav:'+SL_SHARE+'OD_DGM1_2025_tif_LK/', 1000, r'dgm1_32_%d_%d_1_SL_\d{4}\.tif$'),
        lod=('webdav:'+SL_SHARE+'OD_Geb%c3%a4udemodelle_LoD2_gml_LK/', 1000, r'LoD2_32_%d_%d_1_SL\.gml$'))),
    # Hessen: terrain from the HVBG WCS (axes e/n); buildings as one archive per municipality,
    # found by name in the download centre (no AGS there, folder names differ per product).
    'hessen': dict(wcs=('https://inspire-hessen.de/raster/dgm1/ows', 'he_dgm1', 'e', 'n', 'GTIFF'), lod='he-name'),
    # SH: per-tile links (year and block vary) come from one GeoJSON index per product.
    'schleswig-holstein': dict(dgm=(1000, 'sh-index:DGM1_SH__Massendownload.geojson:link_data'),
                               lod=(1000, 'sh-index:LOD2_SH_Massendownload.geojson:data_link')),
    # RLP: the terrain year differs per tile, so names come from the directory listing.
    'rheinland-pfalz': dict(dgm=(1000, 'rp-index'),
                            lod=(2000, lambda e, n: ['https://geobasis-rlp.de/data/geb3dlo/current/gml/LoD2_32_%d_%d_2_RP.gml' % (e, n)])),
    # BW: 2 km cells with an ODD east and EVEN north km; terrain is zipped XYZ (four 1 km files).
    'baden-wuerttemberg': dict(dgm=(2000, lambda e, n: ['https://opengeodata.lgl-bw.de/data/dgm/dgm1_32_%d_%d_2_bw.zip' % (e, n)]),
                               lod=(2000, lambda e, n: ['https://opengeodata.lgl-bw.de/data/lod2/LoD2_32_%d_%d_2_bw.zip' % (e, n)]),
                               offset=(1000, 0)),
    # M-V: buildings as 2 km tiles via the ATOM download, terrain as one WCS request (UTM33).
    'mecklenburg-vorpommern': dict(
        wcs=('https://www.geodaten-mv.de/dienste/dgm_wcs', 'mv_dgm'),
        lod=(2000, lambda e, n: ['https://www.geodaten-mv.de/dienste/gebaeude_download?index=0&dataset=8397b554-5cb9-4274-8be8-c20490d9a6e8&file=lod2_33_%03d_%d_2_gml.zip' % (e, n)])),
}


def grid_tiles(adapter, terrain, buildings, fetch=_get):
    spec = GRID[adapter['key']]
    jobs = []
    if 'wcs' in spec:
        base, coverage, *axes = spec['wcs']
        x, y, fmt = (axes+['x', 'y', 'image/tiff'][len(axes):]) if axes else ('x', 'y', 'image/tiff')
        jobs.append(('dgm', wcs_terrain_url(base, coverage, terrain, adapter['native'], x=x, y=y, fmt=fmt)))
    if 'archives' in spec:
        for kind, area in (('dgm', terrain), ('lod', buildings)):
            sources, size, pattern = spec['archives'][kind]
            members = archive_members(sources)
            for e, n in grid_cells(area, 25832, 25832, size):
                wanted = re.compile(pattern % (e*size//1000, n*size//1000))
                seen = set()
                for archive, name in members:
                    # A border tile can sit in two district archives (Saarland); take it once.
                    if wanted.search(name) and name.rsplit('/', 1)[-1] not in seen:
                        seen.add(name.rsplit('/', 1)[-1]);jobs.append((kind, 'zipmember:'+archive+'!'+name))
        return jobs
    if spec.get('lod') == 'he-name':
        jobs.append(('lod', he_lod_url(adapter['placeName'])))
    for kind, area in (('dgm', terrain), ('lod', buildings)):
        if kind not in spec or isinstance(spec[kind], str) and spec[kind] == 'he-name':continue
        size, names = spec[kind]
        if isinstance(names, str) and names.startswith('sh-index:'):
            _, file, field = names.split(':')
            index = sh_index(file, field, fetch)
            for e, n in grid_cells(area, 25832, 25832, size):
                if (e, n) in index:jobs.append((kind, index[(e, n)]))
            continue
        if names == 'rp-index':
            index = rp_dgm_index(fetch)
            for e, n in grid_cells(area, 25832, 25832, size):
                if (e, n) in index:jobs.append((kind, RP_DGM+index[(e, n)]))
            continue
        dx, dy = spec.get('offset', (0, 0))
        from shapely.affinity import translate
        for e, n in grid_cells(translate(area, -dx, -dy), 25832, adapter['native'], size):
            jobs.append((kind, ' || '.join(names((e*size+dx)//1000, (n*size+dy)//1000))))
    return jobs


RP_DGM = 'https://geobasis-rlp.de/data/dgm1/current/tif/'
HE_API = 'https://gds.hessen.de/INTERSHOP/rest/WFS/HLBG-Geodaten-Site/-/downloadcenter'
HE_LOD = '3D-Daten/3D-Gebäudemodelle/3D-Gebäudemodelle LoD2'


def he_key(name):
    name = re.sub(r'-LoD2(\.zip)?$', '', name).replace('_', ' ').lower()
    for a, b in (('ä', 'ae'), ('ö', 'oe'), ('ü', 'ue'), ('ß', 'ss')):name = name.replace(a, b)
    return re.sub(r'[^a-z0-9]', '', name)


def he_lod_url(place, fetch=_get):
    """The municipality's LoD2 archive from the HVBG download centre, matched by name;
    the URI carries a date segment, so it is always read fresh, never stored."""
    from urllib.parse import quote, urljoin
    def listing(path, page=1):
        return fetch(HE_API+'?path='+quote(path, safe='')+('&page=%d' % page if page > 1 else '')).json()
    found = []
    for district in listing(HE_LOD).get('navigation', []):
        path, page = HE_LOD+'/'+district['name'], 1
        while True:
            result = listing(path, page).get('searchresult', {})
            for entry in result.get('downloads', []):
                if he_key(entry['name']) == he_key(place):
                    found.append(urljoin('https://gds.hessen.de', quote(entry['downloadLink']['uri'])))
            paging = result.get('paging', {})
            if page*paging.get('pageSize', 20) >= paging.get('total', 0):break
            page += 1
    if len(found) != 1:
        raise ValueError('Hessen LoD2 archive not uniquely found for %s: %d matches' % (place, len(found)))
    return found[0]


SH_HOST = 'https://geodaten.schleswig-holstein.de/'
SH_INDEX = SH_HOST+'gaialight-sh/_apps/dladownload/single.php?file=%s&id=4'


def tls_verify(url):
    """SH serves no intermediate certificate; verify against the public CA store plus that
    intermediate (shipped in scripts/certs), never by disabling verification."""
    if not url.startswith(SH_HOST):
        return True
    import certifi
    bundle = Path('/tmp')/'landscape-sh-ca-bundle.pem'
    if not bundle.exists():
        intermediate = (Path(__file__).resolve().parent/'certs/d-trust-br-ca-1-20-1-2020.pem').read_text()
        bundle.write_text(Path(certifi.where()).read_text()+'\n'+intermediate)
    return str(bundle)


def sh_index(file, field, fetch=None):
    """(east km, north km) -> download link from the SH mass-download GeoJSON."""
    import json
    response = requests.get(SH_INDEX % file, headers=UA, timeout=(20, 180), verify=tls_verify(SH_HOST))
    response.raise_for_status()
    found = {}
    for feature in json.loads(response.content)['features']:
        link = feature['properties'].get(field)
        ring = feature['geometry']['coordinates'][0]
        while isinstance(ring[0][0], list):ring = ring[0]
        e, n = min(p[0] for p in ring), min(p[1] for p in ring)
        if link:found[(int(round(e))//1000, int(round(n))//1000)] = link
    if not found:raise ValueError('Schleswig-Holstein index empty: '+file)
    return found


def rp_dgm_index(fetch=_get):
    """(east km, north km) -> file name; exactly one acquisition year per cell."""
    found = {}
    for e, n, year in re.findall(r'dgm1_32_(\d+)_(\d+)_1_rp_(\d{4})\.tif"', fetch(RP_DGM).text):
        found[(int(e), int(n))] = 'dgm1_32_%s_%s_1_rp_%s.tif' % (e, n, year)
    if not found:raise ValueError('Rheinland-Pfalz terrain index empty')
    return found


def xyz_archive_to_tif(data):
    """ASCII XYZ (zipped or plain; UTM32 + DHHN2016, cell centres) to one GeoTIFF, heights unchanged."""
    import numpy as np
    import rasterio
    from rasterio.transform import from_origin
    if zipfile.is_zipfile(io.BytesIO(data)):
        archive = zipfile.ZipFile(io.BytesIO(data))
        names = [n for n in archive.namelist() if n.lower().endswith('.xyz')]
        texts = [(n, archive.read(n)) for n in names]
    else:
        texts = [('plain', data)]
    if not texts:raise ValueError('No XYZ terrain in archive')
    parts = []
    for name, raw in texts:
        text = raw.decode('ascii', 'replace')
        text = text[:text.find('<')] if '<' in text else text  # SH appends an HTML page
        lines = text.strip().splitlines()
        if lines and not lines[0].strip()[:1].lstrip('-').isdigit():lines = lines[1:]  # 'x y z' header (Bremen)
        values = np.array(' '.join(lines).replace(',', ' ').split(), dtype='float64')
        if values.size % 3:raise ValueError('XYZ file is not three columns: '+name)
        values = values.reshape(-1, 3)
        if values[:, 0].min() > 1e7:values[:, 0] -= 32000000  # zone-prefixed easting (Bremen)
        parts.append(values)
    points = np.vstack(parts)
    xs, ys = np.unique(points[:, 0]), np.unique(points[:, 1])
    step = float(np.min(np.diff(xs)))
    if step <= 0 or abs(float(np.min(np.diff(ys))) - step) > 1e-6:raise ValueError('XYZ grid not square')
    width, height = int(round((xs.max()-xs.min())/step))+1, int(round((ys.max()-ys.min())/step))+1
    grid = np.full((height, width), -9999.0, dtype='float32')
    cols = np.rint((points[:, 0]-xs.min())/step).astype(int)
    rows = np.rint((ys.max()-points[:, 1])/step).astype(int)
    grid[rows, cols] = points[:, 2]
    memory = rasterio.MemoryFile()
    with memory.open(driver='GTiff', width=width, height=height, count=1, dtype='float32', nodata=-9999.0,
                     crs='EPSG:25832', transform=from_origin(xs.min()-step/2, ys.max()+step/2, step, step),
                     compress='deflate') as target:
        target.write(grid, 1)
    return memory.read()


class RangeFile(io.RawIOBase):
    """A remote file read by HTTP Range; enough for zipfile to read one member of a
    multi-GB archive without downloading it. `offset` addresses an archive stored
    uncompressed inside another one (Bremen)."""
    def __init__(self, url, offset=0, size=None):
        self.url, self.offset, self.position, self.block = url, offset, 0, (None, b'')
        if size is None:
            # Streamed and closed unread: some servers (Saarland's Nextcloud) answer the
            # one-byte probe with the whole archive body.
            import time
            for attempt in range(6):
                with requests.get(url, headers=dict(UA, Range='bytes=0-0'), timeout=(20, 120), stream=True) as probe:
                    status, headers = probe.status_code, dict(probe.headers)
                if status != 429:break
                time.sleep(15*(attempt+1))
            if status != 206 or 'Content-Range' not in headers:
                raise ValueError('Server does not serve ranges: %s (%d)' % (url, status))
            size = int(headers['Content-Range'].split('/')[-1])-offset
        self.size = size
    def seekable(self):return True
    def readable(self):return True
    def tell(self):return self.position
    def seek(self, position, whence=0):
        self.position = position if whence == 0 else self.position+position if whence == 1 else self.size+position
        return self.position
    def read(self, count=-1):
        if count is None or count < 0:count = self.size-self.position
        count = max(0, min(count, self.size-self.position))
        if not count:return b''
        start, cached = self.block
        if start is not None and start <= self.position and self.position+count <= start+len(cached):
            data = cached[self.position-start:self.position-start+count]
        else:
            fetch = max(count, 8 << 20)
            first = self.offset+self.position
            last = min(self.offset+self.size, first+fetch)-1
            import time
            for attempt in range(6):
                try:
                    response = requests.get(self.url, headers=dict(UA, Range='bytes=%d-%d' % (first, last)), timeout=(20, 300))
                except requests.RequestException:
                    if attempt == 5:raise
                    continue
                if response.status_code != 429:break
                time.sleep(15*(attempt+1))  # Hamburg rate-limits bursts of range requests
            if response.status_code != 206:raise ValueError('Range request refused: %d' % response.status_code)
            self.block = (self.position, response.content)
            data = response.content[:count]
        self.position += len(data)
        return data
    def readinto(self, buffer):
        data = self.read(len(buffer));buffer[:len(data)] = data;return len(data)


def open_archive(url):
    """zipfile over HTTP ranges; an archive holding a single stored ZIP is opened through it."""
    try:
        import zipfile_deflate64  # noqa: F401  (Hamburg LoD2 uses Deflate64)
    except ImportError:
        pass
    archive = zipfile.ZipFile(RangeFile(url))
    inner = [i for i in archive.infolist() if i.filename.lower().endswith('.zip')]
    if len(inner) == 1 and inner[0].compress_type == zipfile.ZIP_STORED and len(archive.infolist()) <= 3:
        info = inner[0]
        header = RangeFile(url, info.header_offset, 30).read(30)
        start = info.header_offset+30+int.from_bytes(header[26:28], 'little')+int.from_bytes(header[28:30], 'little')
        archive = zipfile.ZipFile(RangeFile(url, start, info.file_size))
    return archive


def webdav_files(folder):
    """File URLs in a public Nextcloud share folder (WebDAV PROPFIND, depth 1)."""
    from urllib.parse import urljoin
    response = requests.request('PROPFIND', folder, headers=dict(UA, Depth='1'), timeout=(20, 120))
    response.raise_for_status()
    hrefs = re.findall(r'<d:href>([^<]+)</d:href>', response.text)
    return [urljoin(folder, h) for h in hrefs if h.lower().endswith('.zip')]


ARCHIVE_CACHE = {}


def archive_members(sources):
    if isinstance(sources, str) and sources.startswith('webdav:'):
        sources = webdav_files(sources[len('webdav:'):])
    members = []
    for url in sources:
        if url not in ARCHIVE_CACHE:
            ARCHIVE_CACHE[url] = [i.filename for i in open_archive(url).infolist()]
        members += [(url, name) for name in ARCHIVE_CACHE[url]]
    return members


OPEN_ARCHIVES = {}


def read_archive_member(locator):
    """'zipmember:<archive url>!<member>' -> bytes; each archive's directory is read once."""
    import threading
    url, name = locator[len('zipmember:'):].rsplit('!', 1)
    if url not in OPEN_ARCHIVES:
        OPEN_ARCHIVES[url] = (open_archive(url), threading.Lock())
    archive, lock = OPEN_ARCHIVES[url]
    with lock:
        return archive.read(name)


def grid_member(data, kind):
    """A tile is the file itself or a zip holding exactly one GeoTIFF / CityGML;
    a terrain zip of XYZ files is converted, a building zip of several GML files is kept whole."""
    if not zipfile.is_zipfile(io.BytesIO(data)):
        if kind == 'dgm' and data[:4] not in (b'II*\x00', b'MM\x00*'):  # not a GeoTIFF: ASCII XYZ
            return 'xyz', xyz_archive_to_tif(data)
        if kind == 'lod' and b'</core:CityModel>' in data:
            # SH appends an HTML page after the model.
            return None, data[:data.rindex(b'</core:CityModel>')+len(b'</core:CityModel>')]
        return None, data
    archive = zipfile.ZipFile(io.BytesIO(data))
    if kind == 'dgm' and not any(n.lower().endswith('.tif') for n in archive.namelist()):
        return 'xyz', xyz_archive_to_tif(data)
    if kind == 'lod' and sum(n.lower().endswith('.gml') for n in archive.namelist()) > 1:
        return 'zip', data
    suffix = '.tif' if kind == 'dgm' else '.gml'
    names = [n for n in archive.namelist() if n.lower().endswith(suffix)]
    if len(names) != 1:
        raise ValueError('Expected one '+suffix+' in tile archive, got '+str(names))
    return names[0], archive.read(names[0])


def tile_jobs(adapter, terrain, buildings, stac=None):
    if adapter.get('grid'):
        return grid_tiles(adapter, terrain, buildings)
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
