import  {Parser,regexp,string,makeParser,isFail,isOk,
  isParser,
  ParseResult} from './parser';
  
type Lazy<T> = ()=>Parser<T>;
type ParserLike = string | (()=>string) | Parser<unknown> | Lazy<unknown>;
type ParserValue<T>
  = T extends ParserLike
    ? T extends string
      ? T
      : T extends Parser<infer P>
        ? P
        : T extends ()=> infer R
          ? R extends string
            ? R
            : R extends Parser<infer P>
              ? P
              : never
          : never
    : never;
type ToParser<T> = Parser<ParserValue<T>>;
export type ParserValues<T extends readonly any[]> 
  = {[P in keyof T]:P extends `${number}` ? ParserValue<T[P]> : T[P]};
export type LanguageInfo<T> = 
  {[P in keyof T]:T[P] extends (...args:infer R1) => infer R2
    ? (...args:R1)=>Parser<R2> 
    : Parser<T[P]>};
export type ParserContainer<T> = {
  [P in keyof T]:
    T[P] extends (A1: infer R1,  ...rest:infer R2)=> infer R3
      ? (info:LanguageInfo<T>,A1:R1,...rest:R2) => Parser<R3>
      : ((info:LanguageInfo<T>)=>Parser<T[P]>)
  };

export type Markable<T> = (readonly [ParserLike])|ParserLike;
export type MarkableToMono<T extends readonly Markable<any>[]> = 
  NotUnion<
    {[P in keyof T]:T[P] extends readonly [ParserLike]?ToParser<T[P][0]>:never}[number]
  >;
type NotUnion<T, Org=T> =T extends any
  ? Org[] extends T[]
    ? Org
    : never
  : never;

export type Labelable = (readonly [string,ParserLike])|ParserLike;
type LabelableToObj<T extends readonly Labelable[],Obj={}> =
T extends []
? Obj
: T extends [readonly [infer Key, infer Value],...infer Rest] 
  ? Key extends string
    ? Value extends ParserLike
      ? Rest extends readonly Labelable[]
        ? LabelableToObj<[...Rest],Obj&{[K in Key]:ParserValue<Value>}>
        : Obj&{[K in Key]:ParserValue<Value>}
      : Value
    : Key
  : T extends [ParserLike,...infer Rest] 
      ? Rest extends readonly Labelable[]
        ? LabelableToObj<[...Rest],Obj>
        : Obj
      :Obj

const isString = (x:any):x is string => typeof x === "string";
const isFunction = (x:any):x is Function => typeof x ==="function";
const isRegExp = (x:any):x is RegExp => x instanceof RegExp;
const isArray = <T>(x:any):x is Array<T> => Array.isArray(x);


type PipeFn<T1,T2> = (value:T1)=>T2;
interface Pipe {
  <A extends string,B>(a:A,ab:PipeFn<A,B>):B;
  <A extends string,B,C>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>):C;
  <A extends string,B,C,D>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>):D;
  <A extends string,B,C,D,E>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>):E;
  <A extends string,B,C,D,E,F>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>):F;
  <A extends string,B,C,D,E,F,G>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>,fg:PipeFn<F,G>):G;
  <A extends string,B,C,D,E,F,G,H>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>,fg:PipeFn<F,G>,gh:PipeFn<G,H>):H;
  <A extends string,B,C,D,E,F,G,H,I>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>,fg:PipeFn<F,G>,gh:PipeFn<G,H>,hi:PipeFn<H,I>):I;
  <A,B>(a:A,ab:PipeFn<A,B>):B;
  <A,B,C>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>):C;
  <A,B,C,D>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>):D;
  <A,B,C,D,E>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>):E;
  <A,B,C,D,E,F>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>):F;
  <A,B,C,D,E,F,G>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>,fg:PipeFn<F,G>):G;
  <A,B,C,D,E,F,G,H>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>,fg:PipeFn<F,G>,gh:PipeFn<G,H>):H;
  <A,B,C,D,E,F,G,H,I>(a:A,ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>,fg:PipeFn<F,G>,gh:PipeFn<G,H>,hi:PipeFn<H,I>):I;
}
const pipe:Pipe = 
  (seed:any,...fns:[...PipeFn<any,any>[]]) => fns.reduce((acc,func)=> func(acc), seed);

