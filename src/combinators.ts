import {
  Parser,
  regexp,
  string,
  makeParser,
  isFail,
  isOk,
  isParser,
  ParseResult,
  OkResult,
  FailResult,
} from "./parser";

type ParserLike =
  | string
  | (() => string)
  | RegExp
  | (() => RegExp)
  | Parser<unknown>
  | (() => Parser<unknown>);
type ParserValue<T> = T extends ParserLike
  ? T extends string
    ? T
    : T extends RegExp
    ? string
    : T extends Parser<infer P>
    ? P
    : T extends () => infer R
    ? R extends string
      ? R
      : R extends RegExp
      ? string
      : R extends Parser<infer P>
      ? P
      : never
    : never
  : never;
type ToParser<T> = Parser<ParserValue<T>>;
export type ParserValues<T extends readonly any[]> = {
  [P in keyof T]: P extends `${number}` ? ParserValue<T[P]> : T[P];
};
export type LanguageInfo<T> = {
  [P in keyof T]: T[P] extends (...args: infer R1) => infer R2
    ? (...args: R1) => Parser<R2>
    : Parser<T[P]>;
};
export type ParserContainer<T> = {
  [P in keyof T]: T[P] extends (A1: infer R1, ...rest: infer R2) => infer R3
    ? (info: LanguageInfo<T>, A1: R1, ...rest: R2) => Parser<R3>
    : (info: LanguageInfo<T>) => Parser<T[P]>;
};

export type Markable = readonly [ParserLike] | ParserLike;
export type MarkableToMono<T extends readonly Markable[]> = NotUnion<
  {
    [P in keyof T]: T[P] extends readonly [ParserLike]
      ? ToParser<T[P][0]>
      : never;
  }[number]
>;
type NotUnion<T, Org = T> = T extends any
  ? Org[] extends T[]
    ? Org
    : never
  : never;

type Labelable = readonly [string, ParserLike] | ParserLike;
type LabelableToObj<T extends readonly Labelable[], Obj = {}> = T extends []
  ? Obj
  : T extends [readonly [infer Key, infer Value], ...infer Rest]
  ? Key extends string
    ? Value extends ParserLike
      ? Rest extends readonly Labelable[]
        ? LabelableToObj<
            [...Rest],
            {
              [K in Key | keyof Obj]: K extends Key
                ? ParserValue<Value>
                : K extends keyof Obj
                ? Obj[K]
                : never;
            }
          >
        : {
            [K in Key | keyof Obj]: K extends Key
              ? ParserValue<Value>
              : K extends keyof Obj
              ? Obj[K]
              : never;
          }
      : Value
    : Key
  : T extends [ParserLike, ...infer Rest]
  ? Rest extends readonly Labelable[]
    ? LabelableToObj<[...Rest], Obj>
    : Obj
  : Obj;

const isString = (x: any): x is string => typeof x === "string";
const isFunction = (x: any): x is Function => typeof x === "function";
const isRegExp = (x: any): x is RegExp => x instanceof RegExp;
const isArray = <T>(x: any): x is Array<T> => Array.isArray(x);
const range = (start: number, end: number) =>
  [...Array(end - start)].map((_, i) => i + start);

