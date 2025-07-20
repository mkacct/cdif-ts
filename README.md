# cDIF for TypeScript

[![NPM Version](https://img.shields.io/npm/v/%40mkacct%2Fcdif)](https://www.npmjs.com/package/@mkacct/cdif)

This is a parser and serializer for [cDIF](https://github.com/mkacct/cdif/blob/main/spec.md), an intuitive and versatile textual data interchange format. It is written in TypeScript, so it includes type definitions. It is up to date with cDIF version 1.0.1.

To install:

```sh
npm install @mkacct/cdif
```

## Basic usage

The following examples demonstrate the most basic usage of this module. The behavior can be customized in many ways; please see the documentation for details.

### Parsing

```typescript
const cdif = new CDIF();
const cdifText: string = /* input cDIF text */;
const value: unknown = cdif.parse(cdifText); // JS value
```

### Serialization

```typescript
const cdif = new CDIF({serializer: {
    indent: "\t",
    structureEntrySeparator: ";"
}});
const value: unknown = /* input JS value */;
// For general use:
const valueText: string = cdif.serialize(value); // cDIF value text
// For file output:
const fileText: string = cdif.serializeFile(value, {
    cdifVersionString: "1.0.1"
}); // cDIF file text (includes initial "cDIF" directive)
```

## Documentation

Full documentation and API reference are coming soon!
