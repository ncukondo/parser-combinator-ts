import  {string,makeParser,offsetToPosition,regexp} from './parser';
import  {alt,desc,pipe,seq,map} from './combinators';
    

const testChar = (testFn:(chars:string)=>boolean) => {
  return makeParser((input, i,ok,fail)=> {
    const char = input.charAt(i);
    if (i < input.length && testFn(char)) {
      return ok(i + 1, char);
    } else {
      return fail(i, "a character matching " + testFn.toString());
    }
  });
}

const rangeChar = (begin:string, end:string) => 
  pipe(
    testChar((ch) =>  begin <= ch && ch <= end),
    desc(begin + "-" + end)
  )


const oneOf = (str:string) =>{
  const expected = str.split("").map(v=>`'${v}'`);
  return pipe(
    testChar((ch)=> str.includes(ch)),
    desc("one of '" + str + "'")
  )
}

const noneOf = (str:string) => pipe(
  testChar((ch) => !str.includes(ch)),
  desc("none of '" + str + "'")
)

const index = ()=> makeParser((input, i,ok) =>{
  return ok(i, offsetToPosition(input, i));
});

const any = ()=> makeParser((input, i,ok,fail) => i >= input.length 
  ? fail(i, "any character")
  : ok(i + 1, input.charAt(i))
);

const all = ()=> makeParser((input, i,ok) => ok(input.length, input.slice(i)));

const EOF = ()=> makeParser((input, i,ok,fail) =>(i < input.length) 
  ? fail(i, "EOF")
  : ok(i, null)
);

const SOL = ()=> makeParser((input, i,ok,fail) =>{
  if (i === 0) return ok(i, null);
  if ("\n\r".includes(input.charAt(i-1))) return ok(i, null);
  return fail(i, "start of line");
});

const digits = ()=> pipe(regexp(/[1-9][0-9]*/), desc("optional digits"));
const letter = ()=> pipe(regexp(/[a-z]/i), desc("a letter"));
const letters = ()=> pipe(regexp(/[a-z]+/i), desc("letters"));
const optWhitespace = ()=> pipe(regexp(/\s*/), desc("optional whitespace"));
const digit = ()=> pipe(regexp(/[0-9]/), desc("a digit"));
const whitespace = ()=> pipe(regexp(/\s+/), desc("whitespace"));
const cr = ()=> string("\r");
const lf = ()=> string("\n");
const crlf = ()=> pipe(string("\r\n"), desc("CRLF"));
const NL = ()=> pipe(alt(crlf, lf, cr),desc("newline"));
const EOL = ()=> pipe(alt(NL, EOF), desc("end of line"));
const aLine = ()=> pipe(seq(SOL,regexp(/[^\n\r]+/),EOL),map(v=>v[1]));

export {
  EOL,SOL,EOF,digit,digits,letter,letters
  ,optWhitespace, whitespace,cr,lf,crlf,NL
  ,any,all,index,aLine
  ,rangeChar,oneOf,noneOf
}
export {string,regexp} from './parser';