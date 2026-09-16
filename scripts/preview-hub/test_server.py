import importlib.util, json, threading, unittest
from pathlib import Path
from unittest.mock import patch
from tempfile import TemporaryDirectory
from urllib.request import Request, urlopen
from urllib.error import HTTPError

spec=importlib.util.spec_from_file_location('hub',Path(__file__).with_name('server.py'))
hub=importlib.util.module_from_spec(spec);spec.loader.exec_module(hub)

class LauncherTests(unittest.TestCase):
    def test_registry_paths_are_local_and_services_exist(self):
        rows=hub.entries()
        self.assertEqual(len(rows),len({r['id'] for r in rows}))
        for row in rows:
            self.assertIn(row['service'],hub.SERVICES)
            self.assertTrue(row['path'].startswith('/'))
            self.assertFalse(row['path'].startswith('//'))
    def test_running_server_is_reused(self):
        with patch.object(hub,'check_owner',return_value=True), patch.object(hub,'ready',return_value=True), patch.object(hub.subprocess,'Popen') as spawn:
            hub.ensure('confetti')
            spawn.assert_not_called()
    def test_foreign_server_is_not_replaced(self):
        with patch.object(hub,'check_owner',side_effect=RuntimeError('Port belegt')), patch.object(hub.subprocess,'Popen') as spawn:
            with self.assertRaises(RuntimeError):hub.ensure('confetti')
            spawn.assert_not_called()
    def test_missing_static_entry_does_not_start_directory_listing(self):
        with TemporaryDirectory() as folder:
            service=hub.static_service(4296,Path(folder))
            with patch.dict(hub.SERVICES,{'product':service}), patch.object(hub.subprocess,'Popen') as spawn:
                with self.assertRaisesRegex(RuntimeError,'fehlen noch lokal'):hub.ensure('product')
                spawn.assert_not_called()
    def test_reused_parent_still_starts_dependencies(self):
        with patch.object(hub,'check_owner',return_value=True), patch.object(hub,'ready',return_value=True) as ready:
            hub.ensure('homepage')
            self.assertEqual([call.args[0] for call in ready.call_args_list],[hub.SERVICES['charts'],hub.SERVICES['homepage']])
    def test_unknown_service_is_rejected(self):
        with self.assertRaises(ValueError):hub.ensure('../../bin/sh')
    def test_cross_origin_and_unknown_launch_are_rejected(self):
        server=hub.ThreadingHTTPServer(('127.0.0.1',0),hub.Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        port=server.server_address[1]
        try:
            with patch.object(hub,'PORT',port), patch.object(hub,'ensure') as ensure:
                for path,origin,status in [('/start/confetti','https://example.com',403),('/start/not-registered','http://127.0.0.1:'+str(port),404)]:
                    request=Request('http://127.0.0.1:'+str(port)+path,method='POST',headers={'Origin':origin})
                    with self.assertRaises(HTTPError) as error:urlopen(request)
                    self.assertEqual(error.exception.code,status)
                ensure.assert_not_called()
        finally:server.shutdown();server.server_close()

if __name__=='__main__':unittest.main()
