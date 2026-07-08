// CJS stub for ESM 'ai' package
const Output = {
  object: jest.fn().mockReturnValue({ type: 'json_schema' }),
};

module.exports = {
  generateText: jest.fn().mockResolvedValue({ output: { keywords: [] }, usage: undefined }),
  Output,
};
