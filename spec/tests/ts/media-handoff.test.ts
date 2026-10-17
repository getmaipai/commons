import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { MediaPresence } from "../../gen/ts/media-presence.js";
import { RobotState } from "../../gen/ts/robot-state.js";
import { DeviceCommand } from "../../gen/ts/device-command.js";

const root = join(import.meta.dir, "../..");
const read = (path: string) => JSON.parse(readFileSync(join(root, path), "utf8"));
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
for (const name of ["media-presence", "presence-state"]) {
  ajv.addSchema(read(`schemas/${name}.schema.json`));
}
for (const [name, model] of [
  ["media-presence", MediaPresence],
  ["robot-state", RobotState],
  ["device-command", DeviceCommand],
] as const) {
  const schema = read(`schemas/${name}.schema.json`);
  const validate = ajv.getSchema(schema.$id) ?? ajv.compile(schema);
  for (const file of readdirSync(join(root, "fixtures", name)).filter((f) => f.endsWith(".json"))) {
    test(`${name}/${file} agrees with the schema and round-trips`, () => {
      const value = read(`fixtures/${name}/${file}`);
      const valid = file.startsWith("valid-");
      expect(validate(value), ajv.errorsText(validate.errors)).toBe(valid);
      const parsed = model.safeParse(value);
      expect(parsed.success).toBe(valid);
      if (parsed.success) expect(JSON.parse(JSON.stringify(parsed.data))).toEqual(value);
    });
  }
}
