import {seqObj,string,alt, seq,pipe,map,regexp,seqToMono} from "./parser";
import './ex-methods';

const altTest = ()=>alt("ccc",string("bbb"))
const r3= seq("aaa",altTest,/aaa/);
const r = seqObj(["label",string("aaa")] as const, ["a",/test/] as const, "bbb");
const r2 = seqToMono(string("aaa"), /test/, [string("1").map(v=>Number(v))]);



r.a
