import { formatError } from "../src/error-formatter";

declare const test: jest.It;
declare const expect: jest.Expect;
declare const describe: jest.Describe;

const testText = `This screen is visible only in development. It will not appear if the app crashes in production.
Open your browser’s developer console to further inspect this error.
This error overlay is powered by react-error-overlay used in create-react-app`;

const error180 = `
  ---------- PARSING FAILED ----------

  2 | Open your browser’s developer console to further inspect this error.
  3 | This error overlay is powered by react-error-overlay used in create-react-app
    |               ^

Expected:
input, test
`;

describe("formatError", () => {
  test("formatError of 180", () => {
    const res = formatError(testText, 180, "input, test");
    expect(res).toBe(error180);
  });
});