interface Combine {
  <A,B>(ab:PipeFn<A,B>):B;
  <A,B,C>(ab:PipeFn<A,B>,bc:PipeFn<B,C>):PipeFn<A,C>;
  <A,B,C,D>(ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>):PipeFn<A,D>;
  <A,B,C,D,E>(ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>):PipeFn<A,E>;
  <A,B,C,D,E,F>(ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>):PipeFn<A,F>;
  <A,B,C,D,E,F,G>(ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>,fg:PipeFn<F,G>):PipeFn<A,G>;
  <A,B,C,D,E,F,G,H>(ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>,fg:PipeFn<F,G>,gh:PipeFn<G,H>):PipeFn<A,H>;
  <A,B,C,D,E,F,G,H,I>(ab:PipeFn<A,B>,bc:PipeFn<B,C>,cd:PipeFn<C,D>,de:PipeFn<D,E>,ef:PipeFn<E,F>,fg:PipeFn<F,G>,gh:PipeFn<G,H>,hi:PipeFn<H,I>):PipeFn<A,I>;
}
const combine:Combine = 
  (...fns:[...PipeFn<any,any>[]]) =>{
    return (seed:any) => fns.reduce((acc,func)=>{
      return func(acc);
    },seed);
  }

interface LazyEx {
  <T extends string>(func:()=>T):Parser<T>
  <T>(func:()=>Lazy<T>):Parser<T>
}  
const lazy:LazyEx = <T>(func:()=>(Parser<T>|(T extends string ? T: never))):Parser<T> =>{
  return makeParser((input,index)=>{
    const v = func();
    const parser = typeof v==="string" ? string(v) : v;
    return parser.parse(input,index)
  })
}

const toParser = <T extends ParserLike>(x:T):Parser<ParserValue<T>> =>{
  if(isParser(x)) return x as unknown as Parser<ParserValue<T>>;
  if(isString(x)) return string(x) as unknown as Parser<ParserValue<T>>;
  if(isFunction(x)) return lazy(x as unknown as ()=>any) as Parser<ParserValue<T>>;
  if(isRegExp(x)) return regexp(x) as unknown as Parser<ParserValue<T>>;
  return x as unknown as Parser<ParserValue<T>>;
}
const toParsers = <T extends readonly ParserLike[]>(xs:readonly [...T]):Parser<ParserValue<T[number]>>[] => xs.map(x=> toParser(x));

type DescFn = (prev:string,i:number)=>string;
interface Desc {
  (expect:string):<T>(parser:Parser<T>)=>Parser<T>
  (descFn:DescFn):<T>(parser:Parser<T>)=>Parser<T>
}
const desc:Desc = (x:string|DescFn) => <T>(parser:Parser<T>) => makeParser((input, i,ok,fail) => {
  const res = parser.parse(input, i);
  return typeof x==="function" ? {...res,expect:x(res.expect,res.index)} : {...res,expect:x};
});

interface ParseResultDetaill {
  readonly wholeText:string;
  readonly ok:boolean;
  readonly start:number;
  readonly end:number;
  readonly expect:string;
  readonly parsed:()=>string;
}

type MapOperator = {
  <V,R>(mapFn1:(value:V,i:ParseResultDetaill)=>R):(parser:Parser<V>) => Parser<R>;
}
//@ts-ignore
const map:MapOperator =  <T extends ParserLike,U>(mapFn:(value:ParserValue<T>,info:ParseResultDetaill)=>U) => (parserLike:T):Parser<U> =>{
  const parser = toParser(parserLike);
  return makeParser((wholeText, start, ok) =>{
    const result= parser.parse(wholeText,start);
    const info = {
      wholeText,
      ok:result.success,
      start,
      end:result.index,
      expect:result.expect,
      parsed:()=>wholeText.substr(start,result.index-start)
    }
    if(isFail(result)) return result;
    return ok(result.index,mapFn(result.value,info));
  });

}
  
  // -*- Combinators -*-
  
  
