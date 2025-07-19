// CDIFError and its subclasses: exceptions thrown by the cDIF package

// All exports re-exported by main.ts

export class CDIFError extends Error {}
export class CDIFSyntaxError extends CDIFError {}
export class CDIFReferenceError extends CDIFError {}
export class CDIFTypeError extends CDIFError {}
export class CDIFDirectiveError extends CDIFError {}
