import { digit, takeTo, string, regexp,seqObj, all, alt,seq, EOF, optWhitespace, SOL, noneOf,prev, Parser,of } from "../src/index";
import { then ,many,join,skip,pipe,map, fallback} from "../src/operators"

describe('combinators',()=>{
  test('seqObj',()=>{
    const seqTest = seqObj("000",["aaa","aaa"] as const, ["bbb",pipe(string("111"),map(Number))] as const,"ccc");
    expect(seqTest.tryParse("000aaa111ccc")).toEqual({aaa:"aaa",bbb:111});
  })
  test('of: of from string',()=>{
    const ofTest1 = of("2012");
    expect(ofTest1.tryParse("2012")).toEqual("2012");
  })
  test('of: of from RegExp',()=>{
    const ofTest1 = of(/\d+/);
    expect(ofTest1.tryParse("2012")).toEqual("2012");
  })
  test('of: of from seq args',()=>{
    const ofTest1 = of("year:",/\d+/);
    expect(ofTest1.tryParse("year:2012")).toEqual(["year:","2012"]);
  })
  test('of: of from seqObj args',()=>{
    const ofTest1 = of("year:",["year",regexp(/\d+/)] as const,"desu");
    expect(ofTest1.tryParse("year:2012desu")).toEqual({year:"2012"});
  })

})

