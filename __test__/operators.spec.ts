import { digit, takeTo, string, regexp,seqObj, all, alt,seq, EOF, optWhitespace, SOL, noneOf,prev, pipe, map, Parser, of } from "../src/index";
import {remap, toInnerParser,label,then,skip,plus,many,join,fallback,inSingleLine, trim,toObj, asSingleLine} from "../src/operators";

describe('operators',()=>{
  test('toInnerparser',()=>{
    const text = String.raw`line1\
    line2\
    line3
    line4`;
    const _ = regexp(/[ \t]*/)
    
    const basicLine = pipe(takeTo("\n","\\\n"),skip(alt("\n","\\\n")));
    const continueLine = pipe(seq(prev("\\\n"), _),then(basicLine));
    const aLine = pipe(basicLine,plus(pipe(continueLine,many)),join());
    expect(aLine.tryParse(text)).toBe("line1line2line3");
    const parser = pipe(aLine,toInnerParser(takeTo("2")))
    expect(parser.tryParse(text)).toBe("line1line");
  });

  test('inSingleLine',()=>{
    const text = String.raw`line1\
    line2line3\
    line3    
    line4`;
    const _ = regexp(/[ \t]*/)
    
    const parser = pipe(all,inSingleLine);
    expect(all().tryParse(text)).toBe(text);
    expect(parser.tryParse(text)).toBe("line1\\");
    const stop = pipe("line3", trim(),inSingleLine);
    expect(takeTo(stop).tryParse(text)).toBe("line1\\\n    line2line3\\\n");
  });

  test('asSingleLine: ok for all line and ng for part of line',()=>{
    const text = String.raw`line1\
    line2line3\
    line3    
    line4`;
    const _ = regexp(/[ \t]*/)
    
    const parser1 = pipe(of(`line1\\`),asSingleLine);
    expect(parser1.tryParse(text)).toBe(`line1\\`);
    const parser2 = pipe(of("line1"),asSingleLine);
    expect(parser2.parse(text).ok).toBe(false);
    const stop = pipe("line3", trim(),asSingleLine);
    expect(takeTo(stop).tryParse(text)).toBe("line1\\\n    line2line3\\\n");
  });


  test('map',()=>{
    const unit = map(<T>(v:T)=>[v] as const);
    const mapTest = pipe(string("aaa"),unit);
    const mapTest2 = pipe(string("aaa"),map((n)=>[n]))
    expect(mapTest.tryParse("aaa")).toEqual(["aaa"]);
    expect(mapTest2.tryParse("aaa")).toEqual(["aaa"]);
  })
  test('remap',()=>{
    const a1 = remap({key1:1, key2:0});
    const aaa = pipe("aaa",label("tokey1"));
    const p1 = seqObj("bbb",aaa);
    const remapTest = pipe(p1,remap({key1:"tokey1", key2:"tokey2"}))
    const remapTest2 = pipe(seq("aaa","bbbb"),remap({key1:1, key2:0}))
    const remapTest3 = pipe(seq("aaa","bbbb"),remap([1, 0] as const));
    const remapTest4 = pipe(seq("aaa","bbbb"),a1);
    expect(remapTest.tryParse("bbbaaa")).toEqual({key1:"aaa",key2:"tokey2"});

    expect(remapTest2.tryParse("aaabbbb")).toEqual({key1:"bbbb",key2:"aaa"});
    expect(remapTest3.tryParse("aaabbbb")).toEqual(["bbbb","aaa"]);
    expect(remapTest4.tryParse("aaabbbb")).toEqual({key1:"bbbb",key2:"aaa"});
  })
  test('toObj',()=>{
    const toObj2 = toObj("key1", "key2","");
    const toObjTest1 = pipe(seq("aaa","bbb","ccc"), toObj("key1", "","key3"));
    const toObjTest2 = pipe(seq("aaa","bbb","ccc"), toObj2);
    expect(toObjTest1.tryParse("aaabbbccc")).toEqual({key1:"aaa",key3:"ccc"});
    expect(toObjTest2.tryParse("aaabbbccc")).toEqual({key1:"aaa",key2:"bbb"});
  })

  test('prev',()=>{
    const text = String.raw`line1\
    line2\
    line3
    line4`;
    const _ = regexp(/[ \t]*/)
    
    const basicLine = pipe(SOL,then(pipe(noneOf("\n"),many,join())),skip("\n"));
    const continueLine = seq(prev("\\\n"), _);
    expect(pipe(basicLine, then(continueLine)).tryParse(text)).toEqual(["\\\n","    "]);
  })
  test('fallback',()=>{
    const parser = pipe(string("001"),map(Number),fallback("fail"));
    expect(parser.tryParse("002")).toBe("fail");
  })
})