type PipeFn<T1, T2> = (value: T1) => T2;
interface Pipe {
  <A extends string, B>(a: A, ab: PipeFn<A, B>): B;
  <A extends string, B, C>(a: A, ab: PipeFn<A, B>, bc: PipeFn<B, C>): C;
  <A extends string, B, C, D>(
    a: A,
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>
  ): D;
  <A extends string, B, C, D, E>(
    a: A,
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>,
    de: PipeFn<D, E>
  ): E;
  <A extends string, B, C, D, E, F>(
    a: A,
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>,
    de: PipeFn<D, E>,
    ef: PipeFn<E, F>
  ): F;
  <A extends string, B, C, D, E, F, G>(
    a: A,
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>,
    de: PipeFn<D, E>,
    ef: PipeFn<E, F>,
    fg: PipeFn<F, G>
  ): G;
  <A extends string, B, C, D, E, F, G, H>(
    a: A,
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>,
    de: PipeFn<D, E>,
    ef: PipeFn<E, F>,
    fg: PipeFn<F, G>,
    gh: PipeFn<G, H>
  ): H;
  <A extends string, B, C, D, E, F, G, H, I>(
    a: A,
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>,
    de: PipeFn<D, E>,
    ef: PipeFn<E, F>,
    fg: PipeFn<F, G>,
    gh: PipeFn<G, H>,
    hi: PipeFn<H, I>
  ): I;
  <A, B>(a: A, ab: PipeFn<A, B>): B;
  <A, B, C>(a: A, ab: PipeFn<A, B>, bc: PipeFn<B, C>): C;
  <A, B, C, D>(a: A, ab: PipeFn<A, B>, bc: PipeFn<B, C>, cd: PipeFn<C, D>): D;
  <A, B, C, D, E>(
    a: A,
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>,
    de: PipeFn<D, E>
  ): E;
  <A, B, C, D, E, F>(
    a: A,
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>,
    de: PipeFn<D, E>,
    ef: PipeFn<E, F>
  ): F;
  <A, B, C, D, E, F, G>(
    a: A,
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>,
    de: PipeFn<D, E>,
    ef: PipeFn<E, F>,
    fg: PipeFn<F, G>
  ): G;
  <A, B, C, D, E, F, G, H>(
    a: A,
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>,
    de: PipeFn<D, E>,
    ef: PipeFn<E, F>,
    fg: PipeFn<F, G>,
    gh: PipeFn<G, H>
  ): H;
  <A, B, C, D, E, F, G, H, I>(
    a: A,
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>,
    de: PipeFn<D, E>,
    ef: PipeFn<E, F>,
    fg: PipeFn<F, G>,
    gh: PipeFn<G, H>,
    hi: PipeFn<H, I>
  ): I;
}
const pipe: Pipe = (seed: any, ...fns: [...PipeFn<any, any>[]]) =>
  fns.reduce((acc, func) => func(acc), seed);

interface Combine {
  <A, B>(ab: PipeFn<A, B>): B;
  <A, B, C>(ab: PipeFn<A, B>, bc: PipeFn<B, C>): PipeFn<A, C>;
  <A, B, C, D>(ab: PipeFn<A, B>, bc: PipeFn<B, C>, cd: PipeFn<C, D>): PipeFn<
    A,
    D
  >;
  <A, B, C, D, E>(
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>,
    de: PipeFn<D, E>
  ): PipeFn<A, E>;
  <A, B, C, D, E, F>(
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>,
    de: PipeFn<D, E>,
    ef: PipeFn<E, F>
  ): PipeFn<A, F>;
  <A, B, C, D, E, F, G>(
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>,
    de: PipeFn<D, E>,
    ef: PipeFn<E, F>,
    fg: PipeFn<F, G>
  ): PipeFn<A, G>;
  <A, B, C, D, E, F, G, H>(
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>,
    de: PipeFn<D, E>,
    ef: PipeFn<E, F>,
    fg: PipeFn<F, G>,
    gh: PipeFn<G, H>
  ): PipeFn<A, H>;
  <A, B, C, D, E, F, G, H, I>(
    ab: PipeFn<A, B>,
    bc: PipeFn<B, C>,
    cd: PipeFn<C, D>,
    de: PipeFn<D, E>,
    ef: PipeFn<E, F>,
    fg: PipeFn<F, G>,
    gh: PipeFn<G, H>,
    hi: PipeFn<H, I>
  ): PipeFn<A, I>;
}
const combine: Combine = (...fns: [...PipeFn<any, any>[]]) => {
  return (seed: any) =>
    fns.reduce((acc, func) => {
      return func(acc);
    }, seed);
};

interface LazyEx {
  <T extends string>(func: () => T): Parser<T>;
  (func: () => RegExp): Parser<string>;
  <T>(func: () => Parser<T>): Parser<T>;
}
const lazyEx: LazyEx = <T>(
  func: () => Parser<T> | (T extends string ? T : never) | RegExp
): Parser<T> | Parser<string> => {
  return makeParser((input, index) => {
    const v = func();
    const parser =
      typeof v === "string"
        ? string(v)
        : isRegExp(v)
        ? ((regexp(v) as unknown) as Parser<T>)
        : (v as Parser<T>);
    return parser.parse(input, index);
  }) as Parser<T> | Parser<string>;
};
type Lazy = <T>(func: () => Parser<T>) => Parser<T>;
const lazy: Lazy = lazyEx;

const toParser = <T extends ParserLike>(x: T): Parser<ParserValue<T>> => {
  if (isParser(x)) return (x as unknown) as Parser<ParserValue<T>>;
  if (isString(x)) return (string(x) as unknown) as Parser<ParserValue<T>>;
  if (isFunction(x))
    return lazyEx((x as unknown) as () => any) as Parser<ParserValue<T>>;
  if (isRegExp(x)) return (regexp(x) as unknown) as Parser<ParserValue<T>>;
  return (x as unknown) as Parser<ParserValue<T>>;
};
const toParsers = <T extends readonly ParserLike[]>(
  xs: readonly [...T]
): Parser<ParserValue<T[number]>>[] => xs.map((x) => toParser(x));

