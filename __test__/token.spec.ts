import { of, aLine } from "../src/index";

describe("Tokens", () => {
  test("aLine: matchWhole Line and NewLine", () => {
    const text = String.raw`line1
    line2`;
    expect(of(aLine, "    line2").tryParse(text)).toStrictEqual([
      "line1",
      "    line2",
    ]);
  });
});
