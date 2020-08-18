import {
  seqObj,
  string,
  alt,
  seq,
  seqToMono,
  digit,
  takeTo,
  regexp,
  all
} from "./parser";
import "./parser-method";

try{
  const altTest = () => alt("ccc", string("bbb"));
  console.log(altTest().tryParse("ccc"));
  console.log(altTest().tryParse("bbb"));
  const seqTest = seq("aaa", altTest, /aaa/);
  console.log(seqTest.tryParse("aaabbbaaa"));
  const seqObjTest = seqObj(
    ["label", string("aaa")] as const,
    ["a", /test\d/] as const,
    "bbb"
  );
  console.log(seqObjTest.tryParse("aaatest5bbb"));
  const r2 = seqToMono(string("aaa"), /test\d/, [
    regexp(/\d\d/).map(Number)
  ]);
  console.log(r2.tryParse("aaatest112"));
}catch(e){
  console.error(e);
}

const extractDateInfo = (filename:string) =>{
  const toDate = (i:{year:number,date:number,month:number})=>
    new Date(i.year,i.month-1,i.date);
  const d = (c: number) => digit.times(c).join().map(Number);
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
console.log(extractDateInfo("filename(2020_11_12).txt"));