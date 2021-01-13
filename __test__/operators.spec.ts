import { digit, takeTo, string, regexp,seqObj, all, alt,seq, EOF, optWhitespace, SOL, noneOf,prev, pipe, map, Parser } from "../src/index";
import {remap, toInnerParser} from "../src/operators";

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
  });

  test('map',()=>{
    const map2:<V,R>(fn:(v:V)=>R) => (parser:Parser<V>|(()=>Parser<V>)|(V extends string ? V:never))=>Parser<R> = map; 
    const unit = map2(<T>(v:T)=>[v]);
    const mapTest = pipe(string("aaa"),unit);
    const mapTest2 = pipe("aaa" as const,map2((n)=>[n]))
    expect(mapTest.tryParse("aaa")).toEqual(["aaa"]);
    expect(mapTest2.tryParse("aaa")).toEqual(["aaa"]);
  })
  test('remap',()=>{
    const o1 = {key1:"tokey1", key2:"tokey2"} as const;
    const p1 = seqObj("bbb",["tokey1","aaa"] as const);
    const remapTest = pipe(p1,remap({key1:"tokey1", key2:"tokey2"} as const))
    const remapTest2 = pipe(seq("aaa","bbbb"),remap({key1:1, key2:0} as const))
    const remapTest3 = pipe(seq("aaa","bbbb"),remap([1, 0] as const));
    expect(remapTest.tryParse("bbbaaa")).toEqual({key1:"aaa",key2:"tokey2"});

    expect(remapTest2.tryParse("aaabbbb")).toEqual({key1:"bbbb",key2:"aaa"});
    expect(remapTest3.tryParse("aaabbbb")).toEqual(["bbbb","aaa"]);
  })

})