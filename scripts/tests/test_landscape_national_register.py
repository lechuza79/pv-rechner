"""Bounded fake-register checks; never contact the public API."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import requests

SCRIPT = Path(__file__).resolve().parents[1] / 'landscape-national-register.py'
spec = importlib.util.spec_from_file_location('national_register', SCRIPT)
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)
NOW = '2026-10-02T08:00:00+00:00'
META = [
    {'FilterName': 'Energieträger', 'ListObject': [{'Name': 'Wind', 'Value': '2497'}, {'Name': 'Solare Strahlungsenergie', 'Value': '2495'}]},
    {'FilterName': 'Betriebs-Status', 'ListObject': [{'Name': 'In Betrieb', 'Value': '35'}]},
    {'FilterName': 'Land', 'ListObject': [{'Name': 'Deutschland', 'Value': '84'}]},
    {'FilterName': 'Art der Solaranlage', 'ListObject': [{'Name': 'Freiflächensolaranlage', 'Value': '852'}]},
]


def row(number, kind='wind'):
    return {'MaStRNummer': 'SEE' + str(number).zfill(12), 'BetriebsStatusId': 35, 'LandId': 84,
            'EnergietraegerId': 2497 if kind == 'wind' else 2495, 'ArtDerSolaranlageId': 852,
            'NabenhoeheWindenergieanlage': 120.0, 'RotordurchmesserWindenergieanlage': None,
            'WindAnLandOderSeeBezeichnung': 'Windenergie auf See',
            'Bruttoleistung': 3000.0, 'Breitengrad': None, 'Laengengrad': None,
            'AnlagenbetreiberName': 'Must never persist', 'Strasse': 'Must never persist'}


class Response:
    def __init__(self, payload): self.payload = payload
    def raise_for_status(self): pass
    def json(self): return self.payload


class Session:
    def __init__(self, count=1002, kind='wind', stop=False):
        self.count, self.kind, self.stop = count, kind, stop
        self.calls = []
        self.duplicate = False
    def get(self, url, params, timeout):
        self.calls.append(params)
        page = params['page']
        if self.stop and page == 2:
            raise KeyboardInterrupt()
        start = (page - 1) * collector.PAGE_SIZE
        records = [row(i, self.kind) for i in range(start, min(start + collector.PAGE_SIZE, self.count))]
        if self.duplicate and page == 2:
            records[0] = row(0, self.kind)
        return Response({'Total': self.count, 'Data': records, 'Errors': None})


class NationalRegisterTests(unittest.TestCase):
    def collect(self, directory, session, kind='wind', **kwargs):
        return collector.collect(Path(directory), kind, session, META, clock=lambda: NOW, sleep=lambda _: None, **kwargs)

    def test_metadata_values_are_resolved_not_assumed(self):
        changed = json.loads(json.dumps(META))
        changed[0]['ListObject'][0]['Value'] = '9999'
        query, values = collector.resolve_filters(changed, 'wind')
        self.assertEqual(values['energy'], 9999)
        self.assertIn("Energieträger~eq~'9999'", query)
        with self.assertRaises(ValueError): collector.resolve_filters([], 'wind')

    def test_resume_preserves_start_time_and_excludes_operator_fields(self):
        with tempfile.TemporaryDirectory() as directory:
            reports = []
            with self.assertRaises(KeyboardInterrupt):
                self.collect(directory, Session(stop=True), report=reports.append)
            checkpoint = Path(directory) / 'inputs/national-register/wind.checkpoint.json'
            stock = json.loads(checkpoint.read_text())
            self.assertEqual(len(stock['units']), 1000)
            self.assertEqual(reports[-1]['status'], 'interrupted')
            session = Session()
            final = self.collect(directory, session)
            self.assertEqual([call['page'] for call in session.calls], [1, 2, 1, 2])
            self.assertTrue(all(call['pageSize'] == 1000 for call in session.calls))
            self.assertEqual(final['startedAt'], stock['startedAt'])
            self.assertEqual(final['count'], 1002)
            self.assertEqual(len({u['id'] for u in final['units']}), 1002)
            self.assertFalse(checkpoint.exists())
            raw = (Path(directory) / 'inputs/national-register/wind.json').read_text()
            self.assertNotIn('Must never persist', raw)
            self.assertIsNone(final['units'][0]['lat'])
            self.assertIsNone(final['units'][0]['rotorDiameterM'])
            self.assertEqual(final['units'][0]['locationType'], 'Windenergie auf See')

    def test_total_change_fails_without_replacing_complete_output(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(KeyboardInterrupt): self.collect(directory, Session(stop=True))
            output = Path(directory) / 'inputs/national-register/wind.json'
            output.write_text('{"previous":"complete"}')
            reports = []
            with self.assertRaisesRegex(ValueError, 'total changed'):
                self.collect(directory, Session(count=1003), report=reports.append)
            self.assertEqual(json.loads(output.read_text()), {'previous': 'complete'})
            self.assertEqual(reports[-1]['status'], 'failed')
            with self.assertRaisesRegex(ValueError, 'failed or completed'):
                self.collect(directory, Session())
            final = self.collect(directory, Session(count=2), restart=True)
            self.assertEqual(final['count'], 2)

    def test_duplicate_on_second_page_fails_and_keeps_output(self):
        with tempfile.TemporaryDirectory() as directory:
            session = Session()
            session.duplicate = True
            with self.assertRaisesRegex(ValueError, 'Duplicated'): self.collect(directory, session)
            self.assertFalse((Path(directory) / 'inputs/national-register/wind.json').exists())
            checkpoint = json.loads((Path(directory) / 'inputs/national-register/wind.checkpoint.json').read_text())
            self.assertEqual(checkpoint['status'], 'failed')

    def test_stale_checkpoint_needs_explicit_restart(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(KeyboardInterrupt): self.collect(directory, Session(stop=True))
            with self.assertRaisesRegex(ValueError, 'older retrieval day'):
                collector.collect(Path(directory), 'wind', Session(), META,
                                  clock=lambda: '2026-10-03T08:00:00+00:00', sleep=lambda _: None)

    def test_solar_type_and_country_validation(self):
        query, values = collector.resolve_filters(META, 'solar')
        self.assertIn("Art der Solaranlage~eq~'852'", query)
        unit = row(1, 'solar')
        self.assertEqual(collector.technical(unit, 'solar', values)['kind'], 'solar')
        for field in ['LandId', 'ArtDerSolaranlageId', 'BetriebsStatusId', 'EnergietraegerId']:
            altered = dict(unit, **{field: None})
            with self.assertRaises(ValueError): collector.technical(altered, 'solar', values)
        unit['Bruttoleistung'] = float('nan')
        with self.assertRaises(ValueError): collector.technical(unit, 'solar', values)

    def test_retry_is_bounded(self):
        session = unittest.mock.Mock()
        session.get.side_effect = requests.Timeout('bounded failure')
        sleeps = []
        with self.assertRaises(requests.Timeout): collector.get_json(session, 'test', sleep=sleeps.append)
        self.assertEqual(session.get.call_count, 4)
        self.assertEqual(sleeps, [2, 4, 8])

    def test_exit_codes_distinguish_network_from_invalid_data(self):
        for error, expected in [(requests.Timeout('offline'), 75), (ValueError('invalid metadata'), 1)]:
            with tempfile.TemporaryDirectory() as directory:
                with patch.object(collector.sys, 'argv', ['collector', '--root', directory]), patch.object(collector, 'get_json', side_effect=error):
                    self.assertEqual(collector.main(), expected)
                status = json.loads((Path(directory) / 'logs/national-register-status.json').read_text())
                self.assertEqual(status['status'], 'failed')

    def test_final_edge_change_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            session = Session(count=2)
            original_get = session.get
            def changed(url, params, timeout):
                result = original_get(url, params, timeout)
                if len(session.calls) >= 2:
                    result.payload['Data'][0]['Bruttoleistung'] = 42.0
                return result
            session.get = changed
            with self.assertRaisesRegex(ValueError, 'edge pages changed'): self.collect(directory, session)
            self.assertFalse((Path(directory) / 'inputs/national-register/wind.json').exists())


if __name__ == '__main__': unittest.main()
