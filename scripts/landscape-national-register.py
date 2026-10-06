#!/usr/bin/env python3
"""Collect Germany's active wind/ground-solar technical register, without model calls.

Only allowlisted technical fields are persisted. Coordinates and dimensions may
be unknown; no dimensions or park outlines are inferred. The extended public
register excludes today's changes and does not publish an exact snapshot time.
Pagination checks are not a transactional snapshot guarantee.
"""
import argparse
import datetime as dt
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import time

import requests

BASE = 'https://www.marktstammdatenregister.de/MaStR/Einheit/EinheitJson/'
API = BASE + 'GetErweiterteOeffentlicheEinheitStromerzeugung'
FILTER_API = BASE + 'GetFilterColumnsErweiterteOeffentlicheEinheitStromerzeugung'
PAGE_SIZE = 1000
VERSION = 1
COMMON = {
    'capacityKw': 'Bruttoleistung', 'netCapacityKw': 'Nettonennleistung',
    'lon': 'Laengengrad', 'lat': 'Breitengrad',
    'municipalityCode': 'Gemeindeschluessel',
    'commissionedAt': 'InbetriebnahmeDatum', 'sourceUpdatedAt': 'DatumLetzteAktualisierung',
}
WIND = {'hubHeightM': 'NabenhoeheWindenergieanlage',
        'rotorDiameterM': 'RotordurchmesserWindenergieanlage',
        'manufacturer': 'HerstellerWindenergieanlageBezeichnung',
        'model': 'Typenbezeichnung', 'locationType': 'WindAnLandOderSeeBezeichnung'}
SOLAR = {'direction': 'HauptausrichtungSolarModuleBezeichnung',
         'tiltRange': 'HauptneigungswinkelSolarmoduleBezeichnung',
         'moduleCount': 'AnzahlSolarModule'}
NUMERIC = {'capacityKw', 'netCapacityKw', 'hubHeightM', 'rotorDiameterM', 'moduleCount', 'lon', 'lat'}


