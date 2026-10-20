import hashlib
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from gen.py.firmware_flash_manifest_schema import FirmwareFlashManifest
from records.py.validate import (
    firmware_flash_manifest_signing_payload,
    validate_firmware_flash_manifest,
)

FIXTURE = (
    Path(__file__).resolve().parents[2]
    / "fixtures"
    / "firmware-flash-manifest"
    / "stackchan-esp32s3.json"
)
EXPECTED_PAYLOAD_SHA256 = (
    "2ac0a67fc74b47478baf40ea33d66abfaf296417931203a79504ac9acef349f3"
)


def load():
    return json.loads(FIXTURE.read_text())


def test_firmware_flash_manifest_round_trip_and_layout():
    record = FirmwareFlashManifest.model_validate(load())
    assert FirmwareFlashManifest.model_validate_json(record.model_dump_json()) == record
    assert validate_firmware_flash_manifest(record) == []


def test_bad_digest_and_traversal_fail_schema():
    value = load()
    value["builds"][0]["parts"][0]["sha256"] = "bad"
    with pytest.raises(ValidationError):
        FirmwareFlashManifest.model_validate(value)
    value = load()
    value["builds"][0]["parts"][0]["path"] = "../x.bin"
    with pytest.raises(ValidationError):
        FirmwareFlashManifest.model_validate(value)


def test_overlap_and_flash_capacity_fail_validator():
    value = load()
    value["builds"][0]["parts"][3]["offset"] = 0x8000
    assert any(
        "overlap" in p
        for p in validate_firmware_flash_manifest(
            FirmwareFlashManifest.model_validate(value)
        )
    )
    value = load()
    value["builds"][0]["parts"][4]["offset"] = 16 * 1024 * 1024
    assert any(
        "past flash_size" in p
        for p in validate_firmware_flash_manifest(
            FirmwareFlashManifest.model_validate(value)
        )
    )


def test_signing_payload_matches_typescript_expected_digest():
    payload = firmware_flash_manifest_signing_payload(
        FirmwareFlashManifest.model_validate(load())
    )
    assert hashlib.sha256(payload).hexdigest() == EXPECTED_PAYLOAD_SHA256


def test_signing_payload_from_raw_json_matches_the_model():
    raw = load()
    assert firmware_flash_manifest_signing_payload(
        raw
    ) == firmware_flash_manifest_signing_payload(
        FirmwareFlashManifest.model_validate(raw)
    )
