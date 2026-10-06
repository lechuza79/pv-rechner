"""Build sourced wind destinations, preserving existing parks without local stock.

Some released districts carry their register evidence on the preparation host.
A new municipality must not silently remove those districts from the weather job.
"""
import json
import math
from pathlib import Path


def valid_position(value):
    return all(isinstance(value.get(k),(int,float)) and not isinstance(value[k],bool) and math.isfinite(value[k]) for k in ('latitude','longitude')) and -90 <= value['latitude'] <= 90 and -180 <= value['longitude'] <= 180


def generate(root):
    target=root/'public/geo/landscape-wind-stops.json'
    previous=json.loads(target.read_text()) if target.exists() else {}
    result={}
    for directory in sorted((root/'public/geo/landscape-tours').iterdir()):
        if not (directory/'scene.json').exists():continue
        scene=json.loads((directory/'scene.json').read_text())
        destinations=[stop for stop in scene.get('stops',[]) if stop['kind']=='wind']
        if not destinations:continue
        if not (directory/'register.json').exists():
            existing=previous.get(directory.name,{})
            expected={stop['id'] for stop in destinations}
            if set(existing)!=expected or any(not valid_position(stop) or not stop.get('name') for stop in existing.values()):
                raise ValueError('Register evidence or complete existing weather metadata required: '+directory.name)
            result[directory.name]=existing
            continue
        register=json.loads((directory/'register.json').read_text())
        rows={r['mastr_nr']:r for r in register.get('turbines',[])}
        if len(rows)!=len(register.get('turbines',[])):raise ValueError('Duplicate wind register identifiers')
        stops={}
        for stop in destinations:
            identifiers=stop.get('unitIds',[])
            if not identifiers or len(set(identifiers))!=len(identifiers) or any(i not in rows for i in identifiers):
                raise ValueError('Wind destination register links incomplete: '+directory.name+':'+stop['id'])
            units=[rows[i] for i in identifiers]
            names=sorted({r['windpark'] for r in units if r.get('windpark')})
            towns=sorted({r['coordinateMunicipalityName'] for r in units if r.get('coordinateMunicipalityName')})
            name=names[0] if len(names)==1 else ('Windanlagen bei '+' / '.join(towns) if towns else stop['name'])
            position=dict(name=name,latitude=round(sum(r['lat'] for r in units)/len(units),5),longitude=round(sum(r['lon'] for r in units)/len(units),5))
            if not valid_position(position):raise ValueError('Invalid wind destination coordinate')
            stops[stop['id']]=position
        result[directory.name]=stops
    # A partial checkout is not authorization to drop an existing location.
    for place,stops in previous.items():
        if place not in result:
            raise ValueError('Existing weather location would disappear: '+place)
    temporary=target.with_suffix('.next')
    temporary.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    temporary.replace(target)
    return result


if __name__=='__main__':
    result=generate(Path(__file__).resolve().parents[1])
    print('Prepared',sum(map(len,result.values())),'wind destinations')
