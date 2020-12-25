import  {Parser,regexp,string,makeParser,isFail,isOk,
  isParser} from './parser';
  
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
    = {[P in keyof T]:ParserValue<T[P]>} extends any[]
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
            
  
  
  const isString = (x:any):x is string => typeof x === "string";
  const isFunction = (x:any):x is Function => typeof x ==="function";
  const isRegExp = (x:any):x is RegExp => x instanceof RegExp;
  const isArray = <T>(x:any):x is Array<T> => Array.isArray(x);
  
  
  type PipeFn<T1,T2> = (value:T1)=>T2;
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
const pipe:Pipe = 
  (seed:any,...fns:[...PipeFn<any,any>[]]) =>{
    return fns.reduce((acc,func)=>{
      return func(acc);
    },seed);
  }

  
  const lazy = <T>(func:()=>Parser<T>):Parser<T> =>{
    return makeParser((input,index)=>{
      return func().parse(input,index)
    })
  }

  const toParser = <T>(x:ParserLike<T>):Parser<T> =>{
    if(isParser(x)) return x;
    if(isString(x)) return string(x) as unknown as Parser<T>;
    if(isRegExp(x)) return regexp(x) as unknown as Parser<T>;
    if(isFunction(x)) return lazy(x);
    return x;
  }
  const toParsers = <T>(xs:readonly ParserLike<T>[]) => xs.map(x=> toParser(x));

  
  
  const desc = (expected:string|string[]) => <T>(parser:Parser<T>) =>{
    const _expected = isArray(expected) ? expected : [expected];
    return makeParser((input, i,ok,fail) =>{
      var reply = parser.parse(input, i);
      return {...reply,expect:_expected};
    });
  };
  
  
  const map =  <T,U>(mapFn:(value:T)=>U) => (parser:Parser<T>):Parser<U> =>{
    return makeParser((input, i, ok) =>{
      const result= parser.parse(input,i);
      if(isFail(result)) return result;
      return ok(result.index,mapFn(result.value));
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
  
  const peek = <T>(x:ParserLike<T>) => {
    const parser = toParser(x);
    return makeParser((input,i,ok,fail)=>{
      const reply = parser.parse(input,i);
      if(isFail(reply)) return reply;
      return ok(i,reply.value);
    })
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
  
  
  export {toParser,toParsers, lazy, desc, 
    map,seq,seqToMono, seqObj, createLanguage,alt,peek,
    takeWhile,takeTo,pipe}
  