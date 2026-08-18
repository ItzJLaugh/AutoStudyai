from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class SmartNotesUploadContractTests(unittest.TestCase):
    def test_form_data_upload_does_not_use_json_auth_headers(self):
        source = (ROOT / "web" / "pages" / "smartnotes.js").read_text(encoding="utf-8")
        upload_start = source.index("fetch(API + '/extract-file-text'")
        upload_end = source.index(".then(async r =>", upload_start)
        upload_call = source[upload_start:upload_end]

        self.assertIn("headers: authOnlyHeaders()", upload_call)
        self.assertNotIn("headers: authHeaders()", upload_call)


if __name__ == "__main__":
    unittest.main()
