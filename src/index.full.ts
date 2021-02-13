import { formatError } from "./error-formatter";
import { Parser } from "./parser";
import "./parser-method";

Parser.setDefaultErrorFormatter(formatError);

export * from "./parser";
export * from "./token";
export * from "./combinators";
export * from "./operators";
