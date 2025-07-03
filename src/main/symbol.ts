// Any symbols that are meant to be used as keys by the user should be defined here

/**
 * A method that will be called as a serializer preprocessor function for an object
 * when using `usePreprocessMethods()` (from the "preprocessors" export).
 * (Must be a valid `SerializerPreprocessorFunction`.)
 * @note the serializer doesn't look for this method by default; you must be using `usePreprocessMethods()`!
 */
export const preprocess: unique symbol = Symbol("preprocess");
