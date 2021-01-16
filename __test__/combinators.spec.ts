import { digit, takeTo, string, regexp,seqObj, all, alt,seq, EOF, optWhitespace, SOL, noneOf,prev, Parser } from "../src/index";

describe('combinators',()=>{
  test('seqObj',()=>{
    const seqTest = seqObj("000",["aaa","aaa"] as const, ["bbb",string("111").map(Number)] as const,"ccc");
    expect(seqTest.tryParse("000aaa111ccc")).toEqual({aaa:"aaa",bbb:111});
  })

})

describe('operators',()=>{
  test('prev',()=>{
    const text = String.raw`line1\
    line2\
    line3
    line4`;
    const _ = regexp(/[ \t]*/)
    
    const basicLine = SOL.then(noneOf("\n").many().join()).skip("\n");
    const continueLine = seq(prev("\\\n"), _);
    expect(basicLine.then(continueLine).tryParse(text)).toEqual(["\\\n","    "]);
  })

})