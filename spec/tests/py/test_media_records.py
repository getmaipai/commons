import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from gen.py.media_production_schema import MediaProduction
from gen.py.media_subject_schema import MediaSubject
from gen.py.media_template_schema import MediaTemplate

SPEC = Path(__file__).resolve().parents[2]
RECORDS = SPEC / "fixtures" / "records"


def fixture(name: str) -> dict:
    return json.loads((RECORDS / name).read_text())


@pytest.mark.parametrize(
    ("name", "model"),
    [
        ("media-template.alfred.example.json", MediaTemplate),
        ("media-subject.astro.example.json", MediaSubject),
        ("media-production.bruno.example.json", MediaProduction),
    ],
)
def test_media_records_round_trip(name, model):
    data = fixture(name)
    assert (
        model.model_validate(data).model_dump(mode="json", exclude_unset=True) == data
    )
    for field in ("id", "provenance", "hlc"):
        broken = dict(data)
        del broken[field]
        with pytest.raises(ValidationError):
            model.model_validate(broken)


def test_media_records_reject_paths_where_file_ids_are_required():
    template = fixture("media-template.alfred.example.json")
    template["references"] = ["/Library/alfred.png"]
    with pytest.raises(ValidationError):
        MediaTemplate.model_validate(template)
    subject = fixture("media-subject.astro.example.json")
    subject["reference_file_ids"] = ["pictures/astro.png"]
    with pytest.raises(ValidationError):
        MediaSubject.model_validate(subject)
    production = fixture("media-production.bruno.example.json")
    production["clip_file_ids"] = ["video/final.mp4"]
    with pytest.raises(ValidationError):
        MediaProduction.model_validate(production)
