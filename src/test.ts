import {
  seqObj,
  string,
  alt,
  seq,
  pipe,
  map,
  regexp,
  seqToMono,
  digit,
  takeTo,
  all
} from "./parser";
import "./parser-method";

const altTest = () => alt("ccc", string("bbb"));
const r3 = seq("aaa", altTest, /aaa/);
const r = seqObj(
  ["label", string("aaa")] as const,
  ["a", /test/] as const,
  "bbb"
);
const r2 = seqToMono(string("aaa"), /test/, [
  string("1").map(Number)
]);

const extractDateInfo = (filename:string) =>{
  const toDate = (i:{year:number,date:number,month:number})=>
    new Date(i.year,i.month-1,i.date);
  const d = (c: number) => digit.times(c).map(Number);
  const [dddd, dd] = [d(4), d(2)];
  const [year, month, date] = [
    dddd.label("year"),
    dd.label("month"),
    dd.label("date")
  ];
  const name = takeTo("(").label("name");
  
  const _ = string("_");
  const to = string("-");
  const d1 = seqObj(year, _, month, _, date);
  const d2 = seqObj(year, _, month, _, dd, to, date);
  const d3 = seqObj(year, _, dd, _, dd, to, month, _, date);
  const d4 = seqObj(dddd, _, dd, _, dd, to, year, _, month, _, date);
  const dateInfo = alt(d1, d2, d3, d4).map(toDate).label("date");
  
  const ext = all.label("ext");
  
  const parser = seqObj(name, "(", dateInfo, ")",ext).fallback(null);
  return parser.tryParse(filename)
}
console.log(extractDateInfo("filename(2020_11_12)"));