# cDIF for TypeScript

[![NPM Version](https://img.shields.io/npm/v/%40mkacct%2Fcdif)](https://www.npmjs.com/package/@mkacct/cdif)

This is a parser and serializer for [cDIF](https://github.com/mkacct/cdif/blob/main/spec.md), an intuitive and versatile textual data interchange format. The package is written in TypeScript, so it includes type definitions. It is up to date with cDIF version 1.0.2.

To install:

```sh
npm install @mkacct/cdif
```

## Basic usage

The following examples demonstrate the most basic usage of this library. The behavior can be customized in many ways; please see the documentation for details.

### CDIF version

The `CDIF` constructor takes one optional argument, which is the major version of the cDIF specification by which it should abide. (If it is omitted, the latest version will be assumed.)

```typescript
const cdif = new CDIF(); // defaults to latest version
const cdif1 = new CDIF(1);
```

### Parsing

`CDIF.parse()` can be used to parse any cDIF text (with or without `#` directives).

An optional second argument (not shown in the example) may be supplied to configure the parser; check the documentation for all available [parser configuration options](https://github.com/mkacct/cdif-ts/wiki/Configuration%3A-Parser).

```typescript
const cdif = new CDIF();
const cdifText: string = /* input cDIF text */;
const value: unknown = cdif.parse(cdifText); // JS value
```

### Serialization

`CDIF.serialize()` returns a plain cDIF value (no `#` directives), while `CDIF.serializeFile()` allows you to add various file format elements to the output. (Check the documentation for all available [file formatter configuration options](https://github.com/mkacct/cdif-ts/wiki/Configuration%3A-File-formatter).)

While not strictly necessary, configuration options are used in this example to enable formatted ("pretty-printed") output. They are supplied as an optional second argument to both `CDIF.serialize()` and `CDIF.serializeFile()`; check the documentation for all available [serializer configuration options](https://github.com/mkacct/cdif-ts/wiki/Configuration%3A-Serializer).

```typescript
const cdif = new CDIF();
const value: unknown = /* input JS value */;
const serializerOptions: CDIFSerializerOptions = {
    indent: "\t", // or any other string (ex. "    "), or omit to output as one line
    structureEntrySeparator: ";" // or ","
};
// For general use:
const valueText: string = cdif.serialize(value, serializerOptions); // cDIF value text
// For file output:
const fileText: string = cdif.serializeFile(value, serializerOptions, {
    cdifVersionString: "1.0.2"
}); // cDIF file text (includes initial "cDIF" directive)
```

## Documentation

Check the GitHub [wiki](https://github.com/mkacct/cdif-ts/wiki) for documentation, including [guides](https://github.com/mkacct/cdif-ts/wiki#guides) and [API reference](https://github.com/mkacct/cdif-ts/wiki#api-reference).
