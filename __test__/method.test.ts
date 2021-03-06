import { string, regexp, seq } from "../src/index";
import "../src/parser-method";

describe("basic methods", () => {
  test("withRawText", () => {
    expect(
      seq("year", regexp(/\d+/).map(Number))
        .withRawText()
        .tryParse("year00019801006")
    ).toEqual({
      rawText: "year00019801006",
      value: ["year", 19801006],
    });
  });
  test("many", () => {
    expect(regexp(/./).many().withRawText().parse("123456")).toEqual({
      expect: "",
      index: 6,
      ok: true,
      value: {
        rawText: "123456",
        value: ["1", "2", "3", "4", "5", "6"],
      },
    });
  });
  test("concat", () => {
    const parser = regexp(/./).concat(
      regexp(/\d/).many().concat(seq("a", "b"))
    );
    expect(parser.tryParse("12345ab")).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "a",
      "b",
    ]);
  });
  test("plus(which is equal to concat", () => {
    const parser = regexp(/./).plus(regexp(/\d/).many().plus(seq("a", "b")));
    expect(parser.tryParse("12345ab")).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "a",
      "b",
    ]);
  });
  test("trim", () => {
    const parser = string("test").trim();
    expect(
      parser.tryParse(`   
    test   
    `)
    ).toBe("test");
  });
  test("flat", () => {
    const parser = seq(
      regexp(/./),
      seq(regexp(/\d/), regexp(/\d/)).many()
    ).flat();
    expect(parser.tryParse("123456ab")).toEqual(["1", ["2", "3"], ["4", "5"]]);
  });
  test("flatDeep", () => {
    const parser = seq(
      regexp(/./),
      seq(regexp(/\d/), regexp(/\d/)).many()
    ).flatDeep();
    expect(parser.tryParse("123456ab")).toEqual(["1", "2", "3", "4", "5"]);
  });
});
