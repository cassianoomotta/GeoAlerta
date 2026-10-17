"""Validate the mission ledger schema and chronological milestones."""
import argparse
from datetime import datetime
import json
from pathlib import Path
import sys

from jsonschema import Draft202012Validator, FormatChecker

LEDGER_DIR = Path(__file__).resolve().parent
SCHEMA = json.loads((LEDGER_DIR / 'schema.json').read_text(encoding='utf-8'))
Draft202012Validator.check_schema(SCHEMA)
FORMAT_CHECKER = FormatChecker()
if not {'date-time'}.issubset(FORMAT_CHECKER.checkers):
    raise RuntimeError('Install Factory/requirements-dev.txt: date-time validator is required.')
VALIDATOR = Draft202012Validator(SCHEMA, format_checker=FORMAT_CHECKER)
MILESTONES = ('started_at', 'ready_for_review_at', 'completed_at', 'updated_at')


def record_errors(record):
    """Yield schema errors, then compare known, valid timestamps as instants."""
    errors = list(VALIDATOR.iter_errors(record))
    for error in errors:
        location = '.'.join(map(str, error.absolute_path)) or '$'
        yield f'{location}: {error.message}'
    if errors:
        return
    previous = None
    for field in MILESTONES:
        if record.get(field) is None:
            continue
        current = datetime.fromisoformat(record[field].replace('Z', '+00:00').replace('z', '+00:00').replace('t', 'T'))
        if previous and current < previous[1]:
            yield f'{previous[0]} must be <= {field}'
        previous = (field, current)


def validate_file(path):
    """Return all validation errors with source line numbers."""
    errors = []
    try:
        with path.open(encoding='utf-8') as ledger:
            for number, line in enumerate(ledger, 1):
                try:
                    record = json.loads(line)
                except json.JSONDecodeError as error:
                    errors.append(f'{path}: line {number}: invalid JSON: {error.msg}')
                    continue
                errors.extend(f'{path}: line {number}: {error}' for error in record_errors(record))
    except (OSError, UnicodeError) as error:
        errors.append(f'{path}: {error}')
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('path', nargs='?', type=Path, default=LEDGER_DIR / 'cycles.jsonl')
    args = parser.parse_args()
    errors = validate_file(args.path)
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    print(f'Ledger valid: {args.path}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
