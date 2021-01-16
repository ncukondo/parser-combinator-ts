
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
export type ParseResult<T> = OkResult<T> | FailResult; 
export type ParseFn<T> = (
    input:string,
    index:number,
    makeOk:<U>(index:number, value:U)=>OkResult<U>,
    makeFail:(index:number, expected:string|string[]
  )=>FailResult)=>ParseResult<T>;
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
export type Node<T,U extends string> = {
  start:Index,
  end:Index,
  name:U,
  value:T
}
export type Tree<T,U extends string,I extends string> = {
  start:Index,
  end:Index,
  name:U,
  value:Node<T,I>|Tree<T,U,I>[]|(Tree<T,U,I>|Node<T,I>)[];
}
  
const isOk = <T>(x:ParseResult<T>):x is OkResult<T> =>
  x.status;
const isFail = <T>(x:ParseResult<T>):x is FailResult =>
  !x.status;


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


type ErrorFormatter = (input:string,index:number,expected:string[])=>string;
const simpleFormatter = (input:string, index:number,expected:string[])=>{
  var {line,column} = offsetToPosition(input,index);
  return `error at [line:${line} column:${column}]\n`+
        ` -> expected: ${expected.join(', ')}`;
}
let _defaultFormatter = simpleFormatter;

class Parser<T>{
  constructor(private action:ParseFn<T>){}

  parse(input:string,index=0){
    return this.action(input,index,makeOk,makeFail);
  }

  static setDefaultErrorFormatter(formatter:ErrorFormatter){
    _defaultFormatter = formatter;
  }

  tryParse(input:string,formatter?:ErrorFormatter) {
    const _formatter = formatter || _defaultFormatter;
    const reply = this.parse(input);
    if (reply.status) {
      return reply.value;
    } else {
      const msg = _formatter(input,reply.furthest,reply.expect);
      const err = new Error(msg);
      throw err;
    }
  };
  
}

const isParser = <T>(x:unknown):x is Parser<T> =>x instanceof Parser;

const string = <T extends string>(str:T)=> {
  const expected = "'" + str + "'";
  return makeParser((input, i)=>  {
    const end = i + str.length;
    const target = input.slice(i, end);
    return target === str
      ? makeOk(end, target) as OkResult<T>
      : makeFail(i, expected)
  })
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

const ok = <T>(value:T) => makeParser((input, i)=>  makeOk(i, value));

const fail = (expected:string|string[]) =>{
  return makeParser((input, i)=>  {
    return makeFail(i, expected);
  });
}



export {Parser,regexp,string,makeOk,makeFail,makeParser,ok,
  fail,isArray,
isParser,isFail,isOk,offsetToPosition}
