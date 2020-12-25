import {Parser,makeParser,isFail,isArray,isOk,ok,fail,
  makeOk,Mark,Node} from './parser'
import  {seqToMono,toParser,seq
  ,ParserLike,alt} from './combinators';
import  {index} from './token';
    
declare module './parser' {
  interface Parser<T>{
    map:<U>(mapFn:(v:T)=>U)=>Parser<U>;
    tap:(tapFn:(v:T)=>any)=>Parser<T>;
    desc:(expected:string|string[]) => this;
    join:(sep?:string) => T extends string[] ? Parser<string> : never;
    pick1:<I extends keyof T>(key:I) => T extends object|any[] ?  Parser<T[I]>  : never;
    sepBy:<U>(sepLike:ParserLike<U>) => Parser<T[]>;
    sepBy1:<U>(sepLike:ParserLike<U>) => Parser<T[]>;
    many:() => Parser<T[]>;
    chain:<U>(chainFn:(v:T)=>Parser<U>) => Parser<U>;
    assert:(checkFn:(v:T)=>boolean) => this;
    not:<U>(notParser:ParserLike<U>) => Parser<T>;
    fallback:<U>(fallbackResult:U) => Parser<T|U>;
    wrap:<L,R>(leftLike:ParserLike<L>, rightLike?:ParserLike<R>)=>Parser<T>;
    trim:<L,R>(leftLike?:ParserLike<L>, rightLike?:ParserLike<R>)=>Parser<T>;
    trimL:<L>(leftLike?:ParserLike<L>)=>Parser<T>;
    trimR:<R>(rightLike?:ParserLike<R>)=>Parser<T>;
    or:<U>(altLike:ParserLike<U>)=>Parser<T|U>;
    times(min:number, max:number):Parser<T[]>; 
    times(count:number):Parser<T[]>; 
    atLeast:(count:number) =>Parser<T[]>; 
    atMost:(count:number) =>Parser<T[]>; 
    premap:(fn:(input:string)=>string)=>Parser<T>
    skip:<U>(skip:ParserLike<U>) => Parser<T>;
    then:<U>(parser:ParserLike<U>) => Parser<U>;
    mark:()=>Parser<Mark<T>>;
    of:<U>(value:U)=>Parser<U>;
    node:(nodeName:string)=>Parser<Mark<T>>;
    notFollowedBy:<U>(notParser:ParserLike<U>) => Parser<T>;
    followedBy:<U>(followParser:ParserLike<U>) => Parser<T>;
    label:<U extends string>(name:U) => readonly [U,Parser<T>];
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

_.pick1 = function<T extends object|any[],I extends number|string|symbol>
  (this:Parser<T>,key:I){
  // @ts-ignore
  return this.map(arr => arr[key]);
};


_.sepBy = function<T,U>(this:Parser<T>,sepLike:ParserLike<U>){
  return alt(this.sepBy1(sepLike),ok<T[]>([]));
}

_.sepBy1 = function<T,U>(this:Parser<T>,sepLike:ParserLike<U>){
  const sep = toParser(sepLike);
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
        return ok(i, accum);
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

_.not = function<T,U>(this:Parser<T>,notParser:ParserLike<U>,desc=""){
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


_.wrap = function<T,L,R>(this:Parser<T>,leftLike:ParserLike<L>, rightLike?:ParserLike<R>){
  const left = toParser(leftLike);
  const right = rightLike ? toParser(rightLike) : left;
  const result = seqToMono(left,[this],right);
  return result;
};

_.trim = function<T,L,R>(this:Parser<T>,leftLike?:ParserLike<L>, rightLike?:ParserLike<R>){
  const left = leftLike ?? /[ \n\r\t]*/;
  return this.wrap(left,rightLike);
};

_.trimL = function<T,L>(this:Parser<T>,leftLike?:ParserLike<L>){
  const left = leftLike ?? /[ \n\r\t]*/;
  return seqToMono(toParser(left),[this]);
};

_.trimR = function<T,R>(this:Parser<T>,rightLike?:ParserLike<R>){
  const right = rightLike ?? /[ \n\r\t]*/;
  return seqToMono([this],toParser(right));
};



_.or = function<T,U>(this:Parser<T>,altLike:ParserLike<U>){
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

_.skip = function<T,U>(this:Parser<T>,nextLike:ParserLike<U>){
  const next = toParser(nextLike);
  return seqToMono([this], next);
};

_.then = function<T,U>(this:Parser<T>,nextLike:ParserLike<U>){
  const next = toParser(nextLike);
  return seqToMono(this, [next]);
};


_.mark = function<T>(this:Parser<T>):Parser<Mark<T>>{
  return seq(index, this, index)
    .map(([start, value, end]) =>({start,value,end}));
};

_.of = function<T,U>(this:Parser<T>,value:U):Parser<U>{
  return this.map(()=> value);
};


_.node = function<T>(this:Parser<T>,name:string):Parser<Node<T>>{
  return seq(index, this, index)
    .map(([start, value, end]) =>({start,value,end,name}));
};

_.notFollowedBy = function<T,U>(this:Parser<T>,notParser:ParserLike<U>){
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

_.followedBy = function<T,U>(this:Parser<T>,followParserLike:ParserLike<U>){
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

  
  
  
  