import { digit, takeTo, string, regexp,seqObj, all, alt,seq, EOF, optWhitespace, SOL, noneOf,prev } from "../src/index";
import {toInnerParser} from "../src/operators";

describe('operators',()=>{
  test('toInnerparser',()=>{
    const text = String.raw`line1\
    line2\
    line3
    line4`;
    const _ = regexp(/[ \t]*/)
    
    const basicLine = takeTo("\n","\\\n").skip(alt("\n","\\\n"));
    const continueLine = seq(prev("\\\n"), _).then(basicLine);
    const aLine = basicLine.plus(continueLine.many()).join();
    expect(aLine.tryParse(text)).toBe("line1line2line3");
    const parser = aLine.pipe(toInnerParser(takeTo("2")))
    expect(parser.tryParse(text)).toBe("line1line");
  })

})