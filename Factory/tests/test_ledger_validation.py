"""Behavioral tests of the local ledger CLI and human acceptance gate."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
CLI = ROOT / 'Factory/ledger/validate.py'


def record(status='awaiting_review'):
    return dict(
        schema_version=2, mission_id='local-delivery',
        mission_ref='Factory/missions/local-delivery.md', status=status,
        started_at='2026-10-16T09:00:00Z',
        ready_for_review_at='2026-10-16T10:00:00Z',
        completed_at='2026-10-16T11:00:00Z' if status == 'completed' else None,
        updated_at='2026-10-16T12:00:00Z', definition_of_done=True,
        quality_gate=dict(tests_defined=True, tests_passed=True,
                          evidence_ref='Factory/missions/local-delivery.md#tests',
                          qa_independent=True, qa_passed=True,
                          qa_evidence_ref='Factory/missions/local-delivery.md#qa'),
        human_review=dict(approved_by_human=status == 'completed',
                          evidence_ref='Factory/missions/local-delivery.md#acceptance'
                          if status == 'completed' else None))


class LedgerValidationTests(unittest.TestCase):
    def run_cli(self, content):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'cycles.jsonl'
            path.write_text(content, encoding='utf-8')
            return subprocess.run([sys.executable, str(CLI), str(path)],
                                  capture_output=True, text=True)

    def assert_valid(self, data):
        result = self.run_cli(json.dumps(data) + '\n')
        self.assertEqual(result.returncode, 0, result.stderr)

    def assert_invalid(self, data, field):
        result = self.run_cli(json.dumps(data) + '\n')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('line 1', result.stderr)
        self.assertIn(field, result.stderr)

    def test_local_delivery_requires_no_issue_or_pull_request(self):
        for status in ('awaiting_review', 'completed'):
            with self.subTest(status=status):
                self.assert_valid(record(status))

    def test_template_allows_unknown_progress_without_inventing_metrics(self):
        for status in ('in_progress', 'blocked'):
            data = json.loads((ROOT / 'Factory/ledger/entry.template.json').read_text())
            data.update(mission_id='example', mission_ref='Factory/missions/example.md',
                        status=status, updated_at='2026-10-16T09:00:00Z')
            self.assert_valid(data)

    def test_review_and_completion_require_successful_tests_and_independent_qa(self):
        for status in ('awaiting_review', 'completed'):
            for field in ('tests_defined', 'tests_passed', 'qa_independent', 'qa_passed'):
                for value in (False, None):
                    with self.subTest(status=status, field=field, value=value):
                        data = record(status)
                        data['quality_gate'][field] = value
                        self.assert_invalid(data, field)
            for field in ('evidence_ref', 'qa_evidence_ref'):
                for value in (None, '', '   ', 'https://example.org/evidence', '../outside.md'):
                    data = record(status)
                    data['quality_gate'][field] = value
                    self.assert_invalid(data, field)
            data = record(status)
            del data['quality_gate']['qa_independent']
            self.assert_invalid(data, 'qa_independent')
            data = record(status)
            data['definition_of_done'] = False
            self.assert_invalid(data, 'definition_of_done')

    def test_completed_requires_explicit_human_acceptance_and_local_evidence(self):
        for field, value in [('approved_by_human', False), ('approved_by_human', None),
                             ('evidence_ref', None), ('evidence_ref', ''),
                             ('evidence_ref', 'https://example.org/approval')]:
            data = record('completed')
            data['human_review'][field] = value
            self.assert_invalid(data, field)
        data = record('completed')
        del data['human_review']
        self.assert_invalid(data, 'human_review')

    def test_review_does_not_claim_human_acceptance_or_completion(self):
        data = record()
        data['completed_at'] = '2026-10-16T11:00:00Z'
        self.assert_invalid(data, 'completed_at')
        data = record()
        data['human_review']['approved_by_human'] = True
        self.assert_invalid(data, 'approved_by_human')

    def test_mission_requires_local_markdown_reference(self):
        for value in ('', 'https://example.org/mission', '../mission.md',
                      'Factory/missions/../secret.md', 'Factory/missions/a/b.md'):
            data = record()
            data['mission_ref'] = value
            self.assert_invalid(data, 'mission_ref')
        data = record()
        del data['mission_ref']
        self.assert_invalid(data, 'mission_ref')

    def test_ready_and_completed_require_milestone_dates(self):
        for field in ('started_at', 'ready_for_review_at', 'completed_at'):
            data = record('completed')
            data[field] = None
            self.assert_invalid(data, field)

    def test_rejects_invalid_dates_and_missing_timezone(self):
        for field, value in [('updated_at', 'yesterday'),
                             ('started_at', '2026-02-30T09:00:00Z'),
                             ('ready_for_review_at', '2026-10-16T10:00:00')]:
            data = record()
            data[field] = value
            self.assert_invalid(data, field)

    def test_rejects_reversed_chronology(self):
        for field, value in [('started_at', '2026-10-16T10:30:00Z'),
                             ('ready_for_review_at', '2026-10-16T11:30:00Z'),
                             ('completed_at', '2026-10-16T12:30:00Z')]:
            data = record('completed')
            data[field] = value
            self.assert_invalid(data, field)

    def test_compares_timezone_offsets_as_instants(self):
        data = record('completed')
        data['ready_for_review_at'] = '2026-10-16T07:00:00-03:00'
        self.assert_valid(data)
        data['ready_for_review_at'] = '2026-10-16T09:00:00-03:00'
        self.assert_invalid(data, 'ready_for_review_at')

    def test_rejects_extra_fields_and_legacy_merge_states(self):
        for section in (None, 'quality_gate', 'human_review'):
            data = record()
            (data if section is None else data[section])['secret'] = 'forbidden'
            self.assert_invalid(data, 'secret')
        for status in ('awaiting_merge', 'awaiting_closure'):
            data = record()
            data['status'] = status
            self.assert_invalid(data, 'status')
        data = record()
        data['merged_at'] = None
        self.assert_invalid(data, 'merged_at')

    def test_optional_metrics_allow_unknowns_but_reject_negative_counts(self):
        data = record()
        data.update(tokens_total=None, cost_usd=None, duration_minutes=None)
        self.assert_valid(data)
        for field in ('tokens_total', 'cost_usd', 'duration_minutes'):
            data = record()
            data[field] = -1
            self.assert_invalid(data, field)

    def test_cli_reports_invalid_json_line_and_continues(self):
        result = self.run_cli(json.dumps(record()) + '\n{broken\n' + json.dumps({'oops': 1}))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('line 2', result.stderr)
        self.assertIn('JSON', result.stderr)
        self.assertIn('line 3', result.stderr)

    def test_empty_ledger_passes_but_blank_lines_fail(self):
        self.assertEqual(self.run_cli('').returncode, 0)
        result = self.run_cli('\n')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('line 1', result.stderr)

    def test_non_object_json_is_reported_without_traceback(self):
        result = self.run_cli('null\n[]\n')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('line 1', result.stderr)
        self.assertIn('line 2', result.stderr)
        self.assertNotIn('Traceback', result.stderr)

    def test_missing_file_fails_without_traceback(self):
        result = subprocess.run([sys.executable, str(CLI), '/nonexistent/ledger.jsonl'],
                                capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('ledger.jsonl', result.stderr)
        self.assertNotIn('Traceback', result.stderr)

    def test_invalid_utf8_file_fails_without_traceback(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'invalid.jsonl'
            path.write_bytes(b'\xff')
            result = subprocess.run([sys.executable, str(CLI), str(path)],
                                    capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('Traceback', result.stderr)


if __name__ == '__main__':
    unittest.main()
