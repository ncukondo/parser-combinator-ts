export interface OkResult<T> {
  ok: true;
  index: number;
  value: T;
  expect: string;
}
export interface FailResult {
  ok: false;
  index: number;
  expect: string;
}
export type ParseResult<T> = OkResult<T> | FailResult;
export type ParseFn<T> = (
  input: string,
  index: number,
  makeOk: <U>(index: number, value: U, expected?: string) => OkResult<U>,
  makeFail: (index: number, expected: string) => FailResult
) => ParseResult<T>;
export type Index = {
  offset: number;
  line: number;
  column: number;
};
export type Mark<T> = {
  start: Index;
  end: Index;
  value: T;
};
export type Node<T, U extends string> = {
  start: Index;
  end: Index;
  name: U;
  value: T;
};
export type Tree<T, U extends string, I extends string> = {
  start: Index;
  end: Index;
  name: U;
  value: Node<T, I> | Tree<T, U, I>[] | (Tree<T, U, I> | Node<T, I>)[];
};
interface To<T> {
  <A>(a: (t: T) => A): A;
  <A, B>(a: (t: T) => A, ab: (a: A) => B): B;
  <A, B, C>(a: (t: T) => A, ab: (a: A) => B, bc: (b: B) => C): C;
  <A, B, C, D>(
    a: (t: T) => A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D
  ): D;
  <A, B, C, D, E>(
    a: (t: T) => A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E
  ): E;
  <A, B, C, D, E, F>(
    a: (t: T) => A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F
  ): F;
}

const isOk = <T>(x: ParseResult<T>): x is OkResult<T> => x.ok;
const isFail = <T>(x: ParseResult<T>): x is FailResult => !x.ok;

const offsetToPosition = (input: string, offset: number) => {
  const lines = input.slice(0, offset).split("\n");
  // Note that unlike the character offset, the line and column offsets are
  // 1-based.
  return {
    offset,
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
};

const makeOk = <T>(index: number, value: T, expect = ""): OkResult<T> => ({
  ok: true,
  index,
  value,
  expect,
});

const makeFail = (index: number, expect: string): FailResult => ({
  ok: false,
  index,
  expect,
});

const makeParser = <T>(action: ParseFn<T>) => new Parser<T>(action);

type ErrorFormatter = (
  input: string,
  index: number,
  expected: string
) => string;
const simpleFormatter: ErrorFormatter = (input, index, expected) =>
  `error at index:${index}\n-> expected: ${expected}`;

class Parser<T> {
  constructor(private action: ParseFn<T>) {}
  static formatter = simpleFormatter;

  parse(input: string, index = 0) {
    return this.action(input, index, makeOk, makeFail);
  }

  static setDefaultErrorFormatter(formatter: ErrorFormatter) {
    Parser.formatter = formatter;
  }

  tryParse(input: string, formatter?: ErrorFormatter) {
    const _formatter = formatter || Parser.formatter;
    const reply = this.parse(input);
    if (isOk(reply)) return reply.value;

    const msg = _formatter(input, reply.index, reply.expect);
    const err = new Error(msg);
    throw err;
  }

  to: To<this> = <U extends Function[]>(...fns: U) =>
    // eslint-disable-next-line no-invalid-this
    fns.reduce((acc, fn) => fn(acc), this);
}

const isParser = <T>(x: unknown): x is Parser<T> => x instanceof Parser;

const string = <T extends string>(str: T) => {
  const expected = "'" + str + "'";
  return makeParser((input, i, ok, fail) => {
    const end = i + str.length;
    const target = input.slice(i, end);
    return target === str
      ? (ok(end, target) as OkResult<T>)
      : fail(i, expected);
  });
};

const ok = <T>(value: T) => makeParser((input, i) => makeOk(i, value));

const fail = (expected: string) =>
  makeParser((input, i) => makeFail(i, expected));

const regexp = (re: RegExp, group = 0) => {
  const flags = (re: RegExp) => (re + "").slice((re + "").lastIndexOf("/") + 1);
  const anchored = (re: RegExp) => RegExp("^(?:" + re.source + ")", flags(re));
  const expected = "" + re;
  return makeParser((input, i, ok, fail) => {
    const [full, groupMatch] = anchored(re).exec(input.slice(i)) || [];
    const value = group < 1 ? full : groupMatch[group + 1];
    if (value !== undefined) return ok(i + full.length, value);
    if (group > 1) {
      const message = `valid match group (1 to ${groupMatch.length}) in " + expected`;
      return fail(i, message);
    }
    return fail(i, expected);
  });
};

export {
  Parser,
  string,
  makeOk,
  makeFail,
  makeParser,
  ok,
  fail,
  regexp,
  isParser,
  isFail,
  isOk,
  offsetToPosition,
};
