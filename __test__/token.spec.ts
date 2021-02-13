import { digit, takeTo, string, regexp,seqObj, all, alt,seq, EOF, optWhitespace, SOL, noneOf,prev, Parser,of,aLine } from "../src/index";
import { then ,many,join,skip,pipe,map, fallback} from "../src/operators"

describe('Tokens',()=>{
  test('aLine: matchWhole Line and NewLine',()=>{
    const text = String.raw`line1
    line2`;
    expect(of(aLine,"    line2").tryParse(text)).toStrictEqual(["line1","    line2"]);
  });
})

