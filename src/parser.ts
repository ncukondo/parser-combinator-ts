import {formatError} from './error-formatter'


export interface OkResult<T> {
  status: true;
  index: number
  value: T
  expect: string[]
}
export interface FailResult {
  status: false;
  furthest: number;
  expect: string[]
}
type StringKey<T extends string> = T;
export type ParseResult<T> = OkResult<T> | FailResult; 
export type ParseFn<T> = (
    input:string,
    index:number,
    makeOk:<U>(index:number, value:U)=>OkResult<U>,
    makeFail:(index:number, expected:string|string[]
  )=>FailResult)=>ParseResult<T>;

export type Lazy<T> = ()=>Parser<T>;
export type ParserLike<T> =
  string|RegExp |  Parser<T> | Lazy<T>;
export type ToParser<T> 
  = T extends ParserLike<infer R>
    ? T extends string|RegExp
      ? Parser<string>
      : T extends Lazy<infer R>
        ? Parser<R>
        : T extends Parser<infer R>
          ? Parser<R>
          : never
    : never;
export type ParserValue<T>
  = T extends string|RegExp 
      ? string
      : T extends Lazy<infer R1>
        ? R1
        : T extends Parser<infer R2>
          ? R2
          : never;
export type ParserValues<T extends readonly any[]> 
  = {[P in keyof T]:ParserValue<T[P]>} extends Array<any>
      ? {[P in keyof T]:ParserValue<T[P]>}
      : never;
export type Append<Elm, T extends readonly unknown[]> = ((
    arg: Elm,
    ...rest: T
  ) => void) extends ((...args: infer T2) => void)
    ? T2
    : never;
export type LanguageInfo<T> = 
  {[P in keyof T]:T[P] extends (...args:infer R1) => infer R2
    ? (...args:R1)=>Parser<R2> 
    : Parser<T[P]>};
export type ParserContainer<T> = {
  [P in keyof T]:
    T[P] extends (A1: infer R1,  ...rest:infer R2)=> infer R3
      ? (info:LanguageInfo<T>,A1:R1,...rest:R2) => Parser<R3>
      : ((info:LanguageInfo<T>)=>Parser<T[P]>)|
        ParserLike<T[P]>
  };
export type Length<T extends readonly any[]> = T['length']
export type Tail<T extends readonly any[]> = Length<T> extends 0 ? [] : (((...b: T) => void) extends (a:any, ...b: infer I) => void ? I : [])
export type Labelable<T> = (readonly [string,ParserLike<T>])|ParserLike<T>;
export type LabelableToLabeleds<T extends readonly Labelable<unknown>[]> 
  = {[P in keyof T]:T[P] extends readonly [infer R,ParserLike<any>]?[R extends string?R:never,ParserValue<T[P][1]>]:never}[number]
export type Markable<T> = (readonly [ParserLike<T>])|ParserLike<T>;
export type MarkableToMono<T extends readonly Markable<any>[]> = 
  NotUnion<
    {[P in keyof T]:T[P] extends readonly [ParserLike<any>]?ToParser<T[P][0]>:never}[number]
  >;
type NotUnion<T, Org=T> =T extends any
  ? Org[] extends T[]
    ? Org
    : never
  : never;
export type TupleToObject<T extends [string, any]> = {
    [K in T[0]]: Extract<T, [K, any]>[1]
}
export type LabelableToObj<T extends readonly Labelable<unknown>[]> =
  TupleToObject<LabelableToLabeleds<T>>;
type PipeFn<T1,T2> = (value:T1)=>T2;
  
export type Index = {
  offset:number,
  line:number,
  column:number
}
export type Mark<T> = {
  start:Index,
  end:Index,
  value:T
}
export type Node<T> = {
  start:Index,
  end:Index,
  name:string,
  value:T
}
export type Tree<T> = {
  start:Index,
  end:Index,
  name:string,
  value:Node<T>|Tree<T>[]|(Tree<T>|Node<T>)[];
}
    
  
interface Pipe {
  <A,B>(a:A,ab:PipeFn<A,B>):B;
  <A,B,C>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>):C;
  <A,B,C,D>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>):D;
  <A,B,C,D,E>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>):E;
  <A,B,C,D,E,F>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>):F;
  <A,B,C,D,E,F,G>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>,fg:PipeFn<F,G>):G;
  <A,B,C,D,E,F,G,H>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>,fg:PipeFn<F,G>,gh:PipeFn<G,H>):H;
  <A,B,C,D,E,F,G,H,I>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>,fg:PipeFn<F,G>,gh:PipeFn<G,H>,hi:PipeFn<H,I>):I;
}
export const pipe:Pipe = 
  (seed:any,...fns:[...PipeFn<any,any>[]]) =>{
    return fns.reduce((acc,func)=>{
      return func(acc);
    },seed);
}



