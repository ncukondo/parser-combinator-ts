import { digit, takeTo, string, regexp,seqObj, all, alt,seq, EOF, optWhitespace, SOL, noneOf,prev } from "../src/index";
import {toInnerParser} from "../src/operators";

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