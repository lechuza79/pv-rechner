"""Trim uncovered outer raster margins without changing any measured height."""
import numpy as np
from affine import Affine


def trim_uncovered_margin(data, affine, nodata, protected_bounds):
    invalid=~np.isfinite(data)
    if nodata is not None:invalid|=data==nodata
    if not invalid.any():return data,affine,None
    height,width=data.shape
    rows,cols=np.where(invalid)
    candidates=[(int(rows.max())+1,height,0,width),(0,int(rows.min()),0,width),
                (0,height,int(cols.max())+1,width),(0,height,0,int(cols.min()))]
    safe=[]
    west,south,east,north=protected_bounds
    for top,bottom,left,right in candidates:
        if top>=bottom or left>=right or invalid[top:bottom,left:right].any():continue
        # Preserve one sample beyond every required surface for interpolation.
        x0,y0=affine*(left+.5,top+.5);x1,y1=affine*(right-.5,bottom-.5)
        if x0>west or x1<east or y0<north or y1>south:continue
        safe.append(((bottom-top)*(right-left),top,bottom,left,right))
    if not safe:raise ValueError('Terrain has gaps that cannot be trimmed outside required surfaces')
    _,top,bottom,left,right=max(safe)
    result=data[top:bottom,left:right]
    report=dict(method='Trim only uncovered outer margin; all retained height samples unchanged',
                missingSamples=int(invalid.sum()),originalShape=[height,width],retainedShape=list(result.shape),
                trimmedRows=[top,height-bottom],trimmedColumns=[left,width-right])
    return result,affine*Affine.translation(left,top),report


def mask_uncovered_outer_surface(data, affine, nodata, protected_geometry):
    """Missing source values outside all protected geometry remain explicit NaN."""
    from shapely import intersects_xy, prepare
    invalid=~np.isfinite(data)
    if nodata is not None:invalid|=data==nodata
    rows,cols=np.where(invalid)
    prepare(protected_geometry)
    xs=affine.c+(cols+.5)*affine.a
    ys=affine.f+(rows+.5)*affine.e
    if np.any(intersects_xy(protected_geometry,xs,ys)):
        raise ValueError('Terrain has gaps inside district or protected flight/object surface')
    result=data.copy();result[invalid]=np.nan
    return result,dict(method='Explicit missing outer source coverage; no replacement heights',
                       missingSamples=int(invalid.sum()),measuredSamples=int((~invalid).sum()))


def assert_measured_points(data, affine, points):
    """Every object point requires all four real interpolation samples."""
    inverse=~affine;height,width=data.shape
    for x,y in points:
        col,row=inverse*(x,y);col-=.5;row-=.5
        if not (0<=col<=width-1 and 0<=row<=height-1):raise ValueError('Object outside measured terrain')
        left=min(width-2,int(np.floor(col)));top=min(height-2,int(np.floor(row)))
        if not np.isfinite(data[top:top+2,left:left+2]).all():raise ValueError('Object intersects missing terrain')


