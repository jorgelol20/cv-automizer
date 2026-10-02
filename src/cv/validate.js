import Ajv2020 from "ajv/dist/2020.js";

const ajv = new Ajv2020({
  allErrors: true,
  strict: false
});

export function validateCV(cv, schema) {
  const validate = ajv.compile(schema);
  const valid = validate(cv);

  return {
    valid,
    errors: valid ? [] : (validate.errors || [])
  };
}

export function validateMatch(match, schema) {
  const validate = ajv.compile(schema);
  const valid = validate(match);

  return {
    valid,
    errors: valid ? [] : (validate.errors || [])
  };
}