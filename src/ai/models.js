export function createModel({
  id,
  name,
  provider,
  supportsStructuredOutput = false
}) {
  return {
    id,
    name,
    provider,
    supportsStructuredOutput
  };
}