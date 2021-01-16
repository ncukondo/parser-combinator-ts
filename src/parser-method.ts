import {Parser,makeParser,isFail,isArray,isOk,ok,fail,
  makeOk,Mark,Node} from './parser'
import  {seqToMono,toParser,seq
  ,ParserLike,alt, ParserValue} from './combinators';
import  {index} from './token';

type DeepFlattened<T> = T extends ReadonlyArray<infer U> ?  DeepFlattened<U> : T;
type Tail<T extends readonly unknown[]> = T extends readonly [any, ...infer U] ? U : [];
type Flatten<T extends readonly unknown[]> =
    { 
      0: [], 
      1: T[0] extends unknown[]
          ? [...T[0],...Flatten<Tail<T>>]
          : [T[0],...Flatten<Tail<T>>]
    }[T extends [] ? 0 : 1];
    
declare module './parser' {
  interface Parser<T>{
    map:<U>(mapFn:(v:T)=>U)=>Parser<U>;
    tap:(tapFn:(v:T)=>any)=>Parser<T>;
    desc:(expected:string|string[]) => this;
    join:(sep?:string) => T extends string[] ? Parser<string> : never;
    concat<U extends ParserLike>(unit:U): ParserValue<U> extends unknown[]
      ? T extends unknown[] ? Parser<[...T, ...ParserValue<U>]> : Parser<[T, ...ParserValue<U>]>
      : T extends unknown[] ? Parser<[...T, ParserValue<U>]> :  Parser<[T,ParserValue<U>]>;
    plus<U extends ParserLike>(unit:U): ParserValue<U> extends unknown[]
      ? T extends unknown[] ? Parser<[...T, ...ParserValue<U>]> : Parser<[T, ...ParserValue<U>]>
      : T extends unknown[] ? Parser<[...T, ParserValue<U>]> :  Parser<[T,ParserValue<U>]>;
    flatDeep(): T extends [...infer R] ? Parser<DeepFlattened<T>[]> : Parser<T>;
    flat(): T extends readonly any[] ? Parser<Flatten<T>> : Parser<T>;
    pick1:<I extends keyof T>(key:I) => T extends object|any[] ?  Parser<T[I]>  : never;
    sepBy:(sepLike:ParserLike) => Parser<T[]>;
    sepBy1:(sepLike:ParserLike) => Parser<T[]>;
    many:() => Parser<T[]>;
    chain:<U>(chainFn:(v:T)=>Parser<U>) => Parser<U>;
    assert:(checkFn:(v:T)=>boolean) => this;
    not:(notParser:ParserLike) => Parser<T>;
    fallback:<U>(fallbackResult:U) => Parser<T|U>;
    wrap:(leftLike:ParserLike, rightLike?:ParserLike)=>Parser<T>;
    trim():Parser<T>;
    trim(quoteLike:ParserLike):Parser<T>;
    trim(leftLike:ParserLike, rightLike:ParserLike):Parser<T>;
    trimL:(leftLike?:ParserLike)=>Parser<T>;
    trimR:(rightLike?:ParserLike)=>Parser<T>;
    or:<U extends ParserLike>(altLike:U)=>Parser<T|ParserValue<U>>;
    times(min:number, max:number):Parser<T[]>; 
    times(count:number):Parser<T[]>; 
    atLeast:(count:number) =>Parser<T[]>; 
    atMost:(count:number) =>Parser<T[]>; 
    premap:(fn:(input:string)=>string)=>Parser<T>
    skip:(skip:ParserLike) => Parser<T>;
    then:<U extends ParserLike>(parser:U) => Parser<ParserValue<U>>;
    mark:()=>Parser<Mark<T>>;
    of:<U>(value:U)=>Parser<U>;
    node:<NAME extends string>(nodeName:NAME)=>Parser<Node<T,NAME>>;
    notFollowedBy:(notParser:ParserLike) => Parser<T>;
    followedBy:(followParser:ParserLike) => Parser<T>;
    withRawText:() => Parser<{value: T;rawText: string;}>
    label:<U extends string>(name:U) => readonly [U,Parser<T>];

