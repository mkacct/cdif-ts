import CDIFPrimitiveValue from "./primitive-value.js";
import CDIFStructure from "./structure.js";

/** A cDIF value, which can be either a primitive value or a structure. */
export type CDIFValue = CDIFPrimitiveValue | CDIFStructure;
