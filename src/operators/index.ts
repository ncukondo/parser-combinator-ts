import {
  makeParser,
  isFail,
  ok,
  isOk,
  fail,
  Parser,
  makeOk,
  Mark,
  Node,
  string
} from "../parser";
import {
  toParser,
  ParserLike,
  ParserValue,
  alt,
  seq,
  pipe,
  map,
  takeTo,
} from "../combinators";
import { index, NL, SOL } from "../token";

const join = <T extends string[]>(sep="") => map((arr:T) => arr.join(sep));

const many = <T extends ParserLike<unknown>>(parserLike:T):Parser<ParserValue<T>[]> => {
  const parser = toParser(parserLike);

  return makeParser((input, i, ok) => {
    let accum: ParserValue<T>[] = [];
    let lastIndex = i;

    for (;;) {
      const result = parser.parse(input, lastIndex);
      if (isOk(result)) {
        if (lastIndex === result.index) {
          throw new Error(
            "infinite loop detected in many() parser --- calling many() on " +
              "a parser which can accept zero characters is usually the cause"
          );
        }
        lastIndex = result.index;
        accum = [...accum, result.value];
      } else {
        return ok(lastIndex, accum);
      }
    }
  });
};

type Concat = <T extends ParserLike<unknown>>(unit:T) =>  <U extends ParserLike<unknown>>(parserLike: U) =>
  ParserValue<T> extends unknown[]
    ? ParserValue<U> extends unknown[]
      ? Parser<[...ParserValue<U>,...ParserValue<T>]> 
      : Parser<[ParserValue<U>,...ParserValue<T>]>
    : ParserValue<U> extends unknown[]
      ? Parser<[...ParserValue<U>,ParserValue<T>]> 
      : Parser<[ParserValue<U>,ParserValue<T>]>;
//@ts-ignore
const concat:Concat = <T extends ParserLike<unknown>>(x:T) => <U extends ParserLike<unknown>>(parser: U) => 
  pipe(
    seq(parser,x),
    map(([l,r])=>Array.isArray(l) ? l.concat(r) : [l].concat(r as any))
  )

const plus = concat;
const and = concat;

const pick1 = <T extends object|any[],I extends keyof T>(key:I) => map((arr:T) => arr[key]);


type DeepFlattened<T> = T extends ReadonlyArray<infer U> ?  DeepFlattened<U> : T;
type Tail<T extends readonly unknown[]> = T extends readonly [any, ...infer U] ? U : [];
type Flatten<T extends readonly unknown[]> =
    { 
      0: [], 
      1: T[0] extends unknown[]
          ? [...T[0],...Flatten<Tail<T>>]
          : [T[0],...Flatten<Tail<T>>]
    }[T extends [] ? 0 : 1];
const flatDeep =  <T extends Parser<unknown>>(parser: T) => pipe(parser,map(
  (x:ParserValue<T>) => Array.isArray(x) ? x.flat(Infinity) : x
)) as Parser<DeepFlattened<ParserValue<T>>[]>;
const flat =  <T extends Parser<unknown>>(parser: T) => pipe(parser,map(
  (x:ParserValue<T>) => Array.isArray(x) ? x.flat() : x
)) as ParserValue<T> extends any[] ? Parser<Flatten<ParserValue<T>>> : Parser<ParserValue<T>>;

const sepBy1 = <T extends ParserLike<unknown>>(sep: T) => <U extends ParserLike<unknown>>(
  parser: U
) => {
  const start = pipe(parser,map(x=>[x]));
  var pairs = pipe(
    seq(sep, parser),
    pick1(1),
    many
  );
  return pipe(start,concat(pairs));
};

const sepBy = <T extends ParserLike<unknown>>(sep: T) => <U extends ParserLike<unknown>>(
  parser: U
) => alt(pipe(parser,sepBy1(sep)), ok<ParserValue<U>[]>([]));