    pipe<A>(a: (t:this)=>A): A
    pipe<A, B>(a: (t:this)=>A, ab: (a: A) => B): B
    pipe<A, B, C>(a: (t:this)=>A, ab: (a: A) => B, bc: (b: B) => C): C
    pipe<A, B, C, D>(a: (t:this)=>A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D
    pipe<A, B, C, D, E>(a: (t:this)=>A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): E
    }
}
const _ = Parser.prototype;
  
_.map = function<T,U>(this:Parser<T>,mapFn:(value:T)=>U) {
  return makeParser((input, i, ok) =>{
    const result= this.parse(input,i);
    if(isFail(result)) return result;
    return ok(result.index,mapFn(result.value));
  });
}

_.pipe = function<T,U extends Function[]>(this:Parser<T>,...funcs:U){
return (funcs as Function[]).reduce((acc,func)=>{
return func(acc);
},this);
}


_.tap = function<T>(this:Parser<T>,tapFn:(value:T)=>any) {
  return makeParser((input, i, ok) =>{
    const result= this.parse(input,i);
    if(isFail(result)) return result;
    tapFn(result.value);
    return result;
  });
}

_.desc =  function<T>(this:Parser<T>,expected:string|string[]){
  const _expected = isArray(expected) ? expected : [expected];
  return makeParser((input, i,ok,fail) =>{
    var reply = this.parse(input, i);
    return {...reply,expect:_expected};
  });
};

_.join = function<T extends string[]>(this:Parser<T>,sep:string=""){
  return this.map(arr => arr.join(sep));
};

//@ts-ignore
_.concat = function <T,U extends ParserLike<unknown>>(this:Parser<T>,x:U) {
  return seq(this,x).map(([l,r])=>{
    return Array.isArray(l) ? l.concat(r) : [l].concat(r as any);
  })
};

_.plus = _.concat;

_.flatDeep = function <T>(this:Parser<T>) {
  return this.map(v=>{
    return Array.isArray(v) ? v.flat(Infinity) : v;
  })
}

_.flat = function <T>(this:Parser<T>) {
  return this.map(v=>{
    return Array.isArray(v) ? v.flat() : v;
  })
}

_.pick1 = function<T extends object|any[],I extends number|string|symbol>
  (this:Parser<T>,key:I){
  // @ts-ignore
  return this.map(arr => arr[key]);
};


_.sepBy = function<T>(this:Parser<T>,sepLike:ParserLike){
  return alt(this.sepBy1(sepLike),ok<T[]>([]));
}

_.sepBy1 = function<T>(this:Parser<T>,sepLike:ParserLike){
  const sep = toParser(sepLike);
  //@ts-ignore
  const pairs = seqToMono(sep,[this]).many();
  return seq(this, pairs)
    .map(([first,rest])=> [first,...rest]);
}

_.many = function<T>(this:Parser<T>) {
  const parser = this;

  return makeParser((input, i, ok) =>{
    let accum:T[] = [];
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
        accum = [...accum,result.value];
      } else {
        return ok( lastIndex, accum);
      }
    }
  });
};

_.chain = function<T,U>(this:Parser<T>,func:(v:T)=>Parser<U>){
  return makeParser((input, i) =>{
    const result = this.parse(input, i);
    if(isFail(result)) return result;
    return func(result.value).parse(input,result.index);
  });
}

_.assert = function<T>(this:Parser<T>,checkFn:(v:T)=>boolean, desc="") {
  return this.chain(value=>checkFn(value) ? ok(value) : fail(desc))
}

_.not = function<T>(this:Parser<T>,notParser:ParserLike,desc=""){
  const _notParser = toParser(notParser);
  return makeParser((input, i,_,fail) =>{
    const notReply = _notParser.parse(input, i);
    if (isOk(notReply)){
      return fail(i, desc);
    } 
    return this.parse(input, i);
  });
};

_.fallback = function<T,U>(this:Parser<T>,fallbackResult:U){
  return alt(this,ok(fallbackResult));
};


_.wrap = function<T>(this:Parser<T>,leftLike:ParserLike, rightLike?:ParserLike){
  const left = toParser(leftLike);
  const right = rightLike ? toParser(rightLike) : left;
  const result = seqToMono(left,[this],right);
  return result;
};

_.trim = function<T>(this:Parser<T>,leftLike?:ParserLike, rightLike?:ParserLike){
  const left = leftLike ?? /[ \n\r\t]*/m;
  const right = rightLike ?? left;
  return this.wrap(left,rightLike);
};