const isString = (x:any):x is string => typeof x === "string";
const isFunction = (x:any):x is Function => typeof x ==="function";
const isRegExp = (x:any):x is RegExp => x instanceof RegExp;
const isParser = <T>(x:any):x is Parser<T> =>x instanceof Parser;


const toParser = <T>(x:ParserLike<T>):Parser<T> =>{
  if(isParser(x)) return x;
  if(isString(x)) return string(x) as unknown as Parser<T>;
  if(isRegExp(x)) return regexp(x) as unknown as Parser<T>;
  if(isFunction(x)) return lazy(x);
  return x;
}
const toParsers = <T>(xs:readonly ParserLike<T>[]) => xs.map(x=> toParser(x));

const isOk = <T>(x:ParseResult<T>):x is OkResult<T> =>
  x.status;
const isFail = <T>(x:ParseResult<T>):x is FailResult =>
  !x.status;
  
const isArray = <T>(x:any):x is Array<T> => Array.isArray(x);

const makeOk = <T>(index:number, value:T, expect:string|string[]=[]):OkResult<T>=> {
  const _exp = isArray(expect) ? expect : [expect]
  return {
    status: true,
    index: index,
    value: value,
    expect: _exp
  };
}

const makeFail = (index:number, expected:string|string[]):FailResult=> {
  const _exp = isArray(expected) ? expected : [expected]
  return {
    status: false,
    furthest: index,
    expect: _exp
  };
}

const makeParser = <T>(action:ParseFn<T>) => {
  return new Parser<T>(action); 
}

class Parser<T>{
  constructor(private action:ParseFn<T>){}

  parse(input:string,index=0){
    return this.action(input,index,makeOk,makeFail);
  }

  tryParse(input:string) {
    const reply = this.parse(input);
    if (reply.status) {
      return reply.value;
    } else {
      const msg = formatError(input,reply.furthest,reply.expect);
      const err = new Error(msg);
      throw err;
    }
  };
  

