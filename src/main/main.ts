// The package's main export

export {default} from "./cdif.js";
export * from "./errors.js";
export {type ParserPostprocessorFunction as CDIFParserPostprocessorFunction} from "./parser/decoder.js";
export {type ParserOptions as CDIFParserOptions} from "./parser/parser.js";
export {default as CDIFPrimitiveValue} from "./primitive-value.js";
export {type SerializerPreprocessorFunction as CDIFSerializerPreprocessorFunction} from "./serializer/encoder.js";
export {type FileOptions as CDIFFileOptions} from "./serializer/file-formatter.js";
export {type SerializerOptions as CDIFSerializerOptions} from "./serializer/serializer.js";
