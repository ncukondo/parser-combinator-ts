import { digit, takeTo, string, regexp,seqObj, all, alt,seq, EOF, optWhitespace, SOL, noneOf,prev, Parser } from "../src/index";
import { then ,many,join,skip,pipe,map, fallback} from "../src/operators"

describe('combinators',()=>{
  test('seqObj',()=>{
    const seqTest = seqObj("000",["aaa","aaa"] as const, ["bbb",pipe(string("111"),map(Number))] as const,"ccc");
    expect(seqTest.tryParse("000aaa111ccc")).toEqual({aaa:"aaa",bbb:111});
  })

})