const seq = <T extends readonly [ParserLike,...ParserLike[]]>
    (...parserLikes:T) => {
    return makeParser((input, i,ok) =>{
      return toParsers(parserLikes).reduce((last,parser)=>{
        if(isFail(last)) return last;
        const result = parser.parse(input,last.index);
        if(isFail(result)) return result;
        const value = [...last.value,result.value];
        return ok(result.index,value);
      }, ok(i,[]) as ParseResult<unknown[]>);
    }) as unknown as Parser<ParserValues<T>>;
  }
  
  
  const seqToMono = <
      T extends readonly [Markable<unknown>, ...Markable<unknown>[]]>
    (...markables:T)
      :MarkableToMono<T> => {
    const key = [...markables].findIndex(v=>Array.isArray(v));
    if (key === -1 ) {
      throw new Error("seqToMono expects one marked parser, found zero or too much");
    }
    const [first,...parsers] = [...markables]
      .map(v=>isArray(v) ? v[0] as ParserLike : v as ParserLike)
      .map(v=>toParser(v));
    return pipe(
      seq(first,...parsers),
      map(v=>v[key])
    ) as unknown as MarkableToMono<T>;
  }
  
  
  const seqObj = <T extends [Labelable,...Labelable[]]>(...parserLikeOrLabeled:T):Parser<LabelableToObj<T>> =>{
    const keys = parserLikeOrLabeled
      .flatMap((v,i)=>isArray(v) ? [[v[0],i]] as const:[]);
    if (keys.length === 0) {
      throw new Error("seqObj expects at least one named parser, found zero");
    }
    const [first,...parsers] = [...parserLikeOrLabeled]
      .map(v=>isArray(v) ? v[1] : v)
      .map(v=>toParser(v as ParserLike));
    return pipe(
      seq(first,...parsers),
      map(v=>{
        const entries = keys.map(([key,i])=>[key,v[i]])
        return Object.fromEntries(entries);        
      })
    );
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
    T extends readonly [ParserLike,...ParserLike[]]
  >(...parsersLike:T):Parser<ParserValue<T[number]>> =>{
    const parsers = toParsers(parsersLike) as Parser<ParserValue<T[number]>>[];
    return makeParser((input, i,_,fail)=>  {
      return parsers.reduce((last,parser)=>{
        if(isOk(last)) return last;
        const result = parser.parse(input,i);
        if(isOk(result)) return result;
        const expected = [last.expect, result.expect];
        return fail(i,expected.join(" or "));
      },fail(i,"") as ParseResult<ParserValue<T[number]>>);
    });
  }
  
  const peek = <T extends ParserLike>(x:T) => {
    const parser = toParser(x);
    return makeParser((input,i,ok)=>{
      const reply = parser.parse(input,i);
      if(isFail(reply)) return reply;
      return ok(i,reply.value);
    })
  }
  
  const takeWhile = (predicate:ParserLike) =>{
    const parser = toParser(predicate);
    return makeParser((input, i,ok) =>{
      var j = i;
      while (j < input.length && isOk(parser.parse(input,j))) {
        j++;
      }
      return ok(j, input.slice(i, j));
    });
  }
  
  const takeTo = (...stopParsers:[ParserLike,...ParserLike[]]) =>{
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

  interface Prev {
    (text:string):Parser<string>;
    <T>(parser:Parser<T>,backTo:number):Parser<T>;
  }
  const prev:Prev = <T>(x:string|Parser<T>,backTo?:number) =>{
    return makeParser<string|T>((input, i,ok,fail) =>{
      const back = typeof x==="string" ? x.length : backTo ?? 0;
      const pos = i-back;
      if(back===0 || pos<=0) return fail(i,`enough position to see prev ${back}`);
      const parser = typeof x==="string" ? string(x) : x;
      return parser.parse(input,pos);
    });
  }
  
  
export {toParser,toParsers, lazy, desc, 
    map,seq,seqToMono, seqObj, createLanguage,alt,peek,
    takeWhile,takeTo,pipe,prev,combine}
export type {
  Lazy,ParserValue,ToParser,ParserLike,
  ParseResultDetaill
}
  