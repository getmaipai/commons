# Prompt bar schema

`prompt_bar` supports `chips` and `references` for choices and media slots, plus optional `fields` for labelled single-line text inputs written to page state. Each field can set `placeholder` and `max_length`, and `when: { state, equals }` draws it only while that page-state value matches; hidden fields retain their values.