interface Of {
  <T extends string>(v1: T): Parser<T>;
  <T extends RegExp>(v2: T): Parser<string>;
  <T extends string>(func1: () => T): Parser<T>;
  (func2: () => RegExp): Parser<string>;
  <T>(fn3: () => Parser<T>): Parser<T>;
  <T extends readonly [ParserLike, ...ParserLike[]]>(...parserLikes: T): Parser<
    ParserValues<T>
  >;
  <T extends [Labelable, ...Labelable[]]>(...parserLikeOrLabeled: T): Parser<
    LabelableToObj<T>
  >;
}
const of: Of = (...x: [...Labelable[]]) => {
  if (x.length <= 1)
    return (toParser(x[0] as ParserLike) as unknown) as ReturnType<Of>;
  if (x.find(isArray))
    return (seqObj(
      ...(x as [Labelable, ...Labelable[]])
    ) as unknown) as ReturnType<Of>;
  return seq(...(x as [ParserLike, ...ParserLike[]])) as any;
};

type DescFn = (prev: string, i: number) => string;
interface Desc {
  (expect: string): <T>(parser: Parser<T>) => Parser<T>;
  (descFn: DescFn): <T>(parser: Parser<T>) => Parser<T>;
}
const desc: Desc = (x: string | DescFn) => <T>(parser: Parser<T>) =>
  makeParser((input, i) => {
    const res = parser.parse(input, i);
    return typeof x === "function"
      ? { ...res, expect: x(res.expect, res.index) }
      : { ...res, expect: x };
  });

interface ParseResultDetail {
  readonly wholeText: string;
  readonly ok: boolean;
  readonly start: number;
  readonly end: number;
  readonly expect: string;
  readonly parsed: () => string;
}

interface MapResult {
  <Value, U1>(
    onOk: (result: OkResult<Value>, i: ParseResultDetail) => ParseResult<U1>
  ): (parser2: Parser<Value>) => Parser<U1>;
  <Value, U1, U2>(
    onOk: (result: OkResult<Value>, i: ParseResultDetail) => ParseResult<U1>,
    onFail: (result: FailResult, i: ParseResultDetail) => ParseResult<U2>
  ): (parser2: Parser<Value>) => Parser<U1 | U2>;
}
const mapResult: MapResult = <T, U1, U2>(
  onOk: (result: OkResult<T>, info: ParseResultDetail) => ParseResult<U1>,
  onFail?: (result: FailResult, info: ParseResultDetail) => ParseResult<U2>
) => (parser: Parser<T>): Parser<U1 | U2> => {
  return makeParser(
    (wholeText, start): ParseResult<U1 | U2> => {
      const result = parser.parse(wholeText, start);
      const info = {
        wholeText,
        ok: result.ok,
        start,
        end: result.index,
        expect: result.expect,
        parsed: () => wholeText.substr(start, result.index - start),
      };
      if (isFail(result)) return onFail ? onFail(result, info) : result;
      return onOk(result, info);
    }
  );
};

type MapOperator = {
  <V, R>(mapFn1: (value: V, i: ParseResultDetail) => R): (
    parser: Parser<V>
  ) => Parser<R>;
};
const map: MapOperator = <T, U>(
  mapFn: (value: T, info: ParseResultDetail) => U
) => mapResult<T, U>((res, i) => ({ ...res, value: mapFn(res.value, i) }));

// -*- Combinators -*-

const seq = <T extends readonly [ParserLike, ...ParserLike[]]>(
  ...parserLikes: T
) =>
  (makeParser((input, i, ok) =>
    toParsers(parserLikes).reduce((last, parser) => {
      if (isFail(last)) return last;
      const result = parser.parse(input, last.index);
      if (isFail(result)) return result;
      const value = [...last.value, result.value];
      return ok(result.index, value);
    }, ok(i, []) as ParseResult<unknown[]>)
  ) as unknown) as Parser<ParserValues<T>>;

