# cDIF for TypeScript

[![NPM Version](https://img.shields.io/npm/v/%40mkacct%2Fcdif)](https://www.npmjs.com/package/@mkacct/cdif)

This is a parser and serializer for [cDIF](https://github.com/mkacct/cdif/blob/main/spec.md), an intuitive and versatile textual data interchange format. The package is written in TypeScript, so it includes type definitions. It is up to date with cDIF version 1.0.2.

To install:

```sh
npm install @mkacct/cdif
```

## Basic usage

The following examples demonstrate the most basic usage of this library. The behavior can be customized in many ways; please see the documentation for details.

### Configuration

The `CDIF` constructor takes one argument which allows you to customize the behavior of the parser and serializer. For example, you can use the `cdifVersion` property to indicate by which major version of the cDIF specification they should abide. (If it is omitted, the latest version will be assumed.)

Check the documentation for all available [configuration options](https://github.com/mkacct/cdif-ts/wiki/Configuration).

```typescript
const cdif = new CDIF(); // defaults to latest version
const cdif1 = new CDIF({cdifVersion: 1});
```

### Parsing

`CDIF.parse()` can be used to parse any cDIF text (with or without `#` directives).

```typescript
const cdif = new CDIF();
const cdifText: string = /* input cDIF text */;
const value: unknown = cdif.parse(cdifText); // JS value
```

### Serialization

`CDIF.serialize()` returns a plain cDIF value (no `#` directives), while `CDIF.serializeFile()` allows you to add various file format elements to the output. (Check the documentation for all available [file formatter configuration options](https://github.com/mkacct/cdif-ts/wiki/Configuration-%28file-formatter%29).)

While not strictly necessary, configuration options are used in this example to enable formatted ("pretty-printed") output.

```typescript
const cdif = new CDIF({serializer: {
    indent: "\t", // or any other string (ex. "    "), or omit to output as one line
    structureEntrySeparator: ";" // or ","
}});
const value: unknown = /* input JS value */;
// For general use:
const valueText: string = cdif.serialize(value); // cDIF value text
// For file output:
const fileText: string = cdif.serializeFile(value, {
    cdifVersionString: "1.0.2"
}); // cDIF file text (includes initial "cDIF" directive)
```

## Documentation

Check the GitHub [wiki](https://github.com/mkacct/cdif-ts/wiki) for documentation, including [guides](https://github.com/mkacct/cdif-ts/wiki#guides) and [API reference](https://github.com/mkacct/cdif-ts/wiki#api-reference).
