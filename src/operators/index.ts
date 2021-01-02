import {
  makeParser,
  isFail,
  ok,
  isOk,
  fail,
  Parser,
  makeOk,
  Mark,
  Node
} from "../parser";
import {
  toParser,
  ParserLike,
  ParserValue,
  alt,
  seq,
  pipe,
  map,
  desc,
  seqToMono,
  takeTo
} from "../combinators";
import { index, NL, SOL } from "../token";

const join = (sep: string) => <T extends string[]>(
  parserLike: ParserLike<T>
) => {
  const parser = toParser(parserLike);
  return parser.pipe(map((arr) => arr.join(sep)));
};

const many = <T>(parserLike: ParserLike<T>) => {
  const parser = toParser(parserLike);

  return makeParser((input, i, ok) => {
    let accum: T[] = [];
    let lastIndex = i;

    for (;;) {
      const result = parser.parse(input, lastIndex);
      if (isOk(result)) {
        if (i === result.index) {
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

const sepBy1 = <T>(sepLike: ParserLike<T>) => <U>(
  parserLike: ParserLike<U>
) => {
  const sep = toParser(sepLike);
  const parser = toParser(parserLike);
  var pairs = seq(sep, parser).pipe(
    map(([, parser]) => parser),
    many
  );
  return seq(parser, pairs).pipe(map(([first, rest]) => [first, ...rest]));
};

const sepBy = <T>(sepLike: ParserLike<T>) => <U>(parserLike: ParserLike<U>) => {
  const parser = toParser(parserLike);
  return alt(parser.pipe(sepBy1(sepLike)), ok<U[]>([]));
};

const chain = <R, T extends ParserLike<R>, U>(
  func: (value: ParserValue<T>) => Parser<U>
) => (parserLike: T) => {
  const parser = toParser(parserLike);
  return makeParser((input, i) => {
    const result = parser.parse(input, i);
    if (isFail(result)) return result;
    return func(result.value as ParserValue<T>).parse(input, result.index);
  });
};

const assert = <T>(func: (value: T) => boolean, desc = "") => (
  parserLike: ParserLike<T>
) => {
  const parser = toParser(parserLike);
  parser.pipe(chain((value) => (func(value) ? ok(value) : fail(desc))));
};

const not = <T>(notParser: ParserLike<T>, desc = "") => <U>(
  parserLike: ParserLike<U>
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

const fallback = <T>(result: T) => <U>(parserLike: ParserLike<U>) => {
  const parser = toParser(parserLike);
  return alt(parser, ok(result));
};

const wrap = <L, R>(leftLike: ParserLike<L>, rightLike?: ParserLike<R>) => <U>(
  parserLike: ParserLike<U>
) => {
  const left = toParser(leftLike);
  const right = rightLike ? toParser(rightLike) : left;
  const parser = toParser(parserLike);
  return pipe(
    seq(left, parser, right),
    map(([, center]) => center)
  );
};

const trim = <L, R>(leftLike: ParserLike<L>, rightLike?: ParserLike<R>) => <U>(
  parserLike: ParserLike<U>
) => {
  return wrap(leftLike, rightLike)(parserLike);
};

const or = <T>(altLike: ParserLike<T>) => <U>(parserLike: ParserLike<U>) => {
  const altParser = toParser(altLike);
  const parser = toParser(parserLike);
  return alt(parser, altParser);
};

function times<U>(count: number): (parserLike: ParserLike<U>) => Parser<U[]>;
function times<U>(
  min: number,
  max: number
): (parserLike: ParserLike<U>) => Parser<U[]>;
function times<U>(
  c1: number,
  c2?: number
): (parserLike: ParserLike<U>) => Parser<U[]> {
  return (parserLike: ParserLike<U>) => {
    const parser = toParser(parserLike);
    const max = c2 !== undefined ? c2 : c1;
    const min = c1;
    return makeParser((input, i, ok, fail) => {
      let pos = i;
      let currentReply = parser.parse(input, pos);
      let accum: U[] = isOk(currentReply) ? [currentReply.value] : [];
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

const atMost = (n: number) => <U>(parserLike: ParserLike<U>) => {
  return pipe(toParser(parserLike), times(0, n));
};

const atLeast = (n: number) => <U>(parserLike: ParserLike<U>) => {
  const parser = toParser(parserLike);
  return seq(pipe(parser, times(n)), pipe(parser, many)).pipe(
    map(([first, rest]) => first.concat(rest))
  );
};

const premap = (fn: (input: string) => string) => <U>(
  parserLike: ParserLike<U>
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

const skip = <T>(nextLike: ParserLike<T>) => <U>(parserLike: ParserLike<U>) => {
  const parser = toParser(parserLike);
  const next = toParser(nextLike);
  return pipe(
    seq(parser, next),
    map(([parser]) => parser)
  );
};

const mark = <U>(parserLike: ParserLike<U>): Parser<Mark<U>> => {
  const parser = toParser(parserLike);
  return pipe(
    seq(index, parser, index),
    map(([start, value, end]) => ({ start, value, end }))
  );
};

const node = (name: string) => <U>(
  parserLike: ParserLike<U>
): Parser<Node<U>> => {
  const parser = toParser(parserLike);
  return pipe(
    seq(index, parser, index),
    map(([start, value, end]) => ({ name, start, value, end }))
  );
};

const notFollowedBy = <T>(notParser: ParserLike<T>) => <U>(
  parserLike: ParserLike<U>
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

const followedBy = <T>(followParserLike: ParserLike<T>) => <U>(
  parserLike: ParserLike<U>
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

const toInnerParser = <T>(innerParser: Parser<T>) => (
    outerParser: Parser<string>
  ) => {
  return makeParser((input, i) => {
      const outerRes = outerParser.parse(input, i);
      if (isFail(outerRes)) return outerRes;
      const textToParse = input.slice(0, i) + outerRes.value;
      const innerRes = innerParser.parse(textToParse, i);
      if(isFail(innerRes)){
        const expect = [`${innerRes.expect.join(' or ')} in index:${innerRes.furthest} of textToParse`];
        return {...innerRes,expect,furthest:i}
      }
      return innerRes;
    });
};

const asWholeLine = <T>(parser:Parser<T>) => {
  const target = takeTo(NL);
  return seqToMono(SOL,[target],NL).pipe(toInnerParser(parser)); 
}

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
desc,} from '../combinators';
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
  withRawText
};