def utcnow():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def save(path, value):
    """Replace one JSON document only after its complete bytes reach disk."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    with temporary.open('w', encoding='utf-8') as stream:
        json.dump(value, stream, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)
    descriptor = os.open(str(path.parent), os.O_RDONLY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def get_json(session, url, params=None, sleep=time.sleep):
    for attempt in range(4):
        try:
            response = session.get(url, params=params, timeout=(20, 120))
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as error:
            status = getattr(getattr(error, 'response', None), 'status_code', None)
            if status is not None and status != 429 and status < 500:
                raise
            if attempt == 3:
                raise
            sleep(2 ** attempt * 2)


def resolve_filters(metadata, kind):
    if not isinstance(metadata, list):
        raise ValueError('Invalid filter metadata')

    def find(field, label):
        matches = [str(option['Value']) for item in metadata if item.get('FilterName') == field
                   for option in item.get('ListObject', []) if option.get('Name') == label]
        if len(matches) != 1 or not matches[0].isdigit():
            raise ValueError('Public filter metadata missing or ambiguous: ' + field + '/' + label)
        return int(matches[0])

    values = {'status': find('Betriebs-Status', 'In Betrieb'),
              'country': find('Land', 'Deutschland'),
              'energy': find('Energieträger', 'Wind' if kind == 'wind' else 'Solare Strahlungsenergie')}
    terms = [('Energieträger', values['energy']), ('Betriebs-Status', values['status']),
             ('Land', values['country'])]
    if kind == 'solar':
        values['solarType'] = find('Art der Solaranlage', 'Freiflächensolaranlage')
        terms.append(('Art der Solaranlage', values['solarType']))
    return '~and~'.join(f"{field}~eq~'{value}'" for field, value in terms), values


def technical(row, kind, values):
    checks = {'BetriebsStatusId': values['status'], 'LandId': values['country'],
              'EnergietraegerId': values['energy']}
    if kind == 'solar':
        checks['ArtDerSolaranlageId'] = values['solarType']
    if any(row.get(field) != value for field, value in checks.items()):
        raise ValueError('Register ignored active German technology filter')
    identifier = row.get('MaStRNummer')
    if not isinstance(identifier, str) or re.fullmatch(r'SEE\d{12}', identifier) is None:
        raise ValueError('Missing or invalid electricity-unit identifier')
    fields = dict(COMMON, **(WIND if kind == 'wind' else SOLAR))
    result = {'id': identifier, 'status': 'active', 'kind': kind}
    for local, remote in fields.items():
        value = row.get(remote)
        if value is not None:
            if local in NUMERIC:
                if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                    raise ValueError('Invalid technical numeric field: ' + local)
                if local not in ('lon', 'lat') and value <= 0:
                    value = None
                elif local == 'lon' and not -180 <= value <= 180 or local == 'lat' and not -90 <= value <= 90:
                    raise ValueError('Invalid geographic coordinate')
            elif not isinstance(value, str):
                raise ValueError('Invalid technical text field: ' + local)
        result[local] = value
    return result


def fingerprint(units):
    return hashlib.sha256(json.dumps(units, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def read_page(session, page, query, kind, values, expected=None):
    payload = get_json(session, API, {'page': page, 'pageSize': PAGE_SIZE, 'filter': query,
                                    'sort[0][field]': 'Id', 'sort[0][dir]': 'asc'})
    if not isinstance(payload, dict) or payload.get('Errors'):
        raise ValueError('Register returned an invalid response or errors')
    total = payload.get('Total')
    if isinstance(total, bool) or not isinstance(total, int) or total < 0:
        raise ValueError('Invalid register total')
    if expected is not None and total != expected:
        raise ValueError('Register total changed; explicit --restart required')
    rows = payload.get('Data')
    required = min(PAGE_SIZE, max(0, total - (page - 1) * PAGE_SIZE))
    if not isinstance(rows, list) or len(rows) != required:
        raise ValueError('Truncated or unexpected register page')
    return total, [technical(row, kind, values) for row in rows]


def validate_checkpoint(stock, kind, query, values, now):
    if stock.get('schemaVersion') != VERSION or stock.get('kind') != kind or stock.get('filter') != query or stock.get('filterValues') != values:
        raise ValueError('Checkpoint schema/filter changed; explicit --restart required')
    if stock.get('retrievalDateUtc') != now[:10]:
        raise ValueError('Checkpoint is from an older retrieval day; explicit --restart required')
    if stock.get('status') != 'collecting':
        raise ValueError('Checkpoint is failed or completed; explicit --restart required')
    units = stock.get('units')
    total, next_page = stock.get('total'), stock.get('nextPage')
    if not isinstance(total, int) or total < 0 or not isinstance(next_page, int) or next_page < 1 or not isinstance(units, list):
        raise ValueError('Invalid checkpoint pagination')
    if len(units) != min(total, (next_page - 1) * PAGE_SIZE) or len({u['id'] for u in units}) != len(units):
        raise ValueError('Incomplete or duplicated checkpoint')
    allowed = {'id', 'status', 'kind'} | set(COMMON) | set(WIND if kind == 'wind' else SOLAR)
    for unit in units:
        if set(unit) != allowed or unit.get('kind') != kind or unit.get('status') != 'active' or re.fullmatch(r'SEE\d{12}', unit['id']) is None:
            raise ValueError('Invalid checkpoint technical fields')
    if fingerprint(units[:PAGE_SIZE]) != stock.get('firstPageFingerprint'):
        raise ValueError('Invalid checkpoint first-page fingerprint')


def collect(root, kind, session, metadata, restart=False, clock=utcnow, sleep=time.sleep, report=lambda value: None):
    checkpoint = root / 'inputs/national-register' / (kind + '.checkpoint.json')
    output = root / 'inputs/national-register' / (kind + '.json')
    query, values = resolve_filters(metadata, kind)
    now = clock()
    stock = None
    try:
        if checkpoint.exists() and not restart:
            stock = json.loads(checkpoint.read_text())
            validate_checkpoint(stock, kind, query, values, now)
            total, first = read_page(session, 1, query, kind, values, stock['total'])
            if fingerprint(first) != stock['firstPageFingerprint']:
                raise ValueError('Register first page changed; explicit --restart required')
        else:
            stock = {'schemaVersion': VERSION, 'kind': kind, 'status': 'collecting',
                     'sourceUrl': API, 'filterMetadataUrl': FILTER_API,
                     'sourceSnapshotAt': None,
                     'scope': 'Active electricity units explicitly marked Germany; wind includes onshore and offshore. Units with foreign or unknown country are outside this filter. Unknown technical values remain null.',
                     'sourceFreshness': "Extended register excludes today's changes; exact source snapshot time is not exposed.",
                     'startedAt': now, 'retrievalDateUtc': now[:10], 'filter': query,
                     'filterValues': values, 'pageSize': PAGE_SIZE, 'nextPage': 1,
                     'total': None, 'units': []}
        seen = {unit['id'] for unit in stock['units']}
        while stock['total'] is None or len(stock['units']) < stock['total']:
            if clock()[:10] != stock['retrievalDateUtc']:
                raise ValueError('Retrieval day changed; explicit --restart required')
            total, page_units = read_page(session, stock['nextPage'], query, kind, values, stock['total'])
            ids = [unit['id'] for unit in page_units]
            if len(set(ids)) != len(ids) or seen.intersection(ids):
                raise ValueError('Duplicated register units; explicit --restart required')
            if stock['nextPage'] == 1:
                stock['firstPageFingerprint'] = fingerprint(page_units)
            stock['total'] = total
            stock['units'].extend(page_units)
            seen.update(ids)
            stock['nextPage'] += 1
            stock['lastPageFingerprint'] = fingerprint(page_units)
            stock['updatedAt'] = clock()
            save(checkpoint, stock)
            report({'kind': kind, 'status': 'collecting', 'count': len(seen), 'total': total,
                    'startedAt': stock['startedAt'], 'updatedAt': stock['updatedAt']})
            print(kind, len(seen), 'of', total, flush=True)
            if len(seen) < total:
                sleep(1)
        # Recheck both edges and total before replacing the last complete output.
        if clock()[:10] != stock['retrievalDateUtc']:
            raise ValueError('Retrieval day changed; explicit --restart required')
        _, first = read_page(session, 1, query, kind, values, stock['total'])
        _, last = read_page(session, max(1, stock['nextPage'] - 1), query, kind, values, stock['total'])
        if fingerprint(first) != stock['firstPageFingerprint'] or fingerprint(last) != stock['lastPageFingerprint']:
            raise ValueError('Register edge pages changed; explicit --restart required')
        if len(seen) != stock['total']:
            raise ValueError('Incomplete register collection')
        stock.update(status='complete', completedAt=clock(), checkedAt=clock(), count=len(seen),
                     validation='Stable total, unique unit IDs, per-row technology/status/country checks, first/last page recheck; no transaction guarantee.')
        save(output, stock)
        # Keep a resumable checkpoint until output replacement succeeds.
        checkpoint.unlink(missing_ok=True)
        report({key: stock[key] for key in ['kind', 'status', 'count', 'total', 'startedAt', 'completedAt']})
        return stock
    except BaseException as error:
        # Network interruptions remain resumable; data inconsistencies require restart.
        resumable = isinstance(error, (requests.RequestException, KeyboardInterrupt))
        state = 'interrupted' if resumable else 'failed'
        if stock is not None and checkpoint.exists() and not resumable:
            stock.update(status='failed', failedAt=clock(), reason=str(error))
            save(checkpoint, stock)
        report({'kind': kind, 'status': state, 'updatedAt': clock(),
                'count': len(stock.get('units', [])) if stock else 0,
                'reason': str(error) or type(error).__name__, 'resumable': resumable})
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--kind', choices=['wind', 'solar', 'all'], default='all')
    parser.add_argument('--restart', action='store_true', help='Start a fresh collection; keep previous complete outputs until validated replacement.')
    args = parser.parse_args()
    log = args.root / 'logs/national-register-status.json'
    log.parent.mkdir(parents=True, exist_ok=True)
    with (log.parent / 'national-register.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        status = json.loads(log.read_text()) if log.exists() else {'schemaVersion': VERSION, 'kinds': {}}

        def report(value):
            status['kinds'][value['kind']] = value
            status['status'] = 'collecting' if value['status'] == 'collecting' else value['status']
            status['updatedAt'] = utcnow()
            save(log, status)

        with requests.Session() as session:
            session.headers['User-Agent'] = 'SolarCheck-national-register/1.0'
            try:
                metadata = get_json(session, FILTER_API)
                kinds = ['wind', 'solar'] if args.kind == 'all' else [args.kind]
                for kind in kinds:
                    collect(args.root, kind, session, metadata, args.restart, report=report)
            except (Exception, KeyboardInterrupt) as error:
                status.update(status='failed', updatedAt=utcnow(), reason=str(error) or type(error).__name__)
                save(log, status)
                print('National register collection stopped:', str(error), file=sys.stderr)
                return 75 if isinstance(error, requests.RequestException) else 1
        status.update(status='complete', updatedAt=utcnow())
        save(log, status)
    return 0


if __name__ == '__main__':
    sys.exit(main())
