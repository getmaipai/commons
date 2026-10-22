"""LookResult stays consistent across schema, vocabulary and generated model."""

import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator
from pydantic import ValidationError

from gen.py.look_result_schema import LookResult

ROOT = Path(__file__).resolve().parents[2]
RECORDS = ROOT / "fixtures" / "records"


def read(path):
    return json.loads(path.read_text())


def test_look_result_fixture_schema_and_model_round_trip():
    schema = read(ROOT / "schemas" / "look-result.schema.json")
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema)
    value = read(RECORDS / "look-result.example.json")
    validator.validate(value)
    parsed = LookResult.model_validate(value)
    assert json.loads(parsed.model_dump_json(by_alias=True, exclude_unset=True)) == value


def test_look_result_without_scene_light_is_rejected():
    value = read(RECORDS / "look-result.invalid-no-light.example.json")
    schema = read(ROOT / "schemas" / "look-result.schema.json")
    assert list(Draft202012Validator(schema).iter_errors(value))
    with pytest.raises(ValidationError):
        LookResult.model_validate(value)


def test_look_vocabulary_and_yolox_pin():
    vocab = read(ROOT / "vocab" / "look-vocabulary.json")
    expected = "person,chair,couch,potted plant,bed,dining table,tv,laptop,cell phone,book,bottle,cup,clock,vase,cat,dog,backpack,handbag,umbrella,bowl,refrigerator,microwave,oven,sink,toaster,keyboard,mouse,remote,scissors,teddy bear,bench,suitcase,wine glass,fork,knife,spoon,banana,apple,orange,sandwich,pizza,cake".split(",")
    assert vocab["detector_classes"] == expected
    for key, values in vocab.items():
        if key == "version":
            continue
        assert len(values) == len(set(values)), key
        assert all(value == value.lower() for value in values), key
    assert 250 <= len(vocab["nouns"]) <= 350
    assert vocab["colours"] == "black,white,gray,beige,brown,red,orange,yellow,green,teal,blue,purple,pink".split(",")
    assert all(1 <= len(noun) <= 32 for noun in vocab["nouns"])
    assert not set(vocab["nouns"]) & (set(expected) - set(vocab["detector_classes"]))
    assets = read(ROOT / "assets" / "robot-assets.json")
    pin = next(row for row in assets if row["id"] == "yolox-nano-0.1.1rc0")
    assert pin["sha256"] == "c789161ed43c8269fcd4e67c67eeeb4e80c622da2eb296a20bc6007bd18a0b7d"