_.trimL = function<T>(this:Parser<T>,leftLike?:ParserLike){
  const left = leftLike ?? /[ \n\r\t]*/;
  return seqToMono(toParser(left),[this]);
};

_.trimR = function<T>(this:Parser<T>,rightLike?:ParserLike){
  const right = rightLike ?? /[ \n\r\t]*/;
  return seqToMono([this],toParser(right));
};



_.or = function<T,U extends ParserLike>(this:Parser<T>,altLike:U){
  const altParser = toParser(altLike);
  return alt(this, altParser);
};

_.times = function <T>(this:Parser<T>,c1:number,c2?:number) {
  const max = c2!==undefined ? c2 : c1;
  const min = c1;
  const self = this;
  return makeParser((input, i,ok,fail) =>{
      let pos = i;
      let currentReply = self.parse(input,pos);
      let accum:T[] = isOk(currentReply) ? [currentReply.value] : []; 
      let count = 0;
      while(count<max && isOk(currentReply)){
        currentReply = self.parse(input,currentReply.index);
        accum = isOk(currentReply) ? [...accum,currentReply.value] : accum; 
        if(isOk(currentReply)) pos = currentReply.index;
        count++;
      }
      if(count>=min) return ok(pos,accum);
      return fail(pos,isFail(currentReply) 
        ? `max:${max} min:${min} of ${currentReply.expect}` 
        : `max:${max} min:${min}`);
    });
  
};

_.atMost = function<T>(this:Parser<T>,n:number){
  return this.times(0, n);
};

_.atLeast = function<T>(this:Parser<T>,n:number){
  return seq(this.times(n), this.many())
    .map(([first,rest])=>first.concat(rest))
};

_.premap = function<T>(this:Parser<T>,fn:(input:string)=>string) {
  const self = this;
  return makeParser((input, i) =>{
    var result = self.parse(fn(input.slice(i)));
    if (isFail(result)) {
      return result;
    }
    return makeOk(i + input.length, result.value);
  });
};

_.skip = function<T>(this:Parser<T>,nextLike:ParserLike){
  const next = toParser(nextLike);
  return seqToMono([this], next);
};

_.then = function<T,U extends ParserLike>(this:Parser<T>,nextLike:U){
  const next = toParser(nextLike);
  return seqToMono(this, [next]);
};


_.mark = function<T>(this:Parser<T>):Parser<Mark<T>>{
  return seq(index, this, index)
    .map(([start, value, end]) =>({start,value,end}));
};

_.withRawText = function<T>(this:Parser<T>){
  const self = this;
  return makeParser(function(input, i,ok,fail) {
    const reply = self.parse(input, i);
    if(isFail(reply)) return reply;
    const rawText = input.slice(i,reply.index);
    const value = reply.value;
    return ok(reply.index,{value,rawText});
  });
}


_.of = function<T,U>(this:Parser<T>,value:U):Parser<U>{
  return this.map(()=> value);
};


_.node = function<T,NAME extends string>(this:Parser<T>,name:NAME):Parser<Node<T,NAME>>{
  return seq(index, this, index)
    .map(([start, value, end]) =>({start,value,end,name}));
};

_.notFollowedBy = function<T>(this:Parser<T>,notParser:ParserLike){
  const _notParser = toParser(notParser);
  const self = this;
  return makeParser(function(input, i,ok,fail) {
    const firstReply = self.parse(input, i);
    if(isFail(firstReply)) return firstReply;
    const notReply = _notParser.parse(input,firstReply.index);
    return isFail(notReply)
      ? firstReply
      : fail(i, `not followed by notParser`);
  });
}

_.followedBy = function<T>(this:Parser<T>,followParserLike:ParserLike){
  const parser = this;
  const followParser = toParser(followParserLike);
  return makeParser(function(input, i,ok,fail) {
    const firstReply = parser.parse(input, i);
    if(isFail(firstReply)) return firstReply;
    const nextReply = followParser.parse(input,firstReply.index);
    return isOk(nextReply)
      ? firstReply
      : fail(i, `followed by ${nextReply.expect}`);
  });
}

_.label = function<T,U extends string>(this:Parser<T>,name:U):readonly [U,Parser<T>]{
  return [name,this] as const;
}

  
  
  
  