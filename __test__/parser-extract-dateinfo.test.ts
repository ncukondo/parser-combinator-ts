import { digit, takeTo, of,  all, anyOf } from "../src/index";
import { times,map,join,label,fallback } from "../src/operators";

import test = jest.It;
import expect = jest.Expect;
import  describe = jest.Describe;


const extractDateInfo = (filename: string) => {
  type DateInfo = { year: number; day: number; month: number };
  const toDate = map((i: DateInfo) => new Date(i.year, i.month - 1, i.day));
  const d = (c: number) => digit().to(times(c),join(),map(Number));
  const [dddd, dd] = [d(4), d(2)];
  const [year, month, day] = [
    label("year",dddd),
    label("month",dd),
    label("day",dd)
  ];
  const name = label("name",takeTo("("));

  const _ = of("_");
  const to = of("-");
  const d1 = of(year, _, month, _, day);
  const d2 = of(year, _, month, _, dd, to, day);
  const d3 = of(year, _, dd, _, dd, to, month, _, day);
  const d4 = of(dddd, _, dd, _, dd, to, year, _, month, _, day);
  const date = anyOf(d4, d3, d2, d1).to(toDate,label("date"));
  const ext = label("ext",all);

  const parser = of(name, "(", date, ")", ext).to(fallback(null));
  return parser.tryParse(filename);
};

describe("extractDateInfo", () => {
  test("extractDateInfo file(2020_10_12).txt", () => {
    expect(extractDateInfo("file(2020_10_12).txt")).toEqual({
      date: new Date(2020, 10 - 1, 12),
      ext: ".txt",
      name: "file"
    });
  });
  test.each`
    filename                             | date
    ${"file(2020_10_12).txt"}            | ${new Date(2020, 10 - 1, 12)}
    ${"file(2020_10_12-14).txt"}         | ${new Date(2020, 10 - 1, 14)}
    ${"file(2020_10_12-11_13).txt"}      | ${new Date(2020, 11 - 1, 13)}
    ${"file(2020_10_12-2021_11_10).txt"} | ${new Date(2021, 11 - 1, 10)}
  `("returns $date when $filename", ({ filename, date }) => {
    expect(extractDateInfo(filename)?.date).toEqual(date);
  });
});
