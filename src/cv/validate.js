import Ajv2020 from "ajv/dist/2020.js";

const ajv = new Ajv2020({
  allErrors: true
});

export function validateCV(cv, schema) {
  const validate = ajv.compile(schema);
  const valid = validate(cv);

  return {
    valid,
    errors: validate.errors
  };
}