type Chain = {
  <T extends ParserLike<unknown>,U>(fn:(value:ParserValue<T>)=>Parser<U>):(parserLike:T) =>Parser<U>;
  <L,U>(fn:(value:L)=>Parser<U>):(parserLike:ParserLike<L>) =>Parser<U>;
}
const chain:Chain = (
  func: (value: unknown) => Parser<unknown>
) => (parserLike: ParserLike<unknown>) => {
  const parser = toParser(parserLike);
  return makeParser((input, i) => {
    const result = parser.parse(input, i);
    if (isFail(result)) return result;
    return func(result.value).parse(input, result.index);
  });
};

const assert = <T>(func: (value: T) => boolean, desc = "") => 
  chain((value:T) => (func(value) ? ok(value) : fail(desc) as Parser<T>));

const not = <T extends ParserLike<unknown>>(notParser: T, desc = "") => <U extends ParserLike<unknown>>(
  parserLike: U
) => {
  const parser = toParser(parserLike);
  const _notParser = toParser(notParser);
  return makeParser((input, i, _, fail) => {
    const notReply = _notParser.parse(input, i);
    if (isOk(notReply)) {
      return fail(i, desc);
    }
    return parser.parse(input, i);
  });
};

const fallback = <T>(result: T) => <U extends ParserLike<unknown>>(parser: U) => alt(parser, ok(result));

const wrap = <L extends ParserLike<unknown>, R extends ParserLike<unknown>>(left: L, right?: R) => <U extends ParserLike<unknown>>(
  parser: U
) => pipe(
    seq(left, parser, right ?? left),
    pick1(1)
  );

const trim = wrap;

const or = <T extends ParserLike<unknown>>(altParser: T) => <U extends ParserLike<unknown>>(parser: U) => alt(parser, altParser);

function times(count: number): <U extends ParserLike<unknown>>(parserLike: U) => Parser<ParserValue<U>[]>;
function times(
  min: number,
  max: number
): <U extends ParserLike<unknown>>(parserLike: U) => Parser<ParserValue<U>[]>;
function times<U extends ParserLike<unknown>>(
  c1: number,
  c2?: number
): (parserLike: U) => Parser<ParserValue<U>[]> {
  return (parserLike: U) => {
    const parser = toParser(parserLike);
    const max = c2 !== undefined ? c2 : c1;
    const min = c1;
    return makeParser((input, i, ok, fail) => {
      let pos = i;
      let currentReply = parser.parse(input, pos);
      let accum: ParserValue<U>[] = isOk(currentReply) ? [currentReply.value] : [];
      let count = 0;
      while (count < max && isOk(currentReply)) {
        currentReply = parser.parse(input, currentReply.index);
        accum = isOk(currentReply) ? [...accum, currentReply.value] : accum;
        if (isOk(currentReply)) pos = currentReply.index;
        count++;
      }
      if (count >= min) return ok(pos, accum);
      return fail(
        pos,
        isFail(currentReply)
          ? `max:${max} min:${min} of ${currentReply.expect}`
          : `max:${max} min:${min}`
      );
    });
  };
}

const atMost = (n: number) => times(0, n);

const atLeast = (n: number) => <U extends ParserLike<unknown>>(parser: U) => pipe(parser, times(n), plus(pipe(parser, many)));

const premap = (fn: (input: string) => string) => <U extends ParserLike<unknown>>(
  parserLike: U
) => {
  const parser = toParser(parserLike);
  return makeParser((input, i) => {
    var result = parser.parse(fn(input.slice(i)));
    if (isFail(result)) {
      return result;
    }
    return makeOk(i + input.length, result.value);
  });
};

const skip = <T extends ParserLike<unknown>>(next: T) => <U extends ParserLike<unknown>>(parser: U) => 
  pipe(
    seq(parser, next),
    pick1(0)
  );

const then = <T extends ParserLike<unknown>>(next: T) => <U extends ParserLike<unknown>>(parser: U) => 
  pipe(
    seq(parser, next),
    pick1(1)
  );