def normalise_bw_crs(path, source_url):
    """Authoritative WCS CRS metadata only; VRT reads untouched original pixels."""
    import hashlib
    from urllib.parse import urlparse, parse_qs
    import rasterio
    from rasterio.shutil import copy as raster_copy
    from pyproj import CRS
    parsed=urlparse(source_url);query=parse_qs(parsed.query)
    if parsed.hostname!='owsproxy.lgl-bw.de' or not parsed.path.endswith('/WCS_INSP_BW_Hoehe_Coverage_DGM1') or query.get('COVERAGEID')!=['EL.ElevationGridCoverage']:
        raise ValueError('Trusted BW WCS source required for CRS metadata correction')
    with rasterio.open(path) as source:
        original=source.crs.to_wkt()
        if source.crs==rasterio.crs.CRS.from_epsg(25832):return path,None
        # The service advertises EPSG:25832 but writes an unnamed datum. Require
        # the exact same UTM projection, ellipsoid, units and grid orientation.
        crs=CRS(source.crs);expected=CRS.from_epsg(25832)
        if crs.utm_zone!='32N' or crs.ellipsoid.semi_major_metre!=expected.ellipsoid.semi_major_metre or abs(crs.ellipsoid.inverse_flattening-expected.ellipsoid.inverse_flattening)>1e-9 or crs.coordinate_operation.to_json_dict().get('parameters')!=expected.coordinate_operation.to_json_dict().get('parameters'):
            raise ValueError('BW source does not match its advertised UTM32 reference')
        if source.transform.b!=0 or source.transform.d!=0 or source.transform.a<=0 or source.transform.e>=0:
            raise ValueError('Unexpected BW grid orientation')
    vrt=path.with_suffix('.vrt');temporary=path.with_suffix('.next.vrt')
    raster_copy(path,temporary,driver='VRT')
    with rasterio.open(temporary,'r+') as dataset:dataset.crs='EPSG:25832'
    temporary.replace(vrt)
    sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
    return vrt,dict(sourceFile=path.name,sourceUrl=source_url,originalSha256=sha(path),originalCRS=original,
                    normalisedFile=vrt.name,normalisedSha256=sha(vrt),normalisedCRS='EPSG:25832',
                    method='VRT metadata correction only; original pixel array and affine transform unchanged',
                    referenceEvidence='https://owsproxy.lgl-bw.de/owsproxy/wcs/WCS_INSP_BW_Hoehe_Coverage_DGM1?SERVICE=WCS&REQUEST=DescribeCoverage&VERSION=2.0.1&COVERAGEID=EL.ElevationGridCoverage')


def clip_context_to_measured_surface(scene, metric_boundary):
    """Clip optional water vectors; no unknown ground height enters their geometry."""
    from shapely.geometry import box, LineString, Polygon
    from shapely.ops import transform
    terrain=scene['terrain'];left,top,right,bottom=terrain['groundBounds']
    width,height=terrain['width'],terrain['height'];east,north,_=scene['origin']
    dx=(right-left)/(width-1);dz=(bottom-top)/(height-1)
    affine=Affine(dx,0,east+left-dx/2,0,-dz,north-top+dz/2)
    data=np.asarray(terrain['elevations'],dtype=float).reshape(height,width)
    local=transform(lambda x,y:(x-east,north-y),metric_boundary)
    domain=local.intersection(box(left+dx,top+dz,right-dx,bottom-dz))
    original=scene.get('context',{});result={**original,'streams':[],'areas':[]};omitted=0
    def parts(geometry,kind):
        if geometry.is_empty:return []
        if geometry.geom_type==kind:return [geometry]
        return [part for child in getattr(geometry,'geoms',[]) for part in parts(child,kind)]
    def measured(points):
        try:assert_measured_points(data,affine,[(east+x,north-z) for x,z in points]);return True
        except ValueError:return False
    for stream in original.get('streams',[]):
        for part in parts(LineString(stream).intersection(domain),'LineString'):
            points=list(map(list,part.coords))
            if measured(points):result['streams'].append(points)
            else:omitted+=1
    for area in original.get('areas',[]):
        polygon=Polygon(area['rings'][0],area['rings'][1:])
        for part in parts(polygon.intersection(domain),'Polygon'):
            rings=[list(map(list,part.exterior.coords))]+[list(map(list,ring.coords)) for ring in part.interiors]
            if measured([point for ring in rings for point in ring]):result['areas'].append(dict(area,rings=rings))
            else:omitted+=1
    return result,dict(rule='Water context clipped to district within measured raster bounds; uncovered components explicitly omitted, no replacement heights',
                       sourceStreamCount=len(original.get('streams',[])),retainedStreamCount=len(result['streams']),
                       sourceAreaCount=len(original.get('areas',[])),retainedAreaCount=len(result['areas']),omittedUnmeasuredComponents=omitted)
