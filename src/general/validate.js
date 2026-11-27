import Ajv2020 from "ajv/dist/2020.js";

const ajv = new Ajv2020({
  allErrors: true,
  strict: false
});

export function validateGeneral(kit, schema) {
  const validate = ajv.compile(schema);
  const valid = validate(kit);

  return {
    valid,
    errors: valid ? [] : (validate.errors || [])
  };
}