const mark = <U extends ParserLike<unknown>>(parser: U): Parser<Mark<ParserValue<U>>> => 
  pipe(
    seq(index, parser, index),
    map(([start, value, end]) => ({ start, value, end }))
  );

const node = <Name extends string>(name: Name) => <U extends ParserLike<unknown>>(
  parser: U
): Parser<Node<ParserValue<U>,Name>> => pipe(
    seq(index, parser, index),
    map(([start, value, end]) => ({ name, start, value, end }))
  );

const notFollowedBy = (notParser: ParserLike<unknown>) => <U extends ParserLike<unknown>>(
  parserLike: U
) => {
  const parser = toParser(parserLike);
  const _notParser = toParser(notParser);
  return makeParser(function (input, i, ok, fail) {
    const firstReply = parser.parse(input, i);
    if (isFail(firstReply)) return firstReply;
    const notReply = _notParser.parse(input, firstReply.index);
    return isFail(notReply) ? firstReply : fail(i, `not followed by notParser`);
  });
};

const followedBy = (followParserLike: ParserLike<unknown>) => <U extends ParserLike<unknown>>(
  parserLike: U
) => {
  const parser = toParser(parserLike);
  const followParser = toParser(followParserLike);
  return makeParser(function (input, i, ok, fail) {
    const firstReply = parser.parse(input, i);
    if (isFail(firstReply)) return firstReply;
    const nextReply = followParser.parse(input, firstReply.index);
    return isOk(nextReply)
      ? firstReply
      : fail(i, `followed by ${nextReply.expect}`);
  });
};

const tap = <T extends ParserLike<unknown>>(tapFn:(v:ParserValue<T>)=>any)=> (parser:T) => pipe(
  parser,
  map(v=>{tapFn(v); return v})
);

const of = <U>(value:U)=> <T extends ParserLike<unknown>>(parser:T) => pipe(
  parser,
  map(v=>value)
);
  

const toInnerParser = <T extends ParserLike<unknown>>(innerParser: T) => <U extends ParserLike<string>>(
    outerParser: U
  ) => {
  return makeParser((input, i) => {
      const outerRes = toParser(outerParser).parse(input, i);
      if (isFail(outerRes)) return outerRes;
      const textToParse = input.slice(0, i) + outerRes.value;
      const innerRes = toParser(innerParser).parse(textToParse, i);
      if(isFail(innerRes)){
        const expect = [`${innerRes.expect.join(' or ')} in index:${innerRes.furthest} of textToParse`];
        return {...innerRes,expect,furthest:i}
      }
      return innerRes;
    });
};

const asWholeLine = <T extends ParserLike<unknown>>(parser:T) => pipe(
  seq(SOL,takeTo(NL),NL),
  pick1(1),
  toInnerParser(parser)
)

interface WithRawText {
  <T>():(parser:Parser<T>)=>Parser<{value:T,rawText:string}>;
  <T,U>(fn:(text:string,value:T)=>U):(parser:Parser<T>)=>Parser<U>;
}
const withRawText:WithRawText = <T,U>(fn?:(text:string,value:T)=>U) => (parser:Parser<T>)=>{
  return makeParser((input, i,ok) => {
    const reply = parser.parse(input, i);
    if(isFail(reply)) return reply;
    const rawText = input.slice(i,reply.index);
    const value = reply.value;
    if(fn){
      ok(reply.index,fn(rawText,value))
    }
    return ok(reply.index,{value,rawText});
  });
}

export {
map,
desc,pipe,combine} from '../combinators';
export {
  join,
  sepBy,
  sepBy1,
  many,
  followedBy,
  not,
  notFollowedBy,
  node,
  mark,
  skip,
  premap,
  atLeast,
  atMost,
  times,
  or,
  trim,
  wrap,
  fallback,
  assert,
  chain,
  toInnerParser,
  asWholeLine,
  withRawText,
  concat,
  plus,
  and,
  then,
  pick1,
  flat,
  tap,
  of,
  flatDeep
};