  pipe<A>(a: (t:this)=>A): A
  pipe<A, B>(a: (t:this)=>A, ab: (a: A) => B): B
  pipe<A, B, C>(a: (t:this)=>A, ab: (a: A) => B, bc: (b: B) => C): C
  pipe<A, B, C, D>(a: (t:this)=>A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D
  pipe<A, B, C, D, E>(a: (t:this)=>A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): E
  pipe<U extends Function[]>
      (...funcs:U){
    return (funcs as Function[]).reduce((acc,func)=>{
      return func(acc);
    },this);
  }
}


// -*- Helpers -*-

const offsetToPosition = (input:string, offset:number) =>{
  const lines = input.slice(0, offset).split("\n");
  // Note that unlike the character offset, the line and column offsets are
  // 1-based.
  return {
    offset,
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

const desc =  (expected:string|string[]) => <T>(parserLike:ParserLike<T>) =>{
  const parser = toParser(parserLike);
  const _expected = isArray(expected) ? expected : [expected];
  return makeParser((input, i,ok,fail) =>{
    var reply = parser.parse(input, i);
    return {...reply,expect:_expected};
  });
};

const map = <R,T extends ParserLike<R>,U>(mapFn:(value: ParserValue<T>)=>U) => (parserLike:T):Parser<U> =>{
  const parser = toParser(parserLike);
  return makeParser((input, i, ok) =>{
    const result= parser.parse(input,i);
    if(isFail(result)) return result;
    return ok(result.index,mapFn(result.value as ParserValue<T>));
  });

}



// -*- Combinators -*-


const seq = <
    T extends [ParserLike<unknown>,...ParserLike<unknown>[]]>
  (...parserLikes:T)
    :Parser<ParserValues<T>>=> {
  const unit = map(u=>[u]);
  const [firstLike,...restLikes] = parserLikes;
  const first = toParser(firstLike).pipe(unit);
  const parsers = toParsers(restLikes);
  return makeParser((input, i,ok) =>{
    const firstResult= first.parse(input,i);
    return parsers.reduce((last,parser)=>{
      if(isFail(last)) return last;
      const result = parser.parse(input,last.index);
      if(isFail(result)) return result;
      const value = [...last.value,result.value];
      return ok(result.index,value);
    }, firstResult);
  })as unknown as Parser<ParserValues<T>>;
}


const seqToMono = <
    T extends readonly [Markable<unknown>, ...Markable<unknown>[]]>
  (...markables:T)
    :MarkableToMono<T>=> {
  const keys = [...markables]
    .flatMap((v,i)=>isArray(v) ? i:[]);
  if (keys.length !== 1 ) {
    throw new Error("seqToMono expects one marked parser, found zero or too much");
  }
  const key = keys[0];
  const [first,...parsers] = [...markables]
    .map(v=>isArray(v) ? v[0] as ParserLike<unknown> : v as ParserLike<unknown>)
    .map(v=>toParser(v));
  const result = seq(first,...parsers).pipe(
      map(v=>v[key])
    ) 
  return result as unknown as MarkableToMono<T>;
}


const seqObj = <
  T extends Labelable<unknown>,
  U extends readonly Labelable<unknown>[]
>(first:T,...parserLikeOrLabeled:U):Parser<LabelableToObj<Append<T,U>>> =>{
  const keys = [first,...parserLikeOrLabeled]
    .flatMap((v,i)=>isArray(v) ? [[v[0],i]] as const:[]);
  if (keys.length === 0) {
    throw new Error("seqObj expects at least one named parser, found zero");
  }
  const [firstParser,...parsers] = [first,...parserLikeOrLabeled]
    .map(v=>isArray(v) ? v[1] : v as ParserLike<unknown>)
    .map(v=>toParser(v as ParserLike<unknown>));
  return seq(firstParser,...parsers).pipe(
    map(v=>{
      const entries = keys.map(([key,i])=>[key,v[i]])
      return Object.fromEntries(entries);
        
    })
  ) as unknown as Parser<LabelableToObj<Append<T,U>>>;
}

const createLanguage = <T>
  (parsers:ParserContainer<T>):LanguageInfo<T>  =>{
  const language = {} as LanguageInfo<T>;
  
  for (const key in parsers) {
    if (!{}.hasOwnProperty.call(parsers, key)) continue;
    const value = parsers[key];
    if(isFunction(value)){
      const valuefn = value as Function;
      if(valuefn.length>=2){
        const [ ,...rest] = valuefn.arguments;
        const func = (...args:typeof rest)=> valuefn(language,...args);
        //  @ts-ignore
        language[key] = func;
      }else{
        const func = ()=> valuefn(language);
        //  @ts-ignore
        language[key] = lazy(func);
        }
    }else{
        //  @ts-ignore
        language[key] = toParser(value as ParserLike<T[typeof key]>);
    }
  }
  return language;
}




const alt = <
  T extends ParserLike<unknown>,
  U extends readonly ParserLike<unknown>[]
>(firstLike:T,...parsersLike:U):Parser<ParserValue<T>|ParserValue<U[number]>> =>{
  const first = toParser(firstLike);
  const parsers = toParsers(parsersLike);
  return makeParser((input, i,_,fail)=>  {
    const firstreply = first.parse(input,i);
    return parsers.reduce((last,parser)=>{
      if(isOk(last)) return last;
      const result = parser.parse(input,i);
      if(isOk(result)) return result;
      const expected = last.expect.concat(result.expect);
      return fail(i,expected);
    },firstreply);
  }) as Parser<ParserValue<T>|ParserValue<U[number]>>;
}




// -*- Constructors -*-

const string = (str:string)=> {
  const expected = "'" + str + "'";
  return makeParser((input, i)=>  {
    var j = i + str.length;
    var head = input.slice(i, j);
    if (head === str) {
      return makeOk(j, head);
    } else {
      return makeFail(i, expected);
    }
  });
}

const regexp = (re:RegExp, group=0) =>{
  const flags = (re:RegExp) =>
    (re+"").slice((re+"").lastIndexOf("/") + 1)
  const anchored = (re:RegExp) =>
    RegExp("^(?:" + re.source + ")", flags(re));
  const expected = "" + re;
  return makeParser((input, i)=> {
    const [full,groupMatch] = anchored(re).exec(input.slice(i)) || [];
    const value = group<1 ? full : groupMatch[group+1];
    if(value!==undefined) return makeOk(i + full.length, value); 
    if(group>1){
      const message =
        `valid match group (1 to ${groupMatch.length}) in " + expected`;
      return makeFail(i, message);
    }
    return makeFail(i, expected);
  });
}

const ok = <T>(value:T) => {
  return makeParser((input, i)=>  {
    return makeOk(i, value);
  });
}

const fail = (expected:string|string[]) =>{
  return makeParser((input, i)=>  {
    return makeFail(i, expected);
  });
}

const peek = <T>(x:ParserLike<T>) => {
  const parser = toParser(x);
  return makeParser((input,i,ok,fail)=>{
    const reply = parser.parse(input,i);
    if(isFail(reply)) return reply;
    return ok(i,reply.value);
  })
}


const testChar = (testFn:(chars:string)=>boolean) => {
  return makeParser((input, i)=> {
    const char = input.charAt(i);
    if (i < input.length && testFn(char)) {
      return makeOk(i + 1, char);
    } else {
      return makeFail(i, "a character/byte matching " + testFn.toString());
    }
  });
}

const oneOf = (str:string) =>{
  const expected = str.split("");
  for (var idx = 0; idx < expected.length; idx++) {
    expected[idx] = "'" + expected[idx] + "'";
  }
  return testChar((ch)=> str.includes(ch))
    .pipe(desc(expected));
}

const noneOf = (str:string) => {
  return testChar((ch) => {
    return str.indexOf(ch) < 0;
  }).pipe(desc("none of '" + str + "'"));
}


const rangeChar = (begin:string, end:string) => {
  return testChar(function(ch) {
    return begin <= ch && ch <= end;
  }).pipe(desc(begin + "-" + end));
}

const takeWhile = <T>(predicate:ParserLike<T>) =>{
  const parser = toParser(predicate);
  return makeParser((input, i,ok) =>{
    var j = i;
    while (j < input.length && isOk(parser.parse(input,j))) {
      j++;
    }
    return ok(j, input.slice(i, j));
  });
}

const takeTo = <T>(...stopParsers:ParserLike<T>[]) =>{
  const parsers = toParsers(stopParsers);
  const isStop = (input:string,i:number) =>
    parsers.some(parser=>isOk(parser.parse(input,i))); 
  return makeParser((input, i,ok) =>{
    for (var j = i; j < input.length; j++) {
      if (isStop(input, j)) break;
    }
    return ok(j, input.slice(i, j));
  });
}

function lazy<T>(func:()=>Parser<T>):Parser<T> {
  return makeParser((input,index)=>{
    return func().parse(input,index)
  })
}


// -*- Base Parsers -*-

const index = makeParser((input, i,ok) =>{
  return ok(i, offsetToPosition(input, i));
});

const any = makeParser(function(input, i,ok,fail) {
  if (i >= input.length) {
    return fail(i, "any character");
  }
  return ok(i + 1, input.charAt(i));
});

const all = makeParser((input, i,ok) =>
 ok(input.length, input.slice(i))
);

const EOF = makeParser((input, i,ok,fail) =>{
  if (i < input.length) {
    return fail(i, "EOF");
  }
  return ok(i, null);
});

const SOL = makeParser((input, i,ok,fail) =>{
  if (i === 0) return ok(i, null);
  if ("\n\r".includes(input.charAt(i-1))) return ok(i, null);
  return fail(i, "start of line");
});

const digits = regexp(/[1-9][0-9]*/).pipe(desc("optional digits"));
const letter = regexp(/[a-z]/i).pipe(desc("a letter"));
const letters = regexp(/[a-z]+/i).pipe(desc("letters"));
const optWhitespace = regexp(/\s*/).pipe(desc("optional whitespace"));
const digit = regexp(/[0-9]/).pipe(desc("a digit"));
const whitespace = regexp(/\s+/).pipe(desc("whitespace"));
const cr = string("\r");
const lf = string("\n");
const crlf = string("\r\n").pipe(desc("CRLF"));
const NL = alt(crlf, lf, cr).pipe(desc("newline"));
const EOL = alt(NL, EOF).pipe(desc("end of line"));

export {
  Parser, EOL,SOL,EOF,digit,digits,letter,letters
  ,optWhitespace, whitespace,cr,lf,crlf,NL
  ,any,all,index
  ,makeParser,makeFail,makeOk
  ,isFail,isOk,isFunction,isParser,toParser
  ,alt,seq,map,ok,isArray,fail,peek,takeWhile,takeTo,desc
  ,rangeChar,oneOf,noneOf,seqObj,createLanguage
  ,string, regexp,seqToMono
}