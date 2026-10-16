"""Validate consumable factory artifacts; workflow prose is reviewed by independent QA."""
import json
from pathlib import Path
import tomllib
import unittest

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[2]


class FactoryConfigurationTests(unittest.TestCase):
    def test_project_toml_and_roles_can_be_loaded(self):
        for path in (ROOT / '.codex').rglob('*.toml'):
            with self.subTest(path=path):
                with path.open('rb') as source:
                    data = tomllib.load(source)
                self.assertIsInstance(data, dict)
        roles = {}
        for path in (ROOT / '.codex/agents').glob('*.toml'):
            data = tomllib.loads(path.read_text())
            self.assertNotIn(data['name'], roles, 'Duplicate role shadows an agent')
            roles[data['name']] = data
            for field in ('description', 'developer_instructions'):
                self.assertIsInstance(data[field], str)
                self.assertTrue(data[field].strip())
        self.assertEqual(set(roles), {'po', 'analyst', 'developer', 'qa'})

    def test_local_template_initializes_a_valid_unfinished_mission(self):
        schema = json.loads((ROOT / 'Factory/ledger/schema.json').read_text())
        template = json.loads((ROOT / 'Factory/ledger/entry.template.json').read_text())
        template.update(mission_id='configuration-check',
                        mission_ref='Factory/missions/configuration-check.md',
                        updated_at='2026-10-16T09:00:00Z')
        Draft202012Validator(schema, format_checker=FormatChecker()).validate(template)
        self.assertIsNone(template['human_review']['approved_by_human'])
        self.assertIsNone(template['quality_gate']['qa_passed'])
        self.assertIsNone(template['quality_gate']['tests_passed'])
        for field in ('duration_minutes', 'tokens_input', 'tokens_output', 'tokens_total', 'cost_usd'):
            self.assertIsNone(template[field], 'Unknown measurement must not become zero')

    def test_eval_cases_can_be_consumed_without_duplicate_ids(self):
        cases = [json.loads(path.read_text()) for path in sorted((ROOT / 'Factory/evals/cases').glob('*.json'))]
        self.assertGreaterEqual(len(cases), 3)
        self.assertEqual(len(cases), len({case['id'] for case in cases}))
        for case in cases:
            for field in ('scenario', 'grading', 'expected_invariants', 'forbidden_outcomes'):
                self.assertTrue(case[field], f'{case["id"]}: missing {field}')

    def test_telemetry_contract_accepts_minimal_event_and_rejects_sensitive_payload(self):
        schema = json.loads((ROOT / 'Factory/telemetry/events.schema.json').read_text())
        Draft202012Validator.check_schema(schema)
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
        event = dict(schema_version=1, event_name='mission.started',
                     occurred_at='2026-10-16T09:00:00Z', mission_ref='opaque-id')
        self.assertTrue(validator.is_valid(event))
        for field in ('prompt', 'response', 'secret', 'diff', 'personal_data'):
            with self.subTest(field=field):
                self.assertFalse(validator.is_valid({**event, field: 'unexpected payload'}))
        self.assertFalse(validator.is_valid({**event, 'occurred_at': 'yesterday'}))