const seqToMono = <T extends readonly [Markable, ...Markable[]]>(
  ...markables: T
): MarkableToMono<T> => {
  const key = [...markables].findIndex(isArray);
  const [...parsers] = [...markables]
    .map((v) => (isArray(v) ? v[0] : v) as ParserLike)
    .map(toParser) as [Parser<unknown>, ...Parser<unknown>[]];
  return (pipe(
    seq(...parsers),
    map((v) => v[key])
  ) as unknown) as MarkableToMono<T>;
};

const seqObj = <T extends [Labelable, ...Labelable[]]>(
  ...p: T
): Parser<LabelableToObj<T>> => {
  const keys = p.flatMap((v, i) => (isArray(v) ? ([[v[0], i]] as const) : []));
  if (keys.length === 0) {
    throw new Error("seqObj expects at least one named parser, found zero");
  }
  const [...parsers] = [...p]
    .map((v) => (isArray(v) ? v[1] : v) as ParserLike)
    .map(toParser) as [Parser<unknown>, ...Parser<unknown>[]];
  return pipe(
    seq(...parsers),
    map((v) => Object.fromEntries(keys.map(([key, i]) => [key, v[i]])))
  );
};

const createLanguage = <T>(parsers: ParserContainer<T>): LanguageInfo<T> => {
  const language = {} as LanguageInfo<T>;

  for (const key in parsers) {
    if (!{}.hasOwnProperty.call(parsers, key)) continue;
    const value = parsers[key];
    if (isFunction(value)) {
      const valuefn = value as Function;
      if (valuefn.length >= 2) {
        const [, ...rest] = valuefn.arguments;
        const func = (...args: typeof rest) => valuefn(language, ...args);
        //  @ts-ignore
        language[key] = func;
      } else {
        const func = () => valuefn(language);
        //  @ts-ignore
        language[key] = lazy(func);
      }
    } else {
      //  @ts-ignore
      language[key] = toParser(value as ParserLike<T[typeof key]>);
    }
  }
  return language;
};

const alt = <T extends readonly [ParserLike, ...ParserLike[]]>(
  ...p: T
): Parser<ParserValue<T[number]>> =>
  makeParser((input, i, _, fail) =>
    (toParsers(p) as Parser<ParserValue<T[number]>>[]).reduce(
      (last, parser) => {
        if (isOk(last)) return last;
        const result = parser.parse(input, i);
        if (isOk(result)) return result;
        const expected = [last.expect, result.expect];
        return fail(i, expected.join(" or "));
      },
      fail(i, "") as ParseResult<ParserValue<T[number]>>
    )
  );

const peek = <T extends ParserLike>(x: T) => {
  const parser = toParser(x);
  return makeParser((input, i, ok) => {
    const reply = parser.parse(input, i);
    if (isFail(reply)) return reply;
    return ok(i, reply.value);
  });
};

const takeWhile = (predicate: ParserLike) => {
  const parser = toParser(predicate);
  return makeParser((input, i, ok) => {
    let j = i;
    while (j < input.length && isOk(parser.parse(input, j))) {
      j++;
    }
    return ok(j, input.slice(i, j));
  });
};

const takeTo = (...stop: [ParserLike, ...ParserLike[]]) => {
  const parsers = toParsers(stop);
  return makeParser((input, i, ok) => {
    const isStop = (i: number) =>
      parsers.some((parser) => isOk(parser.parse(input, i)));
    const end = range(i, input.length).find(isStop) ?? input.length;
    return ok(end, input.slice(i, end));
  });
};

const between = (start: ParserLike, end: ParserLike) =>
  pipe(
    seq(start, takeTo(end), end),
    map(([, main]) => main)
  );

interface Prev {
  (text: string): Parser<string>;
  <T>(parser: Parser<T>, backTo: number): Parser<T>;
}
const prev: Prev = <T>(x: string | Parser<T>, backTo?: number) => {
  return makeParser<string | T>((input, i, ok, fail) => {
    const back = typeof x === "string" ? x.length : backTo ?? 0;
    const pos = i - back;
    if (back === 0 || pos <= 0)
      return fail(i, `enough position to see prev ${back}`);
    const parser = typeof x === "string" ? string(x) : x;
    return parser.parse(input, pos);
  });
};

export {
  toParser,
  toParsers,
  lazy,
  desc,
  map,
  mapResult,
  seq,
  seqToMono,
  seqObj,
  createLanguage,
  alt,
  peek,
  takeWhile,
  takeTo,
  pipe,
  prev,
  combine,
  between,
  alt as anyOf,
  of,
};
export type {
  ParserValue,
  ToParser,
  ParserLike,
  ParseResultDetail as ParseResultDetaill,
  Labelable,
};